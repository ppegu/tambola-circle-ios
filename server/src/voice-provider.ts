import type { VoiceDescription, VoiceIceServer } from "../../shared/tableVoice";
import { RoomError } from "./room-engine";

export type SfuTrack = {
  mid?: string;
  trackName?: string;
  sessionId?: string;
  errorCode?: string;
  status?: string;
};
export type SfuReply = {
  sessionId?: string;
  sessionDescription?: VoiceDescription;
  tracks?: SfuTrack[];
  errorCode?: string;
  requiresImmediateRenegotiation?: boolean;
};
export interface VoiceProvider {
  create(): Promise<string>;
  tracks(
    sessionId: string,
    body: object,
    operation?: string,
  ): Promise<SfuReply>;
  answer(
    sessionId: string,
    sessionDescription: VoiceDescription,
  ): Promise<void>;
  close(sessionId: string, mids: string[]): Promise<void>;
  ice(): Promise<VoiceIceServer[]>;
}

/** Provider secrets never leave the Worker. Responses and requests are bounded. */
export function cloudflareVoice(env: {
  SFU_APP_ID: string;
  SFU_APP_SECRET: string;
  TURN_KEY_ID: string;
  TURN_API_TOKEN: string;
}): VoiceProvider {
  async function call<T>(
    stage: string,
    url: string,
    token: string,
    method: string,
    body?: object,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        signal: AbortSignal.timeout(7000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      console.error("[table-voice:sfu] request failed", {
        stage,
        errorName: error instanceof Error ? error.name : typeof error,
      });
      throw error;
    }
    if (method === "GET" && response.status === 404) {
      await response.body?.cancel();
      return { tracks: [] } as T;
    }
    if (!response.ok) {
      await response.body?.cancel();
      console.warn("[table-voice:sfu] provider rejected request", {
        stage,
        status: response.status,
      });
      throw new RoomError(503, "Table voice is reconnecting.");
    }
    const reader = response.body?.getReader();
    if (!reader) {
      console.warn("[table-voice:sfu] provider response has no body", {
        stage,
      });
      throw new RoomError(503, "Table voice unavailable.");
    }
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > 128_000) {
          await reader.cancel();
          console.warn("[table-voice:sfu] provider response exceeded limit", {
            stage,
          });
          throw new RoomError(503, "Invalid voice response.");
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes)) as T;
    } catch {
      console.warn("[table-voice:sfu] provider returned invalid JSON", {
        stage,
      });
      throw new RoomError(503, "Invalid voice response.");
    }
  }
  const base = `https://rtc.live.cloudflare.com/v1/apps/${encodeURIComponent(env.SFU_APP_ID)}/sessions`;
  const sfu = (
    id: string,
    path: string,
    method: string,
    body?: object,
    stage = "sfu-request",
  ) =>
    call<SfuReply>(
      stage,
      `${base}/${encodeURIComponent(id)}${path}`,
      env.SFU_APP_SECRET,
      method,
      body,
    );
  return {
    async create() {
      const result = await call<SfuReply>(
        "create-session",
        `${base}/new`,
        env.SFU_APP_SECRET,
        "POST",
      );
      if (!result.sessionId || result.errorCode) {
        console.warn("[table-voice:sfu] session creation response invalid", {
          providerError: !!result.errorCode,
          hasSessionId: !!result.sessionId,
        });
        throw new RoomError(503, "Could not start table voice.");
      }
      return result.sessionId;
    },
    tracks: (id, body, operation) =>
      sfu(id, "/tracks/new", "POST", body, operation ?? "tracks-negotiation"),
    async answer(id, sessionDescription) {
      const result = await sfu(
        id,
        "/renegotiate",
        "PUT",
        {
          sessionDescription,
        },
        "answer-renegotiation",
      );
      if (result.errorCode) {
        console.warn("[table-voice:sfu] answer negotiation rejected", {
          providerError: true,
        });
        throw new RoomError(503, "Could not connect table voice.");
      }
    },
    async close(id, mids) {
      // Discover allocations even if tracks/new timed out before returning its mids.
      const session = await call<SfuReply>(
        "cleanup-discovery",
        `${base}/${encodeURIComponent(id)}`,
        env.SFU_APP_SECRET,
        "GET",
      );
      if (session.errorCode || !Array.isArray(session.tracks))
        throw new RoomError(503, "Voice cleanup will retry.");
      const active = (session.tracks ?? [])
        .filter((t) => t.status !== "inactive" && t.mid)
        .map((t) => t.mid!);
      if (!active.length) return;
      const result = await call<SfuReply>(
        "cleanup-tracks",
        `${base}/${encodeURIComponent(id)}/tracks/close`,
        env.SFU_APP_SECRET,
        "PUT",
        {
          force: true,
          tracks: active.map((mid) => ({ mid })),
        },
      );
      if (result.errorCode || result.tracks?.some((t) => t.errorCode))
        throw new RoomError(503, "Voice cleanup will retry.");
    },
    async ice() {
      const result = await call<unknown>(
        "ice-credentials",
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate`,
        env.TURN_API_TOKEN,
        "POST",
        { ttl: 3600 },
      );
      const response =
        result && typeof result === "object" && !Array.isArray(result)
          ? (result as {
              iceServers?: VoiceIceServer | VoiceIceServer[];
            })
          : undefined;
      const rawIceServers = response?.iceServers;
      const iceServers = Array.isArray(rawIceServers)
        ? rawIceServers
        : rawIceServers && typeof rawIceServers === "object"
          ? [rawIceServers]
          : [];
      const validIceServers = iceServers.every((server) => {
        if (!server || typeof server !== "object") return false;
        const urls = server.urls;
        return typeof urls === "string"
          ? urls.length > 0
          : Array.isArray(urls) &&
              urls.length > 0 &&
              urls.every((url) => typeof url === "string" && url.length > 0);
      });
      if (!iceServers.length || !validIceServers) {
        console.warn("[table-voice:sfu] ICE credentials response invalid", {
          hasIceServers: rawIceServers !== undefined,
          serverCount: iceServers.length,
          responseKeys: response ? Object.keys(response) : [],
        });
        throw new RoomError(503, "Voice relay unavailable.");
      }
      return iceServers;
    },
  };
}
