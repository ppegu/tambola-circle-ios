import { DurableObject } from "cloudflare:workers";
import type { VoiceRequest, VoiceReply } from "../../shared/tableVoice";
import { cloudflareVoice } from "./voice-provider";
import { VoiceRoomService, type VoiceRoomState } from "./voice-room-service";
import { RoomError } from "./room-engine";
import { enforcePlayer } from "./app-access";

/** Separate from TableRoom: provider latency never holds the game command queue. */
export class VoiceRoom extends DurableObject<Env> {
  private serial: Promise<unknown> = Promise.resolve();
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS voice_state(id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)",
    );
  }
  private read(): VoiceRoomState {
    return JSON.parse(
      this.ctx.storage.sql
        .exec<{ json: string }>("SELECT json FROM voice_state WHERE id=1")
        .toArray()[0]?.json ?? '{"tableId":"","members":[],"retired":[]}',
    ) as VoiceRoomState;
  }
  private save(s: VoiceRoomState) {
    this.ctx.storage.sql.exec(
      "INSERT INTO voice_state(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",
      JSON.stringify(s),
    );
  }
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const work = this.serial.then(fn);
    this.serial = work.catch(() => {});
    return work;
  }
  private available() {
    return (
      String(this.env.VOICE_ENABLED) === "true" &&
      !!this.env.SFU_APP_ID &&
      !!this.env.SFU_APP_SECRET &&
      !!this.env.TURN_KEY_ID &&
      !!this.env.TURN_API_TOKEN
    );
  }
  private service() {
    return new VoiceRoomService(
      { read: () => this.read(), save: (s) => this.save(s) },
      cloudflareVoice(this.env),
    );
  }
  private async members(tableId: string) {
    return new Set(await this.env.TABLES.getByName(tableId).voiceMembers());
  }
  async act(
    tableId: string,
    userId: string,
    body: VoiceRequest,
  ): Promise<VoiceReply> {
    return this.run(async () => {
      const allowed = await this.members(tableId);
      if (!allowed.has(userId))
        throw new RoomError(403, "You no longer have access to this table.");
      if (!this.available()) return { available: false };
      const state = this.read();
      if (state.tableId && state.tableId !== tableId)
        throw new RoomError(403, "Wrong voice room.");
      state.tableId = tableId;
      this.save(state);
      const service = this.service();
      await service.sweep(allowed, false);
      if (this.read().retired.length >= 64)
        throw new RoomError(503, "Table voice is reconnecting.");
      // Set cleanup alarm before external I/O so failed setup is still reclaimed.
      if ((await this.ctx.storage.getAlarm()) === null)
        await this.ctx.storage.setAlarm(Date.now() + 15_000);
      return service.act(userId, body);
    });
  }
  async alarm() {
    return this.run(async () => {
      const state = this.read();
      if (!state.tableId) return;
      try {
        const allowed = this.available()
          ? await this.members(state.tableId)
          : new Set<string>();
        await Promise.all(
          state.members.map(async (m) => {
            try {
              await enforcePlayer(this.env, m.userId);
            } catch {
              allowed.delete(m.userId);
            }
          }),
        );
        await this.service().sweep(allowed);
      } finally {
        const next = this.read();
        if (next.members.length || next.retired.length)
          await this.ctx.storage.setAlarm(Date.now() + 15_000);
      }
    });
  }
}
