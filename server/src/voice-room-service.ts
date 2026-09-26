import {
  VOICE_LEASE_MS,
  VOICE_MAX_MEMBERS,
  validVoiceDescription,
  type VoiceRequest,
  type VoiceReply,
} from "../../shared/tableVoice";
import { RoomError } from "./room-engine";
import type { VoiceProvider, SfuReply } from "./voice-provider";

type Connection = {
  id: string;
  sessionId: string;
  mids: string[];
  ready: boolean;
};
type Member = {
  userId: string;
  clientId: string;
  until: number;
  publisher?: Connection;
  receiver?: Connection;
};
export type VoiceRoomState = {
  tableId: string;
  members: Member[];
  retired: Connection[];
};
export type VoicePersistence = {
  read(): VoiceRoomState;
  save(state: VoiceRoomState): void;
};

/** Single queue belongs to the voice DO, never the game command queue. */
export class VoiceRoomService {
  constructor(
    private storage: VoicePersistence,
    private provider: VoiceProvider,
    private now = Date.now,
  ) {}
  private retire(s: VoiceRoomState, c?: Connection) {
    if (c) s.retired.push(c);
  }
  private remove(s: VoiceRoomState, m: Member) {
    this.retire(s, m.publisher);
    this.retire(s, m.receiver);
    s.members = s.members.filter((x) => x !== m);
  }
  async sweep(allowed: Set<string>, cleanup = true) {
    const s = this.storage.read();
    for (const m of [...s.members])
      if (m.until <= this.now() || !allowed.has(m.userId)) this.remove(s, m);
    this.storage.save(s); // Hide revoked publications before provider I/O.
    if (!cleanup) return;
    await Promise.all(
      s.retired.slice(0, 4).map(async (c) => {
        try {
          await this.provider.close(c.sessionId, c.mids);
          s.retired = s.retired.filter((x) => x.id !== c.id);
        } catch {
          /* Retain identifiers for the next alarm, including partial allocations. */
        }
      }),
    );
    this.storage.save(s);
  }
  private result(s: VoiceRoomState, userId: string): VoiceReply {
    return {
      available: true,
      publications: s.members
        .filter(
          (m) =>
            m.userId !== userId && m.publisher?.ready && m.until > this.now(),
        )
        .map((m) => ({ memberId: m.userId, id: m.publisher!.id })),
    };
  }
  private remember(
    s: VoiceRoomState,
    c: Connection,
    response: SfuReply,
    operation: "publish" | "receive",
  ) {
    c.mids = [
      ...new Set([
        ...c.mids,
        ...(response.tracks ?? []).flatMap((t) => (t.mid ? [t.mid] : [])),
      ]),
    ];
    this.storage.save(s);
    if (
      response.errorCode ||
      !response.tracks?.length ||
      response.tracks.some((t) => t.errorCode) ||
      !response.sessionDescription
    ) {
      console.warn("[table-voice:sfu] track negotiation failed", {
        operation,
        providerError: !!response.errorCode,
        trackCount: response.tracks?.length ?? 0,
        failedTracks: response.tracks?.filter((t) => t.errorCode).length ?? 0,
        hasSessionDescription: !!response.sessionDescription,
      });
      throw new RoomError(503, "Could not connect table voice.");
    }
  }
  async act(userId: string, b: VoiceRequest): Promise<VoiceReply> {
    const s = this.storage.read();
    let m = s.members.find((x) => x.userId === userId);
    if (b.op === "join") {
      if (m) {
        this.remove(s, m);
        m = undefined;
      }
      if (!m) {
        if (s.members.length >= VOICE_MAX_MEMBERS)
          throw new RoomError(
            409,
            "Table voice is full. You can keep playing.",
          );
        m = {
          userId,
          clientId: b.clientId,
          until: this.now() + VOICE_LEASE_MS,
        };
        s.members.push(m);
      }
      m.until = this.now() + VOICE_LEASE_MS;
      this.storage.save(s);
      return {
        ...this.result(s, userId),
        iceServers: await this.provider.ice(),
      };
    }
    if (!m || m.clientId !== b.clientId || m.until <= this.now())
      throw new RoomError(409, "Voice session ended. Reconnect to listen.");
    m.until = this.now() + VOICE_LEASE_MS;
    this.storage.save(s);
    if (b.op === "leave") {
      this.remove(s, m);
      this.storage.save(s);
      return { available: true };
    }
    if (b.op === "status") return this.result(s, userId);
    if (b.op === "mute") {
      this.retire(s, m.publisher);
      delete m.publisher;
      this.storage.save(s);
      return this.result(s, userId);
    }
    if (b.op === "ready") {
      if (!m.publisher || m.publisher.id !== b.connectionId)
        throw new RoomError(409, "Voice connection changed.");
      m.publisher.ready = true;
      this.storage.save(s);
      return this.result(s, userId);
    }
    if (b.op === "answer") {
      if (
        !m.receiver ||
        m.receiver.id !== b.connectionId ||
        m.receiver.ready ||
        !validVoiceDescription(b.sessionDescription, "answer")
      )
        throw new RoomError(409, "Voice connection changed.");
      await this.provider.answer(m.receiver.sessionId, b.sessionDescription);
      m.receiver.ready = true;
      this.storage.save(s);
      return this.result(s, userId);
    }
    if (b.op === "publish") {
      if (
        !validVoiceDescription(b.sessionDescription, "offer") ||
        typeof b.mid !== "string" ||
        !/^[a-zA-Z0-9]{1,16}$/.test(b.mid) ||
        !b.sessionDescription.sdp.split(/\r?\n/).includes(`a=mid:${b.mid}`)
      )
        throw new RoomError(400, "Invalid audio offer.");
      this.retire(s, m.publisher);
      delete m.publisher;
      this.storage.save(s);
      const c: Connection = {
        id: crypto.randomUUID(),
        sessionId: await this.provider.create(),
        mids: [b.mid],
        ready: false,
      };
      m.publisher = c;
      this.storage.save(s);
      const response = await this.provider.tracks(
        c.sessionId,
        {
          sessionDescription: b.sessionDescription,
          tracks: [{ location: "local", mid: b.mid, trackName: "microphone" }],
        },
        "publish",
      );
      this.remember(s, c, response, "publish");
      if (response.sessionDescription!.type !== "answer")
        throw new RoomError(503, "Invalid audio answer.");
      return {
        ...this.result(s, userId),
        connectionId: c.id,
        sessionDescription: response.sessionDescription,
      };
    }
    if (b.op === "receive") {
      this.retire(s, m.receiver);
      delete m.receiver;
      this.storage.save(s);
      const publishers = s.members.filter(
        (x) =>
          x.userId !== userId && x.publisher?.ready && x.until > this.now(),
      );
      if (!publishers.length) return this.result(s, userId);
      const c: Connection = {
        id: crypto.randomUUID(),
        sessionId: await this.provider.create(),
        mids: [],
        ready: false,
      };
      m.receiver = c;
      this.storage.save(s);
      const response = await this.provider.tracks(
        c.sessionId,
        {
          tracks: publishers.map((x) => ({
            location: "remote",
            sessionId: x.publisher!.sessionId,
            trackName: "microphone",
          })),
        },
        "receive",
      );
      this.remember(s, c, response, "receive");
      if (response.sessionDescription!.type !== "offer")
        throw new RoomError(503, "Invalid audio offer.");
      return {
        ...this.result(s, userId),
        connectionId: c.id,
        sessionDescription: response.sessionDescription,
      };
    }
    throw new RoomError(400, "Invalid voice operation.");
  }
}
