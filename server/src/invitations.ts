import type { OnlineProfile, RoomState } from '../../shared/online';
import type { TableInvitation } from '../../shared/invitations';
import { RoomError } from './room-engine';
import { equalHex } from './security';

type InviteRow = { id: string; table_id: string; sender_id: string; recipient_id: string; invite_token: string; status: TableInvitation['status']; created_at: number; updated_at: number; expires_at: number };
export function requireCaptain(state: RoomState, actor: string) {
  const member = state.members[actor];
  if (state.hostId !== actor || !member || member.left || member.removed) throw new RoomError(403, 'Only the captain can invite players.');
}
/** Called inside the table's serialized operation queue, including responses. */
export async function sendInvitation(env: Env, state: RoomState, actor: string, recipient: string) {
  requireCaptain(state, actor);
  if (actor === recipient) throw new RoomError(400, 'You are already at this table.');
  const member = state.members[recipient];
  if (member?.removed) throw new RoomError(403, 'This player was removed from the table.');
  if (member && !member.left) throw new RoomError(409, 'This player is already at the table.');
  if (!await env.DB.prepare('SELECT id FROM online_players WHERE id=?').bind(recipient).first()) throw new RoomError(404, 'Player not found.');
  const old = await env.DB.prepare('SELECT * FROM online_invitations WHERE table_id=? AND recipient_id=?').bind(state.id, recipient).first<InviteRow>();
  const now = Date.now();
  if (old && (old.status === 'accepting' || old.status === 'pending' && old.expires_at > now) && equalHex(old.invite_token, state.invite)) return { id: old.id, status: old.status };
  if (old?.status === 'declined' && old.updated_at > now - 86400000) throw new RoomError(409, 'This player declined. Try again tomorrow.');
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO online_invitations(id,table_id,sender_id,recipient_id,invite_token,status,created_at,updated_at,expires_at)
    VALUES(?,?,?,?,?,'pending',?,?,?) ON CONFLICT(table_id,recipient_id) DO UPDATE SET id=excluded.id,sender_id=excluded.sender_id,
    invite_token=excluded.invite_token,status='pending',created_at=excluded.created_at,updated_at=excluded.updated_at,expires_at=excluded.expires_at`)
    .bind(id, state.id, actor, recipient, state.invite, now, now, now + 86400000).run();
  return { id, status: 'pending' as const };
}
export async function respondInvitation(env: Env, state: RoomState, user: OnlineProfile, id: string, response: 'accept' | 'decline', join: () => Promise<unknown>) {
  const row = await env.DB.prepare('SELECT * FROM online_invitations WHERE id=? AND table_id=? AND recipient_id=?').bind(id, state.id, user.id).first<InviteRow>();
  if (!row) throw new RoomError(404, 'Invitation unavailable.');
  if (row.status === 'declined') {
    if (response === 'decline') return { status: 'declined' };
    throw new RoomError(409, 'You already declined this invitation.');
  }
  if (row.status === 'accepted') {
    if (response === 'decline') throw new RoomError(409, 'You already accepted this invitation.');
    const member = state.members[user.id];
    if (!member || member.removed || member.left) throw new RoomError(409, 'This invitation has already been used.');
    return { status: 'accepted', snapshot: await join() };
  }
  if (row.status === 'expired' || row.status === 'pending' && row.expires_at <= Date.now() || !equalHex(row.invite_token, state.invite)) {
    await env.DB.prepare("UPDATE online_invitations SET status='expired',updated_at=? WHERE id=?").bind(Date.now(), id).run();
    throw new RoomError(410, 'Invitation expired. Ask the captain for a new one.');
  }
  if (response === 'decline') {
    if (row.status === 'accepting') throw new RoomError(409, 'Joining is in progress. Please retry Accept.');
    await env.DB.prepare("UPDATE online_invitations SET status='declined',updated_at=? WHERE id=?").bind(Date.now(), id).run();
    return { status: 'declined' };
  }
  // Persist acceptance intent before joining. A retry after a process/network
  // failure completes this same join; a racing decline cannot undo it.
  await env.DB.prepare("UPDATE online_invitations SET status='accepting',updated_at=? WHERE id=?").bind(Date.now(), id).run();
  let snapshot: unknown;
  try { snapshot = await join(); }
  catch (error) {
    if (error instanceof RoomError && [403, 404].includes(error.status)) await env.DB.prepare("UPDATE online_invitations SET status='expired',updated_at=? WHERE id=?").bind(Date.now(), id).run();
    // A full table rejects before membership is written. Keep Decline available;
    // retain 'accepting' only for uncertain failures that need idempotent recovery.
    else if (error instanceof RoomError && [400, 409].includes(error.status)) await env.DB.prepare("UPDATE online_invitations SET status='pending',updated_at=? WHERE id=?").bind(Date.now(), id).run();
    throw error;
  }
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO online_memberships(table_id,player_id) VALUES(?,?)').bind(state.id, user.id),
    env.DB.prepare("UPDATE online_invitations SET status='accepted',updated_at=? WHERE id=?").bind(Date.now(), id),
  ]);
  return { status: 'accepted', snapshot };
}
export async function listInvitations(env: Env, player: string) {
  const rows = await env.DB.prepare(`SELECT i.*,t.name AS table_name,t.listing,p.name AS sender_name,p.avatar_id,p.avatar_photo
    FROM online_invitations i JOIN online_tables t ON t.id=i.table_id JOIN online_players p ON p.id=i.sender_id
    WHERE i.recipient_id=? ORDER BY CASE WHEN i.status IN ('pending','accepting') AND i.expires_at>? THEN 0 ELSE 1 END,i.updated_at DESC LIMIT 100`)
    .bind(player, Date.now()).all<InviteRow & { table_name: string; listing: string; sender_name: string; avatar_id: number | null; avatar_photo: string | null }>();
  return rows.results.map(row => {
    const listing = JSON.parse(row.listing) as { tableAvatarId?: number; tableAvatarPhoto?: string };
    return { id: row.id, tableId: row.table_id, tableName: row.table_name, tableAvatarId: listing.tableAvatarId, tableAvatarPhoto: listing.tableAvatarPhoto,
      sender: { id: row.sender_id, name: row.sender_name, avatarId: row.avatar_id ?? undefined, avatarPhoto: row.avatar_photo ?? undefined },
      status: row.status === 'pending' && row.expires_at <= Date.now() ? 'expired' : row.status, createdAt: row.created_at, expiresAt: row.expires_at } satisfies TableInvitation;
  });
}
