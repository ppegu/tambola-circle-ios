import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceController, type VoicePeer } from '../src/voiceChat/controller';
import { VoiceRoomService, type VoiceRoomState } from '../server/src/voice-room-service';
import { cloudflareVoice, type VoiceProvider } from '../server/src/voice-provider';
import { validVoiceDescription, VOICE_LEASE_MS, type VoiceReply, type VoiceRequest } from '../shared/tableVoice';

const offer = { type: 'offer' as const, sdp: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:0\r\n' };
const answer = { ...offer, type: 'answer' as const };
const tick = async () => { for (let i = 0; i < 35; i++) await Promise.resolve(); };
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function client() {
  vi.useFakeTimers();
  const peers: (VoicePeer & { receiving: boolean })[] = [];
  let publications: { id: string; memberId: string }[] = [];
  const api = vi.fn(async (b: Omit<VoiceRequest, 'clientId'>): Promise<VoiceReply> => {
    const base = { available: true, publications, iceServers: [] };
    return b.op === 'publish' ? { ...base, connectionId: 'pub', sessionDescription: answer } :
      b.op === 'receive' && publications.length ? { ...base, connectionId: 'recv', sessionDescription: offer } : base;
  });
  const factory = vi.fn((_r: VoiceReply, receiving: boolean, _failed: () => void) => {
    const p = { receiving, offerMicrophone: vi.fn(async () => ({ sessionDescription: offer, mid: '0' })),
      applyAnswer: vi.fn(async () => {}), answer: vi.fn(async () => answer), connected: vi.fn(async () => {}), setMuted: vi.fn(), close: vi.fn() };
    peers.push(p); return p;
  });
  const controller = new VoiceController({ api, peer: factory, changed: vi.fn() });
  return { controller, api, factory, peers, roster: (v: typeof publications) => { publications = v; } };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('two independent table audio switches', () => {
  it('joins muted without capturing; opens capture only on a tap and closes it synchronously on mute', async () => {
    const c = client(); c.controller.start(); await tick(); expect(c.factory).not.toHaveBeenCalled();
    c.controller.toggleMic(); await tick(); expect(c.controller.state.micMuted).toBe(false);
    expect(c.peers[0]!.setMuted).toHaveBeenCalledWith(false);
    c.controller.toggleSpeaker(); expect(c.controller.state.micMuted).toBe(false);
    c.controller.toggleMic(); expect(c.peers[0]!.close).toHaveBeenCalled(); expect(c.controller.state.micMuted).toBe(true);
    await tick(); expect(c.api).toHaveBeenCalledWith({ op: 'mute' }); c.controller.stop();
  });
  it('cannot unmute after a late capture permission result or leave', async () => {
    const c = client(), pending = deferred<{ sessionDescription: typeof offer; mid: string }>();
    const original = c.factory.getMockImplementation()!;
    c.factory.mockImplementation((...args) => { const p = original(...args); p.offerMicrophone.mockImplementation(() => pending.promise); return p; });
    c.controller.start(); await tick(); c.controller.toggleMic(); await tick();
    c.controller.toggleMic(); c.controller.stop(); pending.resolve({ sessionDescription: offer, mid: '0' }); await tick();
    expect(c.peers[0]!.setMuted).not.toHaveBeenCalledWith(false);
    expect(c.api.mock.calls.some(([b]) => b.op === 'publish')).toBe(false);
    expect(c.api.mock.calls.at(-1)?.[0].op).toBe('leave');
  });
  it('masks a new receive connection before applying its offer and keeps the mic independent', async () => {
    const c = client(); c.roster([{ id: 'one', memberId: 'other' }]); c.controller.toggleSpeaker(); c.controller.start(); await tick();
    const p = c.peers[0]!;
    expect(p.receiving).toBe(true); expect(p.setMuted).toHaveBeenCalledWith(true);
    expect(vi.mocked(p.setMuted).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(p.answer).mock.invocationCallOrder[0]!);
    c.controller.toggleSpeaker(); expect(p.setMuted).toHaveBeenLastCalledWith(false);
    expect(c.controller.state.micMuted).toBe(true); c.controller.stop();
  });
  it('fails closed on negotiation errors and recovers as a muted listener', async () => {
    const c = client(); c.controller.start(); await tick();
    c.api.mockRejectedValueOnce(new Error('offline')); c.controller.toggleMic(); await tick();
    expect(c.controller.state.micMuted).toBe(true); expect(c.peers[0]!.close).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10_000); expect(c.controller.state.available).toBe(true); expect(c.controller.state.micMuted).toBe(true); c.controller.stop();
  });
  it('does not advertise an unready publishing connection', async () => {
    const c = client(), pending = deferred<void>(); const original = c.factory.getMockImplementation()!;
    c.factory.mockImplementation((...args) => { const p = original(...args); p.connected.mockImplementation(() => pending.promise); return p; });
    c.controller.start(); await tick(); c.controller.toggleMic(); await tick();
    expect(c.api.mock.calls.some(([b]) => b.op === 'ready')).toBe(false);
    c.controller.toggleMic(); pending.resolve(); await tick();
    expect(c.api.mock.calls.some(([b]) => b.op === 'ready')).toBe(false); c.controller.stop();
  });
});
function room() {
  let state: VoiceRoomState = { tableId: 'table', members: [], retired: [] }, now = 100;
  const provider: VoiceProvider = { create: vi.fn(async () => crypto.randomUUID()),
    tracks: vi.fn(async (_id, b: any) => ({ tracks: b.tracks.map((_: unknown, i: number) => ({ mid: String(i) })), sessionDescription: b.sessionDescription ? answer : offer })),
    answer: vi.fn(async () => {}), close: vi.fn(async () => {}), ice: vi.fn(async () => [{ urls: 'stun:stun.example' }]) };
  const service = new VoiceRoomService({ read: () => structuredClone(state), save: s => { state = structuredClone(s); } }, provider, () => now);
  const act = (user: string, op: VoiceRequest['op'], rest: Partial<VoiceRequest> = {}) => service.act(user, { op, clientId: user, ...rest });
  return { service, provider, act, state: () => state, expire: () => { now += VOICE_LEASE_MS + 1; } };
}
describe('authorized voice session lifecycle', () => {
  it('publishes only after readiness, receives only other members, and invalidates an old phone session', async () => {
    const r = room(); await r.act('alice', 'join'); await r.act('bob', 'join');
    const publication = await r.act('alice', 'publish', { mid: '0', sessionDescription: offer });
    expect((await r.act('bob', 'status')).publications).toEqual([]);
    await r.act('alice', 'ready', { connectionId: publication.connectionId });
    expect((await r.act('alice', 'status')).publications).toEqual([]);
    expect((await r.act('bob', 'status')).publications).toHaveLength(1);
    const receiver = await r.act('bob', 'receive');
    await expect(r.act('alice', 'answer', { connectionId: receiver.connectionId, sessionDescription: answer })).rejects.toThrow('changed');
    await r.act('bob', 'answer', { connectionId: receiver.connectionId, sessionDescription: answer });
    await r.act('alice', 'join', { clientId: 'new-phone' });
    await expect(r.act('alice', 'status')).rejects.toThrow('ended');
    expect((await r.act('bob', 'status')).publications).toEqual([]);
  });
  it('removes expired/kicked members before cleanup and retries provider failures', async () => {
    const r = room(); await r.act('alice', 'join'); const p = await r.act('alice', 'publish', { mid: '0', sessionDescription: offer });
    await r.act('alice', 'ready', { connectionId: p.connectionId });
    vi.mocked(r.provider.close).mockRejectedValueOnce(new Error('provider down'));
    await r.service.sweep(new Set()); expect(r.state().members).toEqual([]); expect(r.state().retired).toHaveLength(1);
    await r.service.sweep(new Set()); expect(r.state().retired).toEqual([]);
    await r.act('bob', 'join'); r.expire(); await r.service.sweep(new Set(['bob'])); expect(r.state().members).toEqual([]);
  });
  it('remembers partial allocations and hides failed publication', async () => {
    const r = room(); await r.act('alice', 'join');
    vi.mocked(r.provider.tracks).mockResolvedValueOnce({ tracks: [{ mid: '0' }, { mid: '1', errorCode: 'failed' }], sessionDescription: answer });
    await expect(r.act('alice', 'publish', { mid: '0', sessionDescription: offer })).rejects.toThrow('connect');
    expect(r.state().members[0]?.publisher?.mids).toEqual(['0', '1']);
    expect(r.state().members[0]?.publisher?.ready).toBe(false);
    await r.act('alice', 'leave'); await r.service.sweep(new Set()); expect(r.provider.close).toHaveBeenCalledWith(expect.any(String), ['0', '1']);
  });
  it('rejects video, data channels and oversized SDP before calling the SFU', async () => {
    const r = room(); await r.act('alice', 'join');
    for (const sdp of [offer.sdp + 'm=video 9 RTP/SAVPF 96\r\n', offer.sdp + 'm=application 9 DTLS/SCTP 5000\r\n', 'v=0' + 'a'.repeat(48000)]) {
      expect(validVoiceDescription({ type: 'offer', sdp }, 'offer')).toBe(false);
      await expect(r.act('alice', 'publish', { mid: '0', sessionDescription: { type: 'offer', sdp } })).rejects.toThrow('Invalid');
    }
    expect(r.provider.create).not.toHaveBeenCalled();
  });
});

describe('Cloudflare provider cleanup', () => {
  const env = { SFU_APP_ID: 'app', SFU_APP_SECRET: 'sfu-secret', TURN_KEY_ID: 'turn', TURN_API_TOKEN: 'turn-secret' };
  it('discovers and closes tracks after an uncertain allocation, including previously unknown mids', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ tracks: [{ mid: '8', status: 'active' }, { mid: '9', status: 'inactive' }] }))
      .mockResolvedValueOnce(Response.json({ tracks: [{ mid: '8' }] }));
    vi.stubGlobal('fetch', fetch); await cloudflareVoice(env).close('session', []);
    expect(fetch.mock.calls[0][1].method).toBe('GET');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ force: true, tracks: [{ mid: '8' }] });
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer sfu-secret');
  });
  it('does not silently discard track-close errors, while a missing session is already cleaned', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ tracks: [{ mid: '0', status: 'active' }] }))
      .mockResolvedValueOnce(Response.json({ tracks: [{ mid: '0', errorCode: 'close_track_error' }] }))
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetch);
    await expect(cloudflareVoice(env).close('session', ['0'])).rejects.toThrow('retry');
    await expect(cloudflareVoice(env).close('gone', ['0'])).resolves.toBeUndefined();
  });
});
