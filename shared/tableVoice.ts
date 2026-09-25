/** Table voice uses two independent local switches; neither controls another phone. */
export type VoiceDescription = { type: 'offer' | 'answer'; sdp: string };
export type VoiceIceServer = { urls: string | string[]; username?: string; credential?: string };
export type VoicePublication = { memberId: string; id: string };
export type VoiceReply = {
  available: boolean; publications?: VoicePublication[]; iceServers?: VoiceIceServer[];
  connectionId?: string; sessionDescription?: VoiceDescription;
};
export type VoiceOperation = 'join' | 'status' | 'publish' | 'ready' | 'receive' | 'answer' | 'mute' | 'leave';
export type VoiceRequest = {
  op: VoiceOperation; clientId: string; connectionId?: string; mid?: string;
  sessionDescription?: VoiceDescription;
};
export const VOICE_LEASE_MS = 45_000;
export const VOICE_POLL_MS = 5_000;
export const VOICE_MAX_MEMBERS = 16;

export function isVoiceRequest(value: Record<string, unknown>): value is Record<string, unknown> & VoiceRequest {
  return ['join', 'status', 'publish', 'ready', 'receive', 'answer', 'mute', 'leave'].includes(String(value.op)) &&
    typeof value.clientId === 'string' && /^[a-f0-9-]{36}$/.test(value.clientId);
}

/** Reject video/data channels and bound SDP before it reaches the provider. */
export function validVoiceDescription(value: unknown, type: 'offer' | 'answer'): value is VoiceDescription {
  if (!value || typeof value !== 'object') return false;
  const d = value as Partial<VoiceDescription>;
  if (d.type !== type || typeof d.sdp !== 'string' || d.sdp.length > 48_000 || !d.sdp.startsWith('v=0')) return false;
  const media = d.sdp.split(/\r?\n/).filter(line => line.startsWith('m='));
  return media.length > 0 && media.length <= VOICE_MAX_MEMBERS && media.every(line => line.startsWith('m=audio ')) &&
    (type !== 'offer' || media.length === 1);
}
