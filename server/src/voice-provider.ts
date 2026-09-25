import type { VoiceDescription, VoiceIceServer } from '../../shared/tableVoice';
import { RoomError } from './room-engine';

export type SfuTrack = { mid?: string; trackName?: string; sessionId?: string; errorCode?: string; status?: string };
export type SfuReply = { sessionId?: string; sessionDescription?: VoiceDescription; tracks?: SfuTrack[]; errorCode?: string; requiresImmediateRenegotiation?: boolean };
export interface VoiceProvider {
  create(): Promise<string>;
  tracks(sessionId: string, body: object): Promise<SfuReply>;
  answer(sessionId: string, sessionDescription: VoiceDescription): Promise<void>;
  close(sessionId: string, mids: string[]): Promise<void>;
  ice(): Promise<VoiceIceServer[]>;
}

/** Provider secrets never leave the Worker. Responses and requests are bounded. */
export function cloudflareVoice(env: { SFU_APP_ID: string; SFU_APP_SECRET: string; TURN_KEY_ID: string; TURN_API_TOKEN: string }): VoiceProvider {
  async function call<T>(url: string, token: string, method: string, body?: object): Promise<T> {
    const response = await fetch(url, { method, signal: AbortSignal.timeout(7000), headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (method === 'GET' && response.status === 404) { await response.body?.cancel(); return { tracks: [] } as T; }
    if (!response.ok) { await response.body?.cancel(); throw new RoomError(503, 'Table voice is reconnecting.'); }
    const reader = response.body?.getReader(); if (!reader) throw new RoomError(503, 'Table voice unavailable.');
    const chunks: Uint8Array[] = []; let length = 0;
    try { for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.length;
      if (length > 128_000) { await reader.cancel(); throw new RoomError(503, 'Invalid voice response.'); } chunks.push(part.value); }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }
  const base = `https://rtc.live.cloudflare.com/v1/apps/${encodeURIComponent(env.SFU_APP_ID)}/sessions`;
  const sfu = (id: string, path: string, method: string, body?: object) => call<SfuReply>(`${base}/${encodeURIComponent(id)}${path}`, env.SFU_APP_SECRET, method, body);
  return {
    async create() { const result = await call<SfuReply>(`${base}/new`, env.SFU_APP_SECRET, 'POST');
      if (!result.sessionId || result.errorCode) throw new RoomError(503, 'Could not start table voice.'); return result.sessionId; },
    tracks: (id, body) => sfu(id, '/tracks/new', 'POST', body),
    async answer(id, sessionDescription) { const result = await sfu(id, '/renegotiate', 'PUT', { sessionDescription });
      if (result.errorCode) throw new RoomError(503, 'Could not connect table voice.'); },
    async close(id, mids) {
      // Discover allocations even if tracks/new timed out before returning its mids.
      const session = await sfu(id, '', 'GET');
      if (session.errorCode || !Array.isArray(session.tracks)) throw new RoomError(503, 'Voice cleanup will retry.');
      const active = (session.tracks ?? []).filter(t => t.status !== 'inactive' && t.mid).map(t => t.mid!);
      if (!active.length) return;
      const result = await sfu(id, '/tracks/close', 'PUT', { force: true, tracks: active.map(mid => ({ mid })) });
      if (result.errorCode || result.tracks?.some(t => t.errorCode)) throw new RoomError(503, 'Voice cleanup will retry.');
    },
    async ice() {
      const result = await call<{ iceServers: VoiceIceServer[] }>(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate`, env.TURN_API_TOKEN, 'POST', { ttl: 3600 });
      if (!Array.isArray(result.iceServers) || !result.iceServers.length) throw new RoomError(503, 'Voice relay unavailable.');
      return result.iceServers;
    },
  };
}
