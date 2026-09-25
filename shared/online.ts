import { isAvatarPhoto } from './avatarPhoto';
import { isTableAvatarId } from './tableAvatars';
import type { Panel, StripKind } from './tickets';
import type { MobileSource } from './device';

export type OnlineProfile = { id: string; name: string; avatarId?: number; avatarPhoto?: string; mobile: string; mobileSource: MobileSource; verificationStatus: 'unverified' };
export type TableConfig = { readySeconds: number; reviewSeconds: number; callSeconds: number; halfCoins?: number; fullCoins?: number };
export type TableCreationOptions = { hostPlaying?: boolean; startInSeconds?: number; tableAvatarPhoto?: string; tableAvatarId?: number };
export function validTableCreationOptions(value: unknown): value is TableCreationOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const options = value as Record<string, unknown>;
  return Object.keys(options).every(key => key === 'hostPlaying' || key === 'startInSeconds' || key === 'tableAvatarId' || key === 'tableAvatarPhoto') &&
    (options.tableAvatarPhoto === undefined || isAvatarPhoto(options.tableAvatarPhoto)) &&
    (options.tableAvatarId === undefined || isTableAvatarId(options.tableAvatarId)) &&
    (options.hostPlaying === undefined || typeof options.hostPlaying === 'boolean') &&
    (options.startInSeconds === undefined || (Number.isInteger(options.startInSeconds) && Number(options.startInSeconds) >= 120 && Number(options.startInSeconds) <= 604800));
}
export const DEFAULT_TABLE_CONFIG: TableConfig = { readySeconds: 120, reviewSeconds: 120, callSeconds: 5, halfCoins: 50, fullCoins: 100 };
export type CoinWallet = { balance: number; held: number; testMode: boolean; transactions: { id: string; kind: string; amount: number; at: number }[] };
export type CoinTransaction = { id: string; kind: string; amount: number; at: number; status: 'reserved' | 'consumed' | 'released' | 'refunded' | 'added'; tableName: string | null; round: number | null };
export type CoinTransactionFilter = 'all' | 'topups' | 'entries' | 'refunds';
export type CoinTransactionPage = { transactions: CoinTransaction[]; nextCursor: string | null };
export type CoinPlan = { id: string; label: string; coins: number; artwork: number; recommended: boolean };
export type CoinCatalog = { plans: CoinPlan[]; testMode: boolean };
export type WalletEffect = { type: 'reserve' | 'consume' | 'release' | 'refund'; id: string; playerId: string; tableId: string; roundId: string; amount: number };
export type Phase = 'lobby' | 'live' | 'claim' | 'proof' | 'host' | 'finished';
export type Member = { id: string; name: string; avatarId?: number; avatarPhoto?: string; mobile: string; joinedAt: number; onlineUntil: number;
  removed: boolean; left: boolean; ready: boolean; deadline: number; spectator: boolean; kind: StripKind;
  panels: Panel[]; selected: boolean; stripVersion: number; marks: Record<string, boolean>; markVersions: Record<string, number>;
  coinHold?: string; entryCoins?: number; paid?: boolean; claimCallSeq?: number;
  disqualification?: { roundId: string; panelIndex: number; panel: Panel; marks: Record<string, boolean>; calls: number[]; missing: number[]; at: number } };
export type Vote = 'approve' | 'timeout' | 'disagree';
export type Proof = { by: string; cells: number[]; reason: 'not_called' | 'not_marked' | 'other'; note: string; createdAt: number };
export type Claim = { id: string; by: string; panelIndex: number; panel: Panel; marks: Record<string, boolean>;
  calls: number[]; callSeq: number; startedAt: number; deadline: number; electorate: string[];
  votes: Record<string, Vote>; proofs: Proof[]; proofVotes: Record<string, Vote>; hostDeadline?: number; checked?: number; missing?: number[] };
