import {
  requireCaptain,
  sendInvitation,
  respondInvitation,
} from "./invitations";
import { DurableObject } from "cloudflare:workers";
import { equalHex } from "./security";
import { AccessError, enforcePlayer, signAccess } from "./app-access";
import { LEGACY_API_ORIGIN } from "./release-origin";
import { listingMembers } from "./table-listings";
import type {
  OnlineProfile,
  RoomCommand,
  RoomEvent,
  RoomSnapshot,
  RoomState,
  TableConfig,
  TableCreationOptions,
} from "../../shared/online";
import { applyWalletEffects } from "./wallet";
import {
  type Change,
  advanceRoom,
  applyRoomCommand,
  createRoom,
  joinRoom,
  nextDeadline,
  RoomError,
} from "./room-engine";

type Attachment = {
  userId: string;
  expiresAt: number;
  window: number;
  count: number;
  origin?: string;
};
type Pending = {
  change: Change;
  command?: { actor: string; id: string };
  at: number;
};
type StateRow = { json: string };
export class TableRoom extends DurableObject<Env> {
  /** Read-only membership projection for the isolated voice coordinator. */
  voiceMembers() {
    return Object.values(this.load().members)
      .filter((m) => !m.removed && !m.left)
      .map((m) => m.id);
  }
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS pending_wallet (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY, json TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS commands (actor TEXT NOT NULL, id TEXT NOT NULL, seq INTEGER NOT NULL, PRIMARY KEY(actor,id));
      CREATE TABLE IF NOT EXISTS rounds (round INTEGER PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0);
    `);
  }
  initialize(
    id: string,
    name: string,
    code: string,
    invite: string,
    profile: OnlineProfile,
    config: TableConfig,
    options: TableCreationOptions = {},
  ) {
    return this.run(() =>
      this.initializeImpl(id, name, code, invite, profile, config, options),
    );
  }
  captain(userId: string) {
    return this.run(async () => {
      const state = await this.tick();
      requireCaptain(state, userId);
      return true;
    });
  }
  invitePlayer(actor: string, recipient: string) {
    return this.run(async () =>
      sendInvitation(this.env, await this.tick(), actor, recipient),
    );
  }
  respondInvite(
    user: OnlineProfile,
    id: string,
    response: "accept" | "decline",
  ) {
    return this.run(async () =>
      respondInvitation(this.env, await this.tick(), user, id, response, () =>
        this.joinImpl(user),
      ),
    );
  }
  preview(invite?: string) {
    return this.run(() => this.previewImpl(invite));
  }
  join(profile: OnlineProfile, invite?: string) {
    return this.run(() => this.joinImpl(profile, invite));
  }
  getSnapshot(userId: string) {
    return this.run(() => this.getSnapshotImpl(userId));
  }
  command(userId: string, command: RoomCommand) {
    return this.run(() => this.commandImpl(userId, command));
  }
  history(userId: string, round?: number, afterSeq = 0) {
    return this.run(() => this.historyImpl(userId, round, afterSeq));
  }
  fetch(request: Request) {
    return this.run(() => this.fetchImpl(request));
  }
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    return this.run(() => this.webSocketMessageImpl(ws, message));
  }
  webSocketClose(ws: WebSocket, code: number, reason: string) {
    return this.run(() => this.webSocketCloseImpl(ws, code, reason));
  }
  async alarm() {
    if (String(this.env.MIGRATION_PAUSED) === "true") {
      await this.ctx.storage.setAlarm(Date.now() + 30_000);
      return;
    }
    return this.run(() => this.alarmImpl());
  }
  revalidateAccess() {
    return this.run(async () => {
      await this.validateSockets(true);
      await this.schedule(this.load());
    });
  }
  private accessChecked = new Map<string, number>();
  private async validateSockets(force = false) {
    const sockets = this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === 1);
    const users = new Set(
      sockets
        .map((ws) => (ws.deserializeAttachment() as Attachment | null)?.userId)
        .filter((id): id is string => !!id),
    );
    for (const id of users) {
      if (!force && (this.accessChecked.get(id) ?? 0) > Date.now() - 25_000)
        continue;
      try {
        await enforcePlayer(this.env, id);
        this.accessChecked.set(id, Date.now());
      } catch (error) {
        this.accessChecked.delete(id);
        for (const ws of sockets.filter(
          (w) => (w.deserializeAttachment() as Attachment)?.userId === id,
        )) {
          if (error instanceof AccessError && error.access)
            ws.send(
              JSON.stringify({
                type: "access",
                access: await signAccess(
                  this.env,
                  JSON.parse(error.access.payload),
                  (ws.deserializeAttachment() as Attachment).origin ??
                    LEGACY_API_ORIGIN,
                ),
              }),
            );
          ws.close(1008, "App access check required");
        }
      }
    }
    for (const id of this.accessChecked.keys())
      if (!users.has(id)) this.accessChecked.delete(id);
  }
  private serial: Promise<unknown> = Promise.resolve();
  private run<T>(operation: () => Promise<T>): Promise<T> {
    if (String(this.env.MIGRATION_PAUSED) === "true")
      return Promise.reject(
        new RoomError(
          503,
          "Temporarily unavailable. Please reconnect shortly.",
        ),
      );
    const next = this.serial.then(async () => {
      await this.recoverWallet();
      return operation();
    });
    this.serial = next.catch(() => undefined);
    return next;
  }
  private async recoverWallet() {
    const row = this.ctx.storage.sql
      .exec<StateRow>("SELECT json FROM pending_wallet WHERE id=1")
      .toArray()[0];
    if (!row) return;
    const pending = JSON.parse(row.json) as Pending;
    try {
      await applyWalletEffects(
        this.env.DB,
        pending.change.walletEffects ?? [],
        pending.at,
      );
    } catch (error) {
      if (String(error).includes("Insufficient coins")) {
        this.ctx.storage.sql.exec("DELETE FROM pending_wallet WHERE id=1");
        throw new RoomError(
          402,
          "Not enough coins. Get test coins or watch this round.",
        );
      }
      await this.ctx.storage.setAlarm(Date.now() + 3000);
      throw new RoomError(
        503,
        "Saving coin transaction. Reconnecting will safely finish it.",
      );
    }
    this.commit(pending.change, pending.command);
  }
  private async persist(
    change: Change,
    command?: { actor: string; id: string },
  ) {
    if (!change.walletEffects?.length) {
      this.commit(change, command);
      return;
    }
    // Write the intent before D1: after any crash, replay the same idempotent ledger
    // effects and publish precisely the corresponding room state, never a new charge.
    this.ctx.storage.sql.exec(
      "INSERT INTO pending_wallet(id,json) VALUES(1,?)",
      JSON.stringify({ change, command, at: Date.now() } satisfies Pending),
    );
    await this.ctx.storage.setAlarm(Date.now() + 3000);
    await this.recoverWallet();
  }
  private load(): RoomState {
    const row = this.ctx.storage.sql
      .exec<StateRow>("SELECT json FROM room WHERE id=1")
      .toArray()[0];
    if (!row) throw new RoomError(404, "Table not found.");
    return JSON.parse(row.json) as RoomState;
  }
  private commit(
    change: { state: RoomState; events: RoomEvent[] },
    command?: { actor: string; id: string },
  ) {
    this.ctx.storage.transactionSync(() => {
      const previous = this.ctx.storage.sql
        .exec<StateRow>("SELECT json FROM room WHERE id=1")
        .toArray()[0];
      if (previous) {
        const before = JSON.parse(previous.json) as RoomState;
        if (before.round !== change.state.round)
          this.ctx.storage.sql.exec(
            "INSERT INTO rounds(round,seq,json) VALUES(?,?,?) ON CONFLICT(round) DO UPDATE SET seq=excluded.seq,json=excluded.json,archived=0",
            before.round,
            before.seq,
            previous.json,
          );
      }
      this.ctx.storage.sql.exec(
        "INSERT INTO room(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",
        JSON.stringify(change.state),
      );
      for (const event of change.events)
        this.ctx.storage.sql.exec(
          "INSERT INTO events(seq,json) VALUES(?,?)",
          event.seq,
          JSON.stringify(event),
        );
      if (command)
        this.ctx.storage.sql.exec(
          "INSERT INTO commands(actor,id,seq) VALUES(?,?,?)",
          command.actor,
          command.id,
          change.state.seq,
        );
      if (change.state.phase === "finished")
        this.ctx.storage.sql.exec(
          "INSERT INTO rounds(round,seq,json) VALUES(?,?,?) ON CONFLICT(round) DO UPDATE SET seq=excluded.seq,json=excluded.json,archived=0",
          change.state.round,
          change.state.seq,
          JSON.stringify(change.state),
        );
      this.ctx.storage.sql.exec("DELETE FROM pending_wallet WHERE id=1");
    });
  }
  private async tick(now = Date.now()): Promise<RoomState> {
    const change = advanceRoom(this.load(), now);
    if (change.events.length) await this.persist(change);
    return change.state;
  }
  private snapshot(s: RoomState, userId: string): RoomSnapshot {
    const m = s.members[userId];
    if (!m || m.removed || m.left)
      throw new RoomError(403, "You no longer have access to this table.");
    const result: RoomSnapshot = {
      ...structuredClone(s),
      serverNow: Date.now(),
      viewerId: userId,
    };
    for (const other of Object.values(result.members)) {
      if (other.id !== userId && result.phase === "lobby" && !other.ready) {
        other.panels = [];
        other.marks = {};
        other.markVersions = {};
      }
    }
    return result;
  }
  private broadcast(s: RoomState) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== 1) continue;
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (!attachment) {
        ws.close(1008, "Session missing");
        continue;
      }
      try {
        ws.send(
          JSON.stringify({
            type: "snapshot",
            snapshot: this.snapshot(s, attachment.userId),
          }),
        );
      } catch {
        ws.close(1008, "Membership ended");
      }
    }
  }
  private async schedule(_state: RoomState) {
    const s = this.load();
    const pending =
      this.ctx.storage.sql
        .exec<{ count: number }>(
          "SELECT (SELECT COUNT(*) FROM events WHERE archived=0) + (SELECT COUNT(*) FROM rounds WHERE archived=0) AS count",
        )
        .one().count > 0;
    const deadline = nextDeadline(s, Date.now());
    const workDue = pending
      ? Math.min(deadline ?? Infinity, Date.now() + 10_000)
      : deadline;
    const due = this.ctx.getWebSockets().some((ws) => ws.readyState === 1)
      ? Math.min(workDue ?? Infinity, Date.now() + 30_000)
      : workDue;
    if (due !== null) await this.ctx.storage.setAlarm(due);
    else await this.ctx.storage.deleteAlarm();
  }
  private async after(s: RoomState) {
    await this.validateSockets();
    this.broadcast(s);
    await this.schedule(s);
    this.ctx.waitUntil(
      this.archive().catch(() =>
        console.error(
          JSON.stringify({ event: "table_archive_retry", tableId: s.id }),
        ),
      ),
    );
  }
  private async archive() {
    const s = this.load();
    const rows = this.ctx.storage.sql
      .exec<{ seq: number; json: string }>(
        "SELECT seq,json FROM events WHERE archived=0 ORDER BY seq LIMIT 50",
      )
      .toArray();
    const rounds = this.ctx.storage.sql
      .exec<{ round: number; seq: number; json: string }>(
        "SELECT round,seq,json FROM rounds WHERE archived=0 LIMIT 5",
      )
      .toArray();
    const statements = [
      this.env.DB.prepare(
        "UPDATE online_tables SET name=?,owner_id=?,round=?,phase=?,seq=?,updated_at=?,listing=? WHERE id=? AND seq<=?",
      ).bind(
        s.name,
        s.ownerId,
        s.round,
        s.phase,
        s.seq,
        Date.now(),
        JSON.stringify(listingMembers(s)),
        s.id,
        s.seq,
      ),
    ];
    for (const m of Object.values(s.members))
      statements.push(
        this.env.DB.prepare(
          "INSERT INTO online_memberships(table_id,player_id,removed,seq) VALUES(?,?,?,?) ON CONFLICT(table_id,player_id) DO UPDATE SET removed=excluded.removed,seq=excluded.seq WHERE excluded.seq>=online_memberships.seq",
        ).bind(s.id, m.id, m.removed ? 1 : 0, s.seq),
      );
    for (const row of rows) {
      const e = JSON.parse(row.json) as RoomEvent;
      statements.push(
        this.env.DB.prepare(
          "INSERT OR IGNORE INTO online_events(table_id,seq,round,at,actor,type,data) VALUES(?,?,?,?,?,?,?)",
        ).bind(
          s.id,
          e.seq,
          e.round,
          e.at,
          e.actor,
          e.type,
          JSON.stringify(e.data),
        ),
      );
    }
    for (const r of rounds) {
      const archive = JSON.parse(r.json) as RoomState;
      for (const m of Object.values(archive.members)) m.mobile = "";
      statements.push(
        this.env.DB.prepare(
          "INSERT INTO online_rounds(table_id,round,seq,state) VALUES(?,?,?,?) ON CONFLICT(table_id,round) DO UPDATE SET seq=excluded.seq,state=excluded.state WHERE excluded.seq>=online_rounds.seq",
        ).bind(s.id, r.round, r.seq, JSON.stringify(archive)),
      );
    }
    await this.env.DB.batch(statements);
    this.ctx.storage.transactionSync(() => {
      for (const row of rows)
        this.ctx.storage.sql.exec(
          "UPDATE events SET archived=1 WHERE seq=?",
          row.seq,
        );
      for (const r of rounds)
        this.ctx.storage.sql.exec(
          "UPDATE rounds SET archived=1 WHERE round=? AND seq=?",
          r.round,
          r.seq,
        );
    });
  }
  private async initializeImpl(
    id: string,
    name: string,
    code: string,
    invite: string,
    profile: OnlineProfile,
    config: TableConfig,
    options: TableCreationOptions,
  ) {
    if (this.ctx.storage.sql.exec("SELECT id FROM room").toArray().length)
      return this.snapshot(this.load(), profile.id);
    const change = createRoom(
      id,
      name,
      code,
      invite,
      profile,
      config,
      Date.now(),
      options,
    );
    await this.persist(change);
    await this.after(change.state);
    return this.snapshot(change.state, profile.id);
  }
  private async previewImpl(invite?: string) {
    const s = await this.tick();
    await this.after(s);
    if (invite !== undefined && !equalHex(invite, s.invite))
      throw new RoomError(
        403,
        "This invite has been revoked. Ask for a new one.",
      );
    const members = Object.values(s.members).filter(
      (m) => !m.removed && !m.left,
    );
    const players = members.filter((m) => !m.spectator),
      host = s.members[s.hostId];
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      tableAvatarId: s.tableAvatarId ?? 0,
      tableAvatarPhoto: s.tableAvatarPhoto,
      host: host?.name ?? "Captain",
      hostAvatarId: host?.avatarId,
      hostAvatarPhoto: host?.avatarPhoto,
      config: s.config,
      phase: s.phase,
      count: members.length,
      playerCount: players.length,
      watchingCount: members.length - players.length,
      players: members
        .filter((m) => m.id !== s.hostId)
        .slice(0, 4)
        .map((m) => ({
          name: m.name,
          avatarId: m.avatarId,
          avatarPhoto: m.avatarPhoto,
        })),
    };
  }
  private async joinImpl(profile: OnlineProfile, invite?: string) {
    const s = await this.tick();
    if (invite !== undefined && !equalHex(invite, s.invite))
      throw new RoomError(
        403,
        "This invite has been revoked. Ask for a new one.",
      );
    const change = joinRoom(s, profile, Date.now());
    await this.persist(change);
    await this.after(change.state);
    return this.snapshot(change.state, profile.id);
  }
  private async getSnapshotImpl(userId: string) {
    const s = await this.tick();
    await this.after(s);
    return this.snapshot(s, userId);
  }
  private async commandImpl(userId: string, command: RoomCommand) {
    const s = await this.tick();
    this.snapshot(s, userId);
    const previous = this.ctx.storage.sql
      .exec(
        "SELECT seq FROM commands WHERE actor=? AND id=?",
        userId,
        command.id,
      )
      .toArray();
    if (previous.length) {
      await this.after(s);
      return this.snapshot(s, userId);
    }
    try {
      const change = applyRoomCommand(s, userId, command, Date.now());
      await this.persist(change, { actor: userId, id: command.id });
      await this.after(change.state);
      return command.type === "LEAVE"
        ? null
        : this.snapshot(change.state, userId);
    } catch (error) {
      if (
        !this.ctx.storage.sql.exec("SELECT id FROM pending_wallet").toArray()
          .length
      )
        await this.after(s);
      throw error;
    }
  }
  private async historyImpl(userId: string, round?: number, afterSeq = 0) {
    const s = await this.tick();
    this.snapshot(s, userId);
    await this.after(s);
    const selected = round === undefined ? s.round : round;
    const state =
      selected === s.round
        ? s
        : (JSON.parse(
            this.ctx.storage.sql
              .exec<StateRow>("SELECT json FROM rounds WHERE round=?", selected)
              .toArray()[0]?.json ?? "null",
          ) as RoomState | null);
    if (!state) throw new RoomError(404, "Round not found.");
    const events = this.ctx.storage.sql
      .exec<StateRow>(
        "SELECT json FROM events WHERE seq>? ORDER BY seq LIMIT 250",
        afterSeq,
      )
      .toArray()
      .map((row) => JSON.parse(row.json) as RoomEvent);
    for (const event of events)
      if (event.type === "STRIP_GENERATED" && event.actor !== userId)
        delete event.data.panels;
    const safeState =
      selected === s.round
        ? this.snapshot(state, userId)
        : structuredClone(state);
    for (const m of Object.values(safeState.members)) {
      m.mobile = "";
      if (safeState.phase === "lobby" && m.id !== userId && !m.ready) {
        m.panels = [];
        m.marks = {};
        m.markVersions = {};
      }
    }
    return {
      round: selected,
      state: safeState,
      events: events.filter((e) => e.round === selected),
      nextSeq: events.at(-1)?.seq ?? afterSeq,
      hasMore: events.length === 250,
      rounds: this.ctx.storage.sql
        .exec<{ round: number }>("SELECT round FROM rounds ORDER BY round DESC")
        .toArray()
        .map((r) => r.round),
    };
  }
  private async fetchImpl(request: Request): Promise<Response> {
    const userId = request.headers.get("X-Player-Id");
    if (
      !userId ||
      request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
    )
      return new Response("WebSocket required", { status: 400 });
    await enforcePlayer(this.env, userId);
    const s = await this.tick();
    this.snapshot(s, userId);
    if (this.ctx.getWebSockets(userId).length >= 3)
      return new Response("Too many connections", { status: 429 });
    const pair = new WebSocketPair(),
      [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server!, [userId]);
    server!.serializeAttachment({
      userId,
      expiresAt: Date.now() + 12 * 3600_000,
      window: Date.now(),
      count: 0,
      origin: new URL(request.url).origin,
    } satisfies Attachment);
    s.members[userId]!.onlineUntil = Date.now() + 30_000;
    this.commit({ state: s, events: [] });
    server!.send(
      JSON.stringify({ type: "snapshot", snapshot: this.snapshot(s, userId) }),
    );
    await this.after(s);
    return new Response(null, { status: 101, webSocket: client });
  }
  private async webSocketMessageImpl(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ) {
    const auth = ws.deserializeAttachment() as Attachment | null;
    if (!auth || auth.expiresAt <= Date.now()) {
      ws.close(1008, "Reconnect to refresh your session");
      return;
    }
    await this.validateSockets();
    if (ws.readyState !== 1) return;
    if (typeof message !== "string" || message.length > 4096) {
      ws.close(1009, "Message too large");
      return;
    }
    if (Date.now() - auth.window > 60_000) {
      auth.window = Date.now();
      auth.count = 0;
    }
    if (++auth.count > 240) {
      ws.close(1008, "Too many messages");
      return;
    }
    ws.serializeAttachment(auth);
    try {
      const body = JSON.parse(message) as Record<string, unknown>;
      if (body.type !== "ping")
        throw new RoomError(400, "Use the authenticated command endpoint.");
      const s = await this.tick();
      this.snapshot(s, auth.userId);
      s.members[auth.userId]!.onlineUntil = Date.now() + 30_000;
      this.commit({ state: s, events: [] });
      ws.send(JSON.stringify({ type: "pong", serverNow: Date.now() }));
      await this.after(s);
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          message:
            error instanceof RoomError
              ? error.message
              : "Could not process message",
        }),
      );
    }
  }
  private async webSocketCloseImpl(
    ws: WebSocket,
    code: number,
    reason: string,
  ) {
    // 1005/1006 are local sentinel codes and cannot be sent in a close frame.
    if (ws.readyState < 2)
      ws.close(code === 1005 || code === 1006 ? 1000 : code, reason);
    const auth = ws.deserializeAttachment() as Attachment | null;
    if (!auth) return;
    const s = this.load();
    if (
      s.members[auth.userId] &&
      !this.ctx
        .getWebSockets(auth.userId)
        .some((other) => other !== ws && other.readyState === 1)
    ) {
      s.members[auth.userId]!.onlineUntil = Date.now() + 15_000;
      this.commit({ state: s, events: [] });
      await this.after(s);
    }
  }
  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws, 1011, "Connection interrupted");
  }
  private async alarmImpl() {
    const s = await this.tick();
    await this.after(s);
  }
}
