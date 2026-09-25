import { mediaDevices, RTCPeerConnection, RTCSessionDescription, type MediaStreamTrack, type MediaStream } from 'react-native-webrtc';
import { PermissionsAndroid, Platform } from 'react-native';
import type { VoiceDescription, VoiceReply } from '../../shared/tableVoice';
import type { VoicePeer } from './controller';
import CircleDevice from '../../modules/circle-device';

let users = 0;
let audioChanges = Promise.resolve();
function audio(active: boolean) {
  users = Math.max(0, users + (active ? 1 : -1));
  const needed = users > 0;
  audioChanges = audioChanges.catch(() => {}).then(() => CircleDevice.setVoiceChatActive(needed));
  return audioChanges;
}

export function nativeVoicePeer(config: VoiceReply, receive: boolean, failed: () => void): VoicePeer {
  const pc = new RTCPeerConnection({ iceServers: config.iceServers ?? [] });
  // 124.x imports an unexported event-target-shim/index type under TS bundler resolution.
  const events = pc as RTCPeerConnection & {
    addEventListener(type: 'track', listener: (event: { track: MediaStreamTrack }) => void): void;
    addEventListener(type: 'connectionstatechange', listener: () => void): void;
  };
  let closed = false, muted = true, stream: MediaStream | undefined;
  const tracks = new Set<MediaStreamTrack>();
  const audioReady = audio(true);
  void audioReady.catch(() => {}); // It is also awaited by negotiation.
  let failureTimer: ReturnType<typeof setTimeout> | undefined;
  events.addEventListener('track', event => {
    if (closed) { event.track.enabled = false; return; }
    event.track._setVolume(muted ? 0 : 1); event.track.enabled = !muted; tracks.add(event.track);
  });
  events.addEventListener('connectionstatechange', () => {
    clearTimeout(failureTimer);
    if (!closed && pc.connectionState === 'failed') failed();
    else if (!closed && pc.connectionState === 'disconnected') failureTimer = setTimeout(() => { if (!closed && pc.connectionState === 'disconnected') failed(); }, 3000);
  });
  async function waitFor(kind: 'ice' | 'connection') {
    const start = Date.now();
    while (!closed) {
      if (kind === 'ice' ? pc.iceGatheringState === 'complete' : pc.connectionState === 'connected') return;
      if (pc.connectionState === 'failed' || Date.now() - start > 12_000) throw new Error('Voice connection timed out');
      await new Promise<void>(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Voice connection closed');
  }
  async function local() {
    await waitFor('ice'); const d = pc.localDescription;
    if (!d || (d.type !== 'offer' && d.type !== 'answer')) throw new Error('Missing audio description');
    return { type: d.type, sdp: d.sdp } as VoiceDescription;
  }
  return {
    async offerMicrophone() {
      if (receive) throw new Error('Receive-only connection');
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Microphone permission denied');
      }
      if (closed) throw new Error('Cancelled');
      await audioReady;
      const captured = await mediaDevices.getUserMedia({ audio: true, video: false });
      if (closed) { captured.getTracks().forEach(t => t.stop()); captured.release(); throw new Error('Cancelled'); }
      stream = captured; const track = stream.getAudioTracks()[0]; if (!track) throw new Error('Microphone unavailable');
      track.enabled = false; tracks.add(track);
      const transceiver = pc.addTransceiver(track, { direction: 'sendonly' });
      await pc.setLocalDescription(await pc.createOffer());
      const sessionDescription = await local();
      if (transceiver.mid === null) throw new Error('Missing audio mid');
      return { sessionDescription, mid: transceiver.mid };
    },
    async applyAnswer(d) {
      if (closed) throw new Error('Cancelled');
      await pc.setRemoteDescription(new RTCSessionDescription(d));
      // Encodings may not exist until negotiation has established the sender.
      for (const sender of pc.getSenders()) {
        const parameters = sender.getParameters();
        if (parameters.encodings?.length) { parameters.encodings.forEach(e => { e.maxBitrate = 32_000; }); await sender.setParameters(parameters); }
      }
    },
    async answer(d) { await audioReady; if (closed) throw new Error('Cancelled'); await pc.setRemoteDescription(new RTCSessionDescription(d));
      await pc.setLocalDescription(await pc.createAnswer()); return local(); },
    connected: () => waitFor('connection'),
    setMuted(value) { muted = value; for (const track of tracks) { if (track.remote) track._setVolume(value ? 0 : 1); track.enabled = !value; } },
    close() { if (closed) return; closed = true; clearTimeout(failureTimer);
      for (const track of tracks) { track.enabled = false; if (!track.remote) track.stop(); }
      pc.close(); stream?.release(); tracks.clear(); void audio(false).catch(() => {}); },
  };
}
