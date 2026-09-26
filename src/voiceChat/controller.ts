import {
  VOICE_POLL_MS,
  type VoiceDescription,
  type VoicePublication,
  type VoiceReply,
  type VoiceRequest,
} from "../../shared/tableVoice";

export type VoiceState = {
  micMuted: boolean;
  speakerMuted: boolean;
  busy: boolean;
  available: boolean;
  error: string;
};
export interface VoicePeer {
  offerMicrophone(): Promise<{
    sessionDescription: VoiceDescription;
    mid: string;
  }>;
  applyAnswer(description: VoiceDescription): Promise<void>;
  answer(description: VoiceDescription): Promise<VoiceDescription>;
  connected(): Promise<void>;
  setMuted(muted: boolean): void;
  close(): void;
}
export type VoicePorts = {
  api(body: Omit<VoiceRequest, "clientId">): Promise<VoiceReply>;
  peer(reply: VoiceReply, receive: boolean, failed: () => void): VoicePeer;
  changed(state: VoiceState): void;
  platform: string;
};
const key = (p: VoicePublication[] = []) =>
  p
    .map((x) => x.id)
    .sort()
    .join(",");

function withoutUdpTurn(reply: VoiceReply) {
  let changed = false;
  const iceServers = (reply.iceServers ?? []).flatMap((server) => {
    const urls =
      typeof server.urls === "string" ? [server.urls] : server.urls ?? [];
    const selected = urls.filter(
      (url) =>
        !/^turn:/i.test(url) || /[?&]transport=tcp(?:&|$)/i.test(url),
    );
    changed ||= selected.length !== urls.length;
    return selected.length ? [{ ...server, urls: selected }] : [];
  });
  return { reply: { ...reply, iceServers }, changed };
}

function isIceTimeout(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "ICE candidate gathering timed out" ||
      error.message === "Voice connection timed out")
  );
}

