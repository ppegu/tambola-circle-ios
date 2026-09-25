import { isAvatarPhoto } from '../../shared/avatarPhoto';
import { isTableAvatarId } from '../../shared/tableAvatars';
import { cellKey, DEFAULT_TABLE_CONFIG, ticketCost, validConfig, validTableCreationOptions, type TableCreationOptions, type Member, type OnlineProfile, type RoomCommand, type RoomEvent, type RoomState, type TableConfig, type WalletEffect } from '../../shared/online';
import { generateStrip, secureInt, type RandomInt } from '../../shared/tickets';
import { numberCallDelayMs } from '../../shared/voiceTiming';
export class RoomError extends Error { constructor(public status: number, message: string) { super(message); this.name = `RoomError${status}`; } }
function check(value: unknown, message: string, status = 409): asserts value { if (!value) throw new RoomError(status, message); }
export type Change = { state: RoomState; events: RoomEvent[]; walletEffects?: WalletEffect[] };
function edit(input: RoomState, now: number, actor = 'server') {
  const state = structuredClone(input), events: RoomEvent[] = [], walletEffects: WalletEffect[] = [];
  const emit = (type: string, data: Record<string, unknown> = {}) => events.push({ seq: ++state.seq, round: state.round, at: now, actor, type, data });
  return { state, events, walletEffects, emit };
}
type Editor = ReturnType<typeof edit>;
function reserveSeat(e: Editor, m: Member, reservationId: string) {
  if (m.ready && m.coinHold) return;
  check(Object.values(e.state.members).filter(x => x.ready && !x.left && !x.removed).length < 12, 'All playing seats are taken.');
  m.coinHold = e.state.roundId + ':' + m.id + ':' + reservationId;
  m.entryCoins = ticketCost(e.state.config, m.kind); m.paid = false; m.spectator = false; m.ready = true;
  coins(e, m, 'reserve');
  e.emit('READY_CHANGED', { memberId: m.id, ready: true, entryCoins: m.entryCoins });
}
const connected = (m: Member | undefined, now: number) => !!m && !m.removed && !m.left && m.onlineUntil > now;
function member(p: OnlineProfile, now: number): Member { return { id: p.id, name: p.name, avatarId: p.avatarId, avatarPhoto: p.avatarPhoto, mobile: p.mobile, joinedAt: now, onlineUntil: now + 30000, removed: false, left: false, ready: false, deadline: 0, spectator: false, kind: 'half', panels: [], selected: false, stripVersion: 0, marks: {}, markVersions: {} }; }
function coins(e: Editor, m: Member, type: WalletEffect['type']) {
  if (!m.coinHold) return;
  e.walletEffects.push({ type, id: m.coinHold, playerId: m.id, tableId: e.state.id, roundId: e.state.roundId, amount: m.entryCoins! });
  if (type === 'consume') m.paid = true;
  if (type === 'release' || type === 'refund') { delete m.coinHold; delete m.entryCoins; m.paid = false; m.ready = false; }
}
export function createRoom(id: string, name: string, code: string, invite: string, profile: OnlineProfile, config: TableConfig, now: number, options: TableCreationOptions = {}): Change {
  check(name.trim().length >= 2 && name.trim().length <= 50, 'Use a table name of 2–50 characters.', 400); check(validConfig(config), 'Invalid table settings.', 400);
  check(validTableCreationOptions(options), 'Invalid table start options.', 400);
  const settings = { ...DEFAULT_TABLE_CONFIG, ...config }, host = member(profile, now); host.spectator = !options.hostPlaying;
  const state: RoomState = { id, tableAvatarId: options.tableAvatarId ?? 0, tableAvatarPhoto: options.tableAvatarPhoto, name: name.trim(), code, invite, ownerId: profile.id, hostId: profile.id, coHostId: null, authorityEpoch: 1, config: settings, nextConfig: { ...settings }, phase: 'lobby', round: 1, roundId: id + ':1', members: { [profile.id]: host }, roster: [], calls: [], nextCallAt: null, lastCallAt: null, claim: null, result: null, seq: 0, createdAt: now, scheduledAt: null };
  const e = edit(state, now, profile.id); e.emit('TABLE_CREATED', { name: state.name, tableAvatarId: state.tableAvatarId, config: settings, hostPlaying: !!options.hostPlaying });
  if (options.startInSeconds !== undefined) { e.state.scheduledAt = now + options.startInSeconds * 1000; e.emit('START_SCHEDULED', { at: e.state.scheduledAt }); }
  return e;
}
export function joinRoom(input: RoomState, profile: OnlineProfile, now: number): Change {
  const e = edit(input, now, profile.id), s = e.state, old = s.members[profile.id]; check(!old?.removed, 'You were removed from this table.', 403);
  if (old) { old.avatarId = profile.avatarId; old.avatarPhoto = profile.avatarPhoto; old.left = false; old.onlineUntil = now + 30000; e.emit('MEMBER_REJOINED', { memberId: profile.id }); }
  else { check(Object.values(s.members).filter(m => !m.removed && !m.left).length < 24, 'This table is full.'); const m = member(profile, now); m.spectator = s.phase !== 'lobby'; s.members[m.id] = m; e.emit('MEMBER_JOINED', { memberId: m.id, name: m.name, spectator: m.spectator }); }
  return e;
}
function finish(e: Editor, now: number, winner: string | null, reason: string, refund = false) {
  const s = e.state;
  for (const m of Object.values(s.members)) if (m.coinHold && (!m.paid || refund)) coins(e, m, m.paid ? 'refund' : 'release');
  s.result = { winner, reason, at: now, ...(winner && s.claim ? { panelIndex: s.claim.panelIndex, automatic: 15 } : {}) }; s.phase = 'finished'; s.nextCallAt = null; s.scheduledAt = null; s.startsAt = null; s.pause = null; e.emit('ROUND_FINISHED', { ...s.result, refunded: refund });
}
function draw(e: Editor, now: number, random: RandomInt) {
  const s = e.state, remaining = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !s.calls.includes(n)); if (!remaining.length) { finish(e, now, null, 'numbers_exhausted'); return; }
  const number = remaining[random(remaining.length)]!; s.startsAt = null; s.calls.push(number); s.lastCallAt = now; s.nextCallAt = now + (s.calls.length === 90 ? 30000 : numberCallDelayMs(number, s.config.callSeconds)); e.emit('NUMBER_CALLED', { number, callSeq: s.calls.length, nextCallAt: s.nextCallAt });
}
function start(e: Editor, now: number, scheduled = false) {
  const s = e.state, players = Object.values(s.members).filter(m => !m.removed && !m.left && m.ready && m.selected && m.coinHold && !m.spectator);
  if (scheduled && players.length < 2) { finish(e, now, null, 'not_enough_ready_players', true); return; }
  check(players.length >= 2, 'At least two players need selected tickets and reserved coins.'); s.roster = players.map(m => m.id); s.phase = 'live'; s.scheduledAt = null; s.calls = [];
  for (const m of Object.values(s.members)) { m.spectator = !s.roster.includes(m.id); if (!m.spectator) coins(e, m, 'consume'); }
  s.pause = null; s.startsAt = now + 5000; s.nextCallAt = s.startsAt; s.lastCallAt = null;
  e.emit('ROUND_STARTED', { players: s.roster, config: s.config, scheduled, startsAt: s.startsAt });
}
function verify(e: Editor, now: number) {
  const s = e.state, c = s.claim; if (!c) return;
  const numbers = c.panel.flat().filter((n): n is number => n !== null);
  const checked = Math.min(15, Math.max(0, Math.floor((now - c.startedAt) / 200)));
  if (checked !== c.checked) { c.checked = checked; c.missing = numbers.slice(0, checked).filter(n => !c.calls.includes(n)); e.emit('VERIFICATION_PROGRESS', { claimId: c.id, checked, missing: c.missing }); }
  if (now < c.deadline) return;
  const missing = numbers.filter(n => !c.calls.includes(n)); c.missing = missing;
  if (numbers.length !== 15 || new Set(numbers).size !== 15 || numbers.some(n => !Number.isInteger(n) || n < 1 || n > 90)) { finish(e, now, null, 'verification_error', true); return; }
  if (!missing.length) { finish(e, now, c.by, 'full_house_verified'); return; }
  const claimant = s.members[c.by]!;
  claimant.disqualification = { roundId: s.roundId, panelIndex: c.panelIndex, panel: c.panel, marks: c.marks, calls: c.calls, missing, at: now };
  claimant.spectator = true; claimant.ready = false;
  s.verificationFailure = { by: c.by, panelIndex: c.panelIndex, missing, at: now }; e.emit('CLAIM_REJECTED', { claimant: c.by, claimId: c.id, missing, disqualified: true }); s.claim = null; s.phase = 'live'; s.nextCallAt = s.pause ? null : now + (s.calls.length === 90 ? 30 : s.config.callSeconds) * 1000;
}
export function advanceRoom(input: RoomState, now: number, random: RandomInt = secureInt): Change {
  const e = edit(input, now), s = e.state;
  if (s.config.halfCoins === undefined || s.config.fullCoins === undefined) {
    s.config = { ...DEFAULT_TABLE_CONFIG, ...s.config, callSeconds: Math.min(10, Math.max(3, s.config.callSeconds)) };
    s.nextConfig = { ...DEFAULT_TABLE_CONFIG, ...s.nextConfig, callSeconds: Math.min(10, Math.max(3, s.nextConfig.callSeconds)) };
    if (s.phase === 'lobby') for (const user of Object.values(s.members)) { user.deadline = 0; if (!user.coinHold) user.ready = false; }
    e.emit('TABLE_UPGRADED', { version: 3 });
  }
  if (s.hostId === s.ownerId && !connected(s.members[s.ownerId], now) && connected(s.members[s.coHostId ?? ''], now)) { s.hostId = s.coHostId!; s.authorityEpoch++; e.emit('ACTING_HOST_GRANTED', { hostId: s.hostId, authorityEpoch: s.authorityEpoch }); }
  // Safely migrate existing manual reviews to bounded server verification.
  if (s.phase === 'proof' || s.phase === 'host' || (s.phase === 'claim' && s.claim?.checked === undefined)) { if (s.claim) { s.phase = 'claim'; s.claim.startedAt = now; s.claim.deadline = now + 3000; s.claim.checked = 0; e.emit('AUTOMATIC_VERIFICATION_STARTED'); } else finish(e, now, null, 'verification_error', true); }
  if (s.phase === 'lobby' && s.scheduledAt && now >= s.scheduledAt) start(e, now, true);
  else if (s.phase === 'live' && !s.pause && s.nextCallAt !== null && now >= s.nextCallAt) draw(e, now, random);
  else if (s.phase === 'claim') verify(e, now);
  return e;
}
export function applyRoomCommand(input: RoomState, actor: string, command: RoomCommand, now: number, random: RandomInt = secureInt): Change {
  const e = edit(input, now, actor), s = e.state, p = command.payload, m = s.members[actor]; check(m && !m.removed && !m.left, 'Table membership required.', 403);
  // Two members can return from the same result screen concurrently.
  if (command.type === 'NEXT_ROUND' && s.phase === 'lobby' && command.roundId === `${s.id}:${s.round - 1}`) return e;
  check(command.roundId === s.roundId, 'The round changed. Refresh your table.');
  const host = () => check(s.hostId === actor && command.authorityEpoch === s.authorityEpoch, 'Captain authority changed. Refresh the table.', 403);
  const owner = () => check(s.ownerId === actor && command.authorityEpoch === s.authorityEpoch, 'Only the table owner can do that.', 403);
  const target = () => { check(typeof p.memberId === 'string' && connected(s.members[p.memberId], now), 'Choose a connected member.', 400); return s.members[p.memberId]!; };
  const lobby = () => check(s.phase === 'lobby', 'This action is available before the round starts.');
  switch (command.type) {
    case 'SELECT': lobby(); check(!m.ready, 'Become unready before changing tickets.'); check(p.kind === 'half' || p.kind === 'full', 'Choose Half or Full.', 400); m.spectator = false; m.kind = p.kind; m.panels = generateStrip(m.kind, random); m.stripVersion++; m.selected = false; m.marks = {}; m.markVersions = {}; e.emit('STRIP_GENERATED', { memberId: actor, kind: m.kind, stripVersion: m.stripVersion, panels: m.panels }); break;
    case 'CONFIRM_STRIP': lobby(); check(!m.ready && m.panels.length > 0 && p.stripVersion === m.stripVersion, 'Select the current tickets.'); m.selected = true; if (actor === s.hostId) reserveSeat(e, m, command.id); e.emit('STRIP_SELECTED', { memberId: actor, stripVersion: m.stripVersion }); break;
    case 'READY': {
      lobby(); check(typeof p.ready === 'boolean' && (!p.ready || m.selected), 'Select tickets before getting ready.', 400); if (m.ready === p.ready) break;
      if (p.ready) reserveSeat(e, m, command.id); else coins(e, m, 'release');
      m.ready = p.ready; if (!p.ready) e.emit('READY_CHANGED', { memberId: actor, ready: false, entryCoins: 0 }); break;
    }
    case 'WATCH': {
      check(p.watching === undefined || typeof p.watching === 'boolean', 'Choose play or watch.', 400);
      check(s.phase === 'lobby' || s.phase === 'live' || s.phase === 'claim', 'This round has ended.');
      const watching = p.watching !== false;
      if (m.spectator === watching) break;
      if (s.phase === 'lobby') { if (watching) { coins(e, m, 'release'); m.ready = false; } }
      else if (!watching) { check(!m.disqualification, 'Your full-house claim was rejected. You can watch until the next round.'); check(m.paid && s.roster.includes(actor), 'Join the next round to play.'); }
      // Switching view during play preserves the paid entry and exact ticket marks.
      // It must never refund a consumed reservation or admit an unpaid late entrant.
      m.spectator = watching; e.emit('SEAT_CHANGED', { memberId: actor, watching }); break;
    }
    case 'START': host(); lobby(); if (!m.spectator) { check(m.selected, 'Choose your tickets or switch off playing this round.'); reserveSeat(e, m, command.id); } start(e, now); break;
    case 'PAUSE': {
      host(); check(s.phase === 'live', 'Calls can only be paused during a live round.'); check(typeof p.paused === 'boolean', 'Choose pause or resume.', 400);
      if (p.paused === !!s.pause) break;
      if (p.paused) { s.pause = { by: actor, at: now, remainingMs: Math.max(0, (s.nextCallAt ?? now) - now) }; s.nextCallAt = null; }
      else { s.nextCallAt = now + s.pause!.remainingMs; if (s.startsAt) s.startsAt = s.nextCallAt; s.pause = null; }
      e.emit(p.paused ? 'CALLS_PAUSED' : 'CALLS_RESUMED', { by: actor, nextCallAt: s.nextCallAt }); break;
    }
    case 'PACE': {
      host(); check(s.phase === 'live' || s.phase === 'claim', 'Change caller speed during a live round.');
      check(Number.isInteger(p.seconds) && Number(p.seconds) >= 3 && Number(p.seconds) <= 10, 'Choose a caller speed from 3 to 10 seconds.', 400);
      const seconds = Number(p.seconds), previous = s.config.callSeconds;
      if (seconds === previous && s.nextConfig.callSeconds === seconds) break;
      const current = s.calls.at(-1);
      // Preserve elapsed active time, the opening countdown and the final claim window.
      // Voice duration is a lower bound, even if the Captain chooses a faster pace.
      if (current && !s.startsAt && s.calls.length < 90) {
        const difference = numberCallDelayMs(current, seconds) - numberCallDelayMs(current, previous);
        if (s.pause) s.pause.remainingMs = Math.max(0, s.pause.remainingMs + difference);
        else if (s.nextCallAt !== null) s.nextCallAt = Math.max(now, s.nextCallAt + difference);
      }
      s.config.callSeconds = seconds; s.nextConfig.callSeconds = seconds;
      e.emit('CALL_SPEED_CHANGED', { by: actor, seconds, nextCallAt: s.nextCallAt }); break;
    }
    case 'SCHEDULE': host(); lobby(); check(p.at === null || (Number.isSafeInteger(p.at) && Number(p.at) >= now + 10000 && Number(p.at) <= now + 7 * 86400000), 'Choose a time 10 seconds to 7 days ahead.', 400); s.scheduledAt = p.at as number | null; e.emit('START_SCHEDULED', { at: s.scheduledAt }); break;
    case 'END': host(); check(s.phase !== 'finished', 'This round has ended.'); finish(e, now, null, 'host_ended', true); break;
    case 'MARK': {
      check(s.phase === 'live' && s.roster.includes(actor) && !m.spectator && !m.disqualification, 'Your tickets are read only right now.'); check(Number.isInteger(p.panel) && Number.isInteger(p.cell) && typeof p.marked === 'boolean', 'Invalid cell.', 400);
      const panel = Number(p.panel), cell = Number(p.cell), key = cellKey(panel, cell); check(panel >= 0 && panel < m.panels.length && cell >= 0 && cell < 27 && m.panels[panel]!.flat()[cell] != null, 'Choose a numbered cell.', 400); check(p.version === (m.markVersions[key] ?? 0), 'That mark changed on another device.');
      m.marks[key] = p.marked; m.markVersions[key] = (m.markVersions[key] ?? 0) + 1; e.emit('MARK_CHANGED', { memberId: actor, panel, cell, marked: p.marked, version: m.markVersions[key] }); break;
    }
    case 'CLAIM': {
      check(!m.disqualification, 'Your full-house claim was rejected. You can watch until the next round.');
      check(!s.startsAt, 'Wait for the first number before claiming full house.');
      check(m.claimCallSeq !== s.calls.length, 'Wait for another number before checking full house again.');
      check(s.phase === 'live' && !m.spectator && s.roster.includes(actor), 'A full-house check is running or the round has ended.'); check(Number.isInteger(p.panel) && Number(p.panel) >= 0 && Number(p.panel) < m.panels.length, 'Invalid ticket.', 400); s.verificationFailure = null;
      m.claimCallSeq = s.calls.length;
      s.claim = { id: command.id, by: actor, panelIndex: Number(p.panel), panel: structuredClone(m.panels[Number(p.panel)]!), marks: { ...m.marks }, calls: [...s.calls], callSeq: s.calls.length, startedAt: now, deadline: now + 3000, electorate: [], votes: {}, proofs: [], proofVotes: {}, checked: 0 }; s.phase = 'claim'; s.nextCallAt = null; e.emit('FULL_HOUSE_DECLARED', { claim: s.claim }); break;
    }
    case 'COHOST': owner(); { const t = target(); check(t.id !== actor, 'Choose another member.'); s.coHostId = t.id; e.emit('COHOST_APPOINTED', { memberId: t.id }); } break;
    case 'TRANSFER': owner(); { const t = target(); check(t.id !== actor, 'Choose another member.'); s.ownerId = t.id; s.hostId = t.id; if (s.coHostId === t.id) s.coHostId = null; s.authorityEpoch++; e.emit('OWNERSHIP_TRANSFERRED', { ownerId: t.id, authorityEpoch: s.authorityEpoch }); } break;
    case 'RECLAIM': owner(); s.hostId = actor; s.authorityEpoch++; e.emit('HOST_RECLAIMED', { hostId: actor, authorityEpoch: s.authorityEpoch }); break;
    case 'KICK': { host(); check(typeof p.memberId === 'string' && s.members[p.memberId] && !s.members[p.memberId]!.removed, 'Choose a member.', 400); const t = s.members[p.memberId]!; check(t.id !== s.ownerId && t.id !== actor, 'The owner or acting captain cannot be removed.'); if (!t.paid) coins(e, t, 'release'); t.removed = true; t.onlineUntil = 0; t.spectator = true; if (s.coHostId === t.id) s.coHostId = null; e.emit('MEMBER_REMOVED', { memberId: t.id }); break; }
    case 'TABLE_AVATAR': host(); check(isTableAvatarId(p.tableAvatarId) && (p.tableAvatarPhoto == null || isAvatarPhoto(p.tableAvatarPhoto)), 'Choose a valid table avatar.', 400); if (s.tableAvatarId !== p.tableAvatarId || s.tableAvatarPhoto !== p.tableAvatarPhoto) { s.tableAvatarId = p.tableAvatarId as number; s.tableAvatarPhoto = isAvatarPhoto(p.tableAvatarPhoto) ? p.tableAvatarPhoto : undefined; e.emit('TABLE_AVATAR_CHANGED', { tableAvatarId: s.tableAvatarId, tableAvatarPhoto: s.tableAvatarPhoto }); } break;
    case 'SETTINGS': host(); check(validConfig(p.config), 'Use 3–10 seconds and positive whole coin fees.', 400); s.nextConfig = { ...DEFAULT_TABLE_CONFIG, ...p.config }; if (s.phase === 'lobby') { for (const user of Object.values(s.members)) coins(e, user, 'release'); s.config = { ...s.nextConfig }; } e.emit('SETTINGS_CHANGED', { config: s.nextConfig, applies: s.phase === 'lobby' ? 'now' : 'next_round' }); break;
    case 'LEAVE': if (!m.paid) coins(e, m, 'release'); m.left = true; m.onlineUntil = now; e.emit('MEMBER_LEFT', { memberId: actor }); break;
    case 'NEXT_ROUND': {
      check(s.phase === 'finished', 'End the current round first.'); s.round++; s.roundId = s.id + ':' + s.round; s.config = { ...s.nextConfig }; s.phase = 'lobby'; s.calls = []; s.claim = null; s.result = null; s.roster = []; s.nextCallAt = null; s.lastCallAt = null; s.scheduledAt = null; s.verificationFailure = null; s.pause = null; s.startsAt = null;
      for (const user of Object.values(s.members)) { user.panels = []; user.marks = {}; user.markVersions = {}; user.selected = false; user.ready = false; user.paid = false; delete user.coinHold; delete user.entryCoins; delete user.claimCallSeq; delete user.disqualification; user.spectator = user.id === s.hostId || user.removed || user.left; user.deadline = 0; user.stripVersion++; } e.emit('NEXT_ROUND_LOBBY', { round: s.round, config: s.config }); break;
    }
    case 'ROTATE_INVITE': host(); check(typeof p.invite === 'string' && /^[a-f0-9]{64}$/.test(p.invite), 'Invalid invite.', 400); s.invite = p.invite; e.emit('INVITE_ROTATED'); break;
    default: throw new RoomError(400, 'This action is no longer supported. Update the app.');
  }
  return e;
}
export function nextDeadline(s: RoomState, now: number): number | null {
  const deadlines: number[] = []; if (s.phase === 'lobby' && s.scheduledAt) deadlines.push(s.scheduledAt); if (s.nextCallAt !== null) deadlines.push(s.nextCallAt); if (s.phase === 'claim' && s.claim) deadlines.push(Math.min(s.claim.deadline, now + 600));
  if (s.hostId === s.ownerId && s.coHostId && connected(s.members[s.coHostId], now)) deadlines.push(s.members[s.ownerId]!.onlineUntil);
  return deadlines.length ? Math.max(now + 1, Math.min(...deadlines)) : null;
}
export { DEFAULT_TABLE_CONFIG };
