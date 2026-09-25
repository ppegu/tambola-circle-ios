import type { PastGame, PastGameDetails, RoomState, TableSummary } from '../../shared/online';

export function listingMembers(state: RoomState) {
  const members = state.phase === 'lobby'
    ? Object.values(state.members).filter(m => !m.removed && !m.left)
    : state.roster.map(id => state.members[id]).filter(m => !!m);
  return { tableAvatarId: state.tableAvatarId ?? 0, tableAvatarPhoto: state.tableAvatarPhoto, playerCount: members.length, players: members.slice(0, 4).map(({ id, name, avatarId, avatarPhoto }) => ({ id, name, avatarPhoto, ...(avatarId !== undefined ? { avatarId } : {}) })) };
}

export function pastGame(state: RoomState): PastGame {
  return { id: state.id, name: state.name, round: state.round, phase: 'finished', ownerId: state.ownerId,
    updatedAt: state.result?.at ?? state.createdAt, endedAt: state.result?.at ?? state.createdAt,
    completed: !!state.result?.winner, winnerName: state.result?.winner ? state.members[state.result.winner]?.name ?? null : null,
    ...listingMembers(state) };
}

export function pastGameDetails(state: RoomState): PastGameDetails {
  return { game: pastGame(state), calls: state.calls, reason: state.result?.reason ?? 'Round ended',
    tickets: state.roster.flatMap(id => {
      const m = state.members[id];
      return m ? [{ id: m.id, name: m.name, avatarId: m.avatarId, avatarPhoto: m.avatarPhoto, panels: m.panels, marks: m.marks }] : [];
    }) };
}

export async function listTables(db: D1Database, playerId: string): Promise<TableSummary[]> {
  const rows = await db.prepare(`SELECT t.id,t.name,t.owner_id AS ownerId,t.round,t.phase,t.updated_at AS updatedAt,t.listing
    FROM online_tables t JOIN online_memberships m ON m.table_id=t.id
    WHERE m.player_id=? AND m.removed=0 ORDER BY t.updated_at DESC LIMIT 100`).bind(playerId).all<TableSummary & { listing: string }>();
  return rows.results.map(({ listing, ...table }) => ({ ...table, ...JSON.parse(listing) }));
}

// Membership is checked both now and in the archived round. A later join cannot
// reveal rounds the player was never part of; kicked users lose access.
const archiveAccess = `FROM online_rounds r JOIN online_memberships m ON m.table_id=r.table_id
  WHERE m.player_id=? AND m.removed=0 AND json_extract(r.state,'$.phase')='finished'
  AND EXISTS (SELECT 1 FROM json_each(r.state,'$.members') WHERE key=m.player_id
    AND (json_extract(r.state,'$.result.at') IS NULL OR json_extract(value,'$.joinedAt')<=json_extract(r.state,'$.result.at')))`;

export async function listPastGames(db: D1Database, playerId: string): Promise<PastGame[]> {
  const rows = await db.prepare(`SELECT r.state ${archiveAccess}
    ORDER BY json_extract(r.state,'$.result.at') DESC,r.table_id,r.round DESC LIMIT 100`).bind(playerId).all<{ state: string }>();
  return rows.results.map(row => pastGame(JSON.parse(row.state)));
}

export async function getPastGame(db: D1Database, playerId: string, tableId: string, round: number): Promise<PastGameDetails | null> {
  const row = await db.prepare(`SELECT r.state ${archiveAccess} AND r.table_id=? AND r.round=?`)
    .bind(playerId, tableId, round).first<{ state: string }>();
  return row ? pastGameDetails(JSON.parse(row.state)) : null;
}