export type Result = { winner: string | null; panelIndex?: number; reason: string; decidedBy?: string; at: number; approved?: number; automatic?: number };
export type RoomState = { id: string; name: string; tableAvatarPhoto?: string; tableAvatarId?: number; code: string; invite: string; ownerId: string; hostId: string; coHostId: string | null;
  authorityEpoch: number; config: TableConfig; nextConfig: TableConfig; phase: Phase; round: number; roundId: string;
  members: Record<string, Member>; roster: string[]; calls: number[]; nextCallAt: number | null; lastCallAt: number | null;
  claim: Claim | null; result: Result | null; seq: number; createdAt: number; scheduledAt?: number | null;
  verificationFailure?: { by: string; panelIndex: number; missing: number[]; at: number } | null;
  startsAt?: number | null; pause?: { by: string; at: number; remainingMs: number } | null };
export type RoomEvent = { seq: number; round: number; at: number; actor: string; type: string; data: Record<string, unknown> };
export type RoomSnapshot = RoomState & { serverNow: number; viewerId: string };
export type CommandType = 'SELECT' | 'CONFIRM_STRIP' | 'READY' | 'MARK' | 'CLAIM' | 'PROOF' | 'VOTE' | 'DECIDE' |
  'TABLE_AVATAR' | 'COHOST' | 'TRANSFER' | 'RECLAIM' | 'KICK' | 'SETTINGS' | 'LEAVE' | 'NEXT_ROUND' | 'ROTATE_INVITE' | 'START' | 'SCHEDULE' | 'END' | 'WATCH' | 'PAUSE' | 'PACE';
export type RoomCommand = { id: string; type: CommandType; roundId: string; authorityEpoch?: number; payload: Record<string, unknown> };
export type TablePlayer = { id: string; name: string; avatarId?: number; avatarPhoto?: string };
export type TablePreview = { tableAvatarPhoto?: string; tableAvatarId?: number; id: string; code: string; name: string; host: string; hostAvatarId?: number; hostAvatarPhoto?: string; config: TableConfig; phase: Phase; count: number; playerCount: number; watchingCount: number; players: { name: string; avatarId?: number; avatarPhoto?: string }[] };
export type TableSummary = { tableAvatarPhoto?: string; tableAvatarId?: number; id: string; name: string; round: number; phase: Phase; ownerId: string; updatedAt: number; players?: TablePlayer[]; playerCount?: number };
export type PastGame = TableSummary & { endedAt: number; completed: boolean; winnerName: string | null };
export type PastGameDetails = { game: PastGame; calls: number[]; reason: string; tickets: { id: string; name: string; avatarId?: number; avatarPhoto?: string; panels: Panel[]; marks: Record<string, boolean> }[] };
export type HistoryRound = { round: number; state: RoomState; events?: RoomEvent[] };
// The per-number deadline also allows the recorded announcement to finish.
export const MIN_CALL_SECONDS = 3;
export function validConfig(value: unknown): value is TableConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return Object.keys(c).every(k => ['readySeconds', 'reviewSeconds', 'callSeconds', 'halfCoins', 'fullCoins'].includes(k)) && Number.isInteger(c.callSeconds) && Number(c.callSeconds) >= MIN_CALL_SECONDS && Number(c.callSeconds) <= 10 &&
    ['halfCoins', 'fullCoins'].every(k => c[k] === undefined || (Number.isInteger(c[k]) && Number(c[k]) >= 1 && Number(c[k]) <= 100000));
}
export const ticketCost = (config: TableConfig, kind: StripKind) => kind === 'full' ? config.fullCoins ?? 100 : config.halfCoins ?? 50;
export function memberProgress(member: Member, calls: number[]) {
  const scores = member.panels.map((panel, index) => panel.flat().reduce<number>((n, value, cell) => n + (value !== null && calls.includes(value) && member.marks[cellKey(index, cell)] ? 1 : 0), 0));
  const best = Math.max(0, ...scores);
  return { completed: scores.filter(n => n === 15).length, best, left: 15 - best, scores };
}
export const cellKey = (panel: number, cell: number) => `${panel}:${cell}`;