/** One table session. Cancellation is synchronous; negotiation is serialized. */
export class VoiceController {
  state: VoiceState = {
    micMuted: true,
    speakerMuted: false,
    busy: false,
    available: false,
    error: "",
  };
  private ended = false;
  private wantedMic = false;
  private micRevision = 0;
  private publish?: VoicePeer;
  private receive?: VoicePeer;
  private receivingKey = "";
  private config?: VoiceReply;
  private timer?: ReturnType<typeof setTimeout>;
  private queue = Promise.resolve();
  private failures = 0;
  private phase = "join";
  constructor(
    private ports: VoicePorts,
    speakerMuted = false,
  ) {
    this.state.speakerMuted = speakerMuted;
  }
  private set(patch: Partial<VoiceState>) {
    if (!this.ended) {
      this.state = { ...this.state, ...patch };
      this.ports.changed(this.state);
    }
  }
  private closePeer(peer?: VoicePeer) {
    if (!peer) return;
    try {
      peer.close();
    } catch (error) {
      console.error("[table-voice] peer close failed", {
        name: error instanceof Error ? error.name : typeof error,
      });
    }
  }
  private setPeerMuted(peer: VoicePeer, muted: boolean) {
    try {
      peer.setMuted(muted);
      return true;
    } catch (error) {
      console.error("[table-voice] peer mute update failed", {
        name: error instanceof Error ? error.name : typeof error,
      });
      return false;
    }
  }
  private enqueue(fn: () => Promise<void>) {
    this.queue = this.queue
      .then(async () => {
        if (!this.ended) await fn();
      })
      .catch((err) => {
        if (!this.ended) {
          const error = err instanceof Error ? err : new Error(String(err));
          const status =
            typeof err === "object" &&
            err !== null &&
            "status" in err &&
            typeof err.status === "number"
              ? err.status
              : undefined;
          const detail =
            typeof err === "object" &&
            err !== null &&
            "data" in err &&
            typeof err.data === "object" &&
            err.data !== null &&
            "error" in err.data &&
            typeof err.data.error === "string"
              ? err.data.error
              : undefined;
          console.error("[table-voice] operation failed", {
            phase: this.phase,
            name: error.name,
            ...(status === undefined ? {} : { status }),
            ...(detail === undefined ? {} : { serverDetail: detail }),
          });
          this.muteLocal();
          this.closePeer(this.receive);
          this.receive = undefined;
          this.receivingKey = "";
          this.config = undefined;
          this.failures++;
          this.set({
            busy: false,
            available: false,
            error: `Voice unavailable. Tap the mic to retry. ${err}`,
          });
        }
      });
    return this.queue;
  }
  start() {
    void this.enqueue(() => this.join());
    this.schedule();
  }
  private async join() {
    this.phase = "join";
    const reply = await this.ports.api({ op: "join" });
    if (this.ended) return;
    this.config = reply;
    this.set({ available: reply.available, error: "" });
    if (reply.available) {
      this.failures = 0;
      await this.listen(reply);
    }
  }
  private schedule() {
    if (this.ended) return;
    this.timer = setTimeout(
      () => {
        void this.enqueue(async () => {
          if (!this.config?.available) await this.join();
          else {
            this.phase = "status";
            const reply = await this.ports.api({ op: "status" });
            if (!reply.available) {
              this.muteLocal();
              this.closePeer(this.receive);
              this.receive = undefined;
              this.receivingKey = "";
              this.config = undefined;
              this.set({ available: false });
            } else await this.listen(reply);
          }
        }).finally(() => this.schedule());
      },
      !this.config?.available
        ? Math.min(60_000, VOICE_POLL_MS * 2 ** Math.min(4, this.failures + 1))
        : VOICE_POLL_MS,
    );
  }
  private failed = () => {
    console.error("[table-voice] peer connection failed", {
      phase: this.phase,
    });
    this.muteLocal();
    this.closePeer(this.receive);
    this.receive = undefined;
    this.receivingKey = "";
    this.config = undefined;
    this.set({
      available: false,
      error: "Voice reconnecting. Your mic is muted.",
    });
  };
  private muteLocal() {
    this.wantedMic = false;
    this.micRevision++;
    this.closePeer(this.publish);
    this.publish = undefined;
    this.set({ micMuted: true, busy: false });
  }
  toggleMic() {
    if (this.ended) return;
    if (this.wantedMic) {
      this.muteLocal();
      void this.enqueue(async () => {
        this.phase = "mute";
        await this.ports.api({ op: "mute" });
      });
      return;
    }
    this.wantedMic = true;
    const revision = ++this.micRevision;
    this.set({ busy: true, error: "" });
    void this.enqueue(async () => {
      if (!this.config?.available) await this.join();
      if (!this.config?.available) {
        this.muteLocal();
        this.set({ error: "Table voice is not available yet." });
        return;
      }
      if (!this.wantedMic || revision !== this.micRevision || this.ended)
        return;
      const fullReply = this.config;
      const canUseFastIcePath =
        this.ports.platform === "android" || this.ports.platform === "ios";
      const primary =
        canUseFastIcePath
          ? withoutUdpTurn(fullReply)
          : { reply: fullReply, changed: false };
      await this.publishMicAttempt(
        primary.reply,
        fullReply,
        revision,
        canUseFastIcePath && primary.changed,
      );
    });
  }
  private currentMic(peer: VoicePeer, revision: number) {
    return (
      !this.ended &&
      this.wantedMic &&
      this.publish === peer &&
      this.micRevision === revision
    );
  }
  private micIntentCurrent(revision: number) {
    return !this.ended && this.wantedMic && this.micRevision === revision;
  }
  private async publishMicAttempt(
    reply: VoiceReply,
    fullReply: VoiceReply,
    revision: number,
    canRetryWithAllIce: boolean,
  ): Promise<boolean> {
    let handleConnectionFailure = !canRetryWithAllIce;
    const peer = this.ports.peer(reply, false, () => {
      if (handleConnectionFailure) this.failed();
    });
    this.publish = peer;
    let publishRequested = false;
    try {
      this.phase = "capture-offer";
      const offer = await peer.offerMicrophone();
      if (!this.currentMic(peer, revision)) return false;
      this.phase = "publish";
      publishRequested = true;
      const result = await this.ports.api({ op: "publish", ...offer });
      if (!this.currentMic(peer, revision)) return false;
      if (
        !result.available ||
        !result.sessionDescription ||
        !result.connectionId
      )
        throw new Error("Voice unavailable");
      this.phase = "apply-publish-answer";
      await peer.applyAnswer(result.sessionDescription);
      this.phase = "publisher-connect";
      await peer.connected();
      handleConnectionFailure = true;
      if (!this.currentMic(peer, revision)) return false;
      this.phase = "ready";
      await this.ports.api({ op: "ready", connectionId: result.connectionId });
      if (!this.currentMic(peer, revision)) return false;
      if (!this.setPeerMuted(peer, false))
        throw new Error("Could not enable microphone track");
      this.set({ micMuted: false, busy: false });
      return true;
    } catch (error) {
      const retryWithAllIce =
        canRetryWithAllIce &&
        this.micIntentCurrent(revision) &&
        isIceTimeout(error);
      this.closePeer(peer);
      if (this.publish === peer) this.publish = undefined;
      if (!this.micIntentCurrent(revision)) return false;
      if (publishRequested) {
        if (retryWithAllIce) this.phase = "ice-fallback-cleanup";
        try {
          await this.ports.api({ op: "mute" });
        } catch (cleanupError) {
          console.warn("[table-voice] failed attempt cleanup failed", {
            name:
              cleanupError instanceof Error
                ? cleanupError.name
                : typeof cleanupError,
          });
        }
      }
      if (!this.micIntentCurrent(revision)) return false;
      if (retryWithAllIce) {
        console.warn(
          "[table-voice] retrying microphone with the full ICE server list",
          { reason: error instanceof Error ? error.message : "ICE failure" },
        );
        return this.publishMicAttempt(fullReply, fullReply, revision, false);
      }
      throw error;
    } finally {
      if (this.publish !== peer) this.closePeer(peer);
    }
  }
  toggleSpeaker() {
    if (this.ended) return;
    const muted = !this.state.speakerMuted;
    // Apply the receive mask before React renders or network negotiation starts.
    if (this.receive && !this.setPeerMuted(this.receive, muted)) return;
    this.set({ speakerMuted: muted });
  }
  private async listen(reply: VoiceReply) {
    if (
      this.ended ||
      !this.config?.available ||
      key(reply.publications) === this.receivingKey
    )
      return;
    this.closePeer(this.receive);
    this.receive = undefined;
    this.receivingKey = "";
    this.phase = "receive";
    const result = await this.ports.api({ op: "receive" });
    if (this.ended || !result.available) return;
    if (!result.sessionDescription || !result.connectionId) return;
    const peer = this.ports.peer(this.config, true, this.failed);
    this.receive = peer;
    if (!this.setPeerMuted(peer, this.state.speakerMuted))
      throw new Error("Could not update speaker state");
    this.phase = "create-receive-answer";
    const answer = await peer.answer(result.sessionDescription);
    if (this.ended || this.receive !== peer) {
      this.closePeer(peer);
      return;
    }
    this.phase = "answer";
    const accepted = await this.ports.api({
      op: "answer",
      connectionId: result.connectionId,
      sessionDescription: answer,
    });
    if (!accepted.available) throw new Error("Voice unavailable");
    this.phase = "receiver-connect";
    await peer.connected();
    if (this.ended || this.receive !== peer) {
      this.closePeer(peer);
      return;
    }
    if (!this.setPeerMuted(peer, this.state.speakerMuted))
      throw new Error("Could not update speaker state");
    this.receivingKey = key(result.publications);
  }
  stop() {
    if (this.ended) return;
    this.muteLocal();
    this.closePeer(this.receive);
    this.receive = undefined;
    this.ended = true;
    clearTimeout(this.timer);
    // Run after in-flight requests: a delayed join must not resurrect membership.
    void this.queue
      .finally(() => {
        this.phase = "leave";
        return this.ports.api({ op: "leave" });
      })
      .catch(() => {});
  }
}
