import { VOICE_POLL_MS, type VoiceDescription, type VoicePublication, type VoiceReply, type VoiceRequest } from '../../shared/tableVoice';

export type VoiceState = { micMuted: boolean; speakerMuted: boolean; busy: boolean; available: boolean; error: string };
export interface VoicePeer {
  offerMicrophone(): Promise<{ sessionDescription: VoiceDescription; mid: string }>;
  applyAnswer(description: VoiceDescription): Promise<void>;
  answer(description: VoiceDescription): Promise<VoiceDescription>;
  connected(): Promise<void>;
  setMuted(muted: boolean): void;
  close(): void;
}
export type VoicePorts = {
  api(body: Omit<VoiceRequest, 'clientId'>): Promise<VoiceReply>;
  peer(reply: VoiceReply, receive: boolean, failed: () => void): VoicePeer;
  changed(state: VoiceState): void;
};
const key = (p: VoicePublication[] = []) => p.map(x => x.id).sort().join(',');

/** One table session. Cancellation is synchronous; negotiation is serialized. */
export class VoiceController {
  state: VoiceState = { micMuted: true, speakerMuted: false, busy: false, available: false, error: '' };
  private ended = false;
  private wantedMic = false;
  private micRevision = 0;
  private publish?: VoicePeer;
  private receive?: VoicePeer;
  private receivingKey = '';
  private config?: VoiceReply;
  private timer?: ReturnType<typeof setTimeout>;
  private queue = Promise.resolve();
  private failures = 0;
  constructor(private ports: VoicePorts, speakerMuted = false) { this.state.speakerMuted = speakerMuted; }
  private set(patch: Partial<VoiceState>) { if (!this.ended) { this.state = { ...this.state, ...patch }; this.ports.changed(this.state); } }
  private enqueue(fn: () => Promise<void>) {
    this.queue = this.queue.then(async () => { if (!this.ended) await fn(); }).catch(() => {
      if (!this.ended) { this.muteLocal(); this.receive?.close(); this.receive = undefined; this.receivingKey = ''; this.config = undefined;
        this.failures++; this.set({ busy: false, available: false, error: 'Voice unavailable. Tap the mic to retry.' }); }
    });
    return this.queue;
  }
  start() { void this.enqueue(() => this.join()); this.schedule(); }
  private async join() {
    const reply = await this.ports.api({ op: 'join' });
    if (this.ended) return;
    this.config = reply; this.set({ available: reply.available, error: '' });
    if (reply.available) { this.failures = 0; await this.listen(reply); }
  }
  private schedule() {
    if (this.ended) return;
    this.timer = setTimeout(() => {
      void this.enqueue(async () => {
        if (!this.config?.available) await this.join();
        else { const reply = await this.ports.api({ op: 'status' });
          if (!reply.available) { this.muteLocal(); this.receive?.close(); this.receive = undefined; this.receivingKey = ''; this.config = undefined; this.set({ available: false }); }
          else await this.listen(reply); }
      }).finally(() => this.schedule());
    }, !this.config?.available ? Math.min(60_000, VOICE_POLL_MS * 2 ** Math.min(4, this.failures + 1)) : VOICE_POLL_MS);
  }
  private failed = () => {
    this.muteLocal(); this.receive?.close(); this.receive = undefined; this.receivingKey = ''; this.config = undefined;
    this.set({ available: false, error: 'Voice reconnecting. Your mic is muted.' });
  };
  private muteLocal() {
    this.wantedMic = false; this.micRevision++;
    this.publish?.close(); this.publish = undefined;
    this.set({ micMuted: true, busy: false });
  }
  toggleMic() {
    if (this.ended) return;
    if (this.wantedMic) { this.muteLocal(); void this.enqueue(async () => { await this.ports.api({ op: 'mute' }); }); return; }
    this.wantedMic = true; const revision = ++this.micRevision;
    this.set({ busy: true, error: '' });
    void this.enqueue(async () => {
      if (!this.config?.available) await this.join();
      if (!this.config?.available) { this.muteLocal(); this.set({ error: 'Table voice is not available yet.' }); return; }
      if (!this.wantedMic || revision !== this.micRevision || this.ended) return;
      const peer = this.ports.peer(this.config, false, this.failed); this.publish = peer;
      try {
        const offer = await peer.offerMicrophone();
        if (!this.currentMic(peer, revision)) return;
        const reply = await this.ports.api({ op: 'publish', ...offer });
        if (!this.currentMic(peer, revision)) return;
        if (!reply.available || !reply.sessionDescription || !reply.connectionId) throw new Error('Voice unavailable');
        await peer.applyAnswer(reply.sessionDescription); await peer.connected();
        if (!this.currentMic(peer, revision)) return;
        await this.ports.api({ op: 'ready', connectionId: reply.connectionId });
        if (!this.currentMic(peer, revision)) return;
        peer.setMuted(false); this.set({ micMuted: false, busy: false });
      } finally { if (!this.currentMic(peer, revision)) peer.close(); }
    });
  }
  private currentMic(peer: VoicePeer, revision: number) { return !this.ended && this.wantedMic && this.publish === peer && this.micRevision === revision; }
  toggleSpeaker() {
    if (this.ended) return;
    const muted = !this.state.speakerMuted;
    // Apply the receive mask before React renders or network negotiation starts.
    this.receive?.setMuted(muted);
    this.set({ speakerMuted: muted });
  }
  private async listen(reply: VoiceReply) {
    if (this.ended || !this.config?.available || key(reply.publications) === this.receivingKey) return;
    this.receive?.close(); this.receive = undefined; this.receivingKey = '';
    const result = await this.ports.api({ op: 'receive' });
    if (this.ended || !result.available) return;
    if (!result.sessionDescription || !result.connectionId) return;
    const peer = this.ports.peer(this.config, true, this.failed); this.receive = peer;
    peer.setMuted(this.state.speakerMuted);
    const answer = await peer.answer(result.sessionDescription);
    if (this.ended || this.receive !== peer) { peer.close(); return; }
    const accepted = await this.ports.api({ op: 'answer', connectionId: result.connectionId, sessionDescription: answer });
    if (!accepted.available) throw new Error('Voice unavailable');
    await peer.connected();
    if (this.ended || this.receive !== peer) { peer.close(); return; }
    peer.setMuted(this.state.speakerMuted); this.receivingKey = key(result.publications);
  }
  stop() {
    if (this.ended) return;
    this.muteLocal(); this.receive?.close(); this.receive = undefined;
    this.ended = true; clearTimeout(this.timer);
    // Run after in-flight requests: a delayed join must not resurrect membership.
    void this.queue.finally(() => this.ports.api({ op: 'leave' })).catch(() => {});
  }
}
