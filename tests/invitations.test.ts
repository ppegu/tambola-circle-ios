import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { timingSafeEqual } from 'node:crypto';
import { respondInvitation } from '../server/src/invitations';
import { createRoom, RoomError } from '../server/src/room-engine';
import { DEFAULT_TABLE_CONFIG, type OnlineProfile } from '../shared/online';

// Workers exposes this on SubtleCrypto; Node exposes the same primitive separately.
beforeAll(() => Object.defineProperty(crypto.subtle, 'timingSafeEqual', { configurable: true, value: timingSafeEqual }));
afterAll(() => { Reflect.deleteProperty(crypto.subtle, 'timingSafeEqual'); });

const profile: OnlineProfile = { id: 'recipient', name: 'QA', mobile: '+15550000001', mobileSource: 'device_selected', verificationStatus: 'unverified' };
function fixture() {
  const state = createRoom('table', 'QA table', '123456', 'a'.repeat(64), { ...profile, id: 'captain' }, DEFAULT_TABLE_CONFIG, Date.now()).state;
  const row = { id: 'invite', table_id: state.id, recipient_id: profile.id, invite_token: state.invite, status: 'pending', expires_at: Date.now() + 86400000 };
  const DB = {
    prepare(sql: string) {
      const statement = { bind: (..._args: unknown[]) => statement, first: async () => ({ ...row }), run: async () => { const status = sql.match(/SET status='(\w+)'/); if (status) row.status = status[1]!; return {}; } };
      return statement;
    },
    batch: async (statements: { run(): Promise<unknown> }[]) => Promise.all(statements.map(s => s.run())),
  };
  return { state, row, env: { DB } as unknown as Env };
}
describe('invitation acceptance recovery', () => {
  it('allows declining or retrying when a full table rejects entry', async () => {
    const { state, row, env } = fixture();
    await expect(respondInvitation(env, state, profile, row.id, 'accept', async () => { throw new RoomError(409, 'This table is full.'); })).rejects.toThrow('full');
    expect(row.status).toBe('pending');
    await respondInvitation(env, state, profile, row.id, 'decline', async () => { throw new Error('must not join'); });
    expect(row.status).toBe('declined');
  });
  it('retains acceptance intent for uncertain failures and completes a retry', async () => {
    const { state, row, env } = fixture();
    await expect(respondInvitation(env, state, profile, row.id, 'accept', async () => { throw new Error('storage interrupted'); })).rejects.toThrow('interrupted');
    expect(row.status).toBe('accepting');
    await expect(respondInvitation(env, state, profile, row.id, 'decline', async () => null)).rejects.toThrow('progress');
    const result = await respondInvitation(env, state, profile, row.id, 'accept', async () => ({ id: state.id }));
    expect(result.status).toBe('accepted');
    expect(row.status).toBe('accepted');
  });
});
