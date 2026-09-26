import {
  AppState,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
} from "react-native";
import CircleDevice from "../../modules/circle-device";
import { request } from "../api";
import { randomUUID } from "../native/crypto";
import { onlineStore } from "../online/onlineStore";
import { VoiceController } from "./controller";
import { nativeVoicePeer } from "./nativePeer";
import { tableVoiceState } from "./state";
import type { VoiceReply } from "../../shared/tableVoice";

const ensureMicrophonePermission = async () => {
  if (Platform.OS === "android") {
    const status = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (status) return; // granted already

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED)
      throw new Error("Microphone permission denied");
    return;
  }

  if (Platform.OS === "ios") {
    const granted = await CircleDevice.requestMicrophonePermission?.();
    if (!granted) throw new Error("Microphone permission denied");
  }
};

let current: VoiceController | undefined;
let microphoneRequestPending = false;
let resyncVoiceLifecycle: (() => void) | undefined;
let currentTableId: string | null = null;
let pendingMicIntent:
  | {
      tableId: string | null;
      permissionGranted: boolean;
      timeout?: ReturnType<typeof setTimeout>;
    }
  | undefined;

function clearPendingMicIntent(intent = pendingMicIntent) {
  if (!intent) return;
  clearTimeout(intent.timeout);
  if (pendingMicIntent === intent) pendingMicIntent = undefined;
}

function activatePendingMic() {
  const intent = pendingMicIntent;
  if (
    !intent?.permissionGranted ||
    !intent.tableId ||
    !current ||
    currentTableId !== intent.tableId
  )
    return false;
  clearPendingMicIntent(intent);
  current.toggleMic();
  return true;
}

export function toggleTableMic() {
  const state = tableVoiceState.getState();
  if (!state.micMuted) {
    current?.toggleMic();
    return;
  }
  if (state.busy || microphoneRequestPending) return;
  const tableId = state.tableId ?? onlineStore.getState().snapshot?.id ?? null;
  const intent = { tableId, permissionGranted: false };
  clearPendingMicIntent();
  pendingMicIntent = intent;
  microphoneRequestPending = true;
  tableVoiceState.setState({ busy: true, error: "" });
  void ensureMicrophonePermission()
    .then(() => {
      if (pendingMicIntent !== intent) return;
      intent.permissionGranted = true;
      resyncVoiceLifecycle?.();
      if (!activatePendingMic())
        intent.timeout = setTimeout(() => {
          if (pendingMicIntent !== intent) return;
          clearPendingMicIntent(intent);
          if (tableVoiceState.getState().tableId === tableId)
            tableVoiceState.setState({
              error: "Voice unavailable. Tap the mic to retry.",
              micMuted: true,
              busy: false,
            });
        }, 5_000);
    })
    .catch((err) => {
      if (pendingMicIntent !== intent) return;
      clearPendingMicIntent(intent);
      if (tableVoiceState.getState().tableId !== tableId) return;
      console.error("Microphone permission error", err);
      tableVoiceState.setState({
        error:
          "Could not connect voice. Check microphone permission and your connection, then tap the mic to retry.",
        micMuted: true,
        busy: false,
      });
    })
    .finally(() => {
      microphoneRequestPending = false;
      resyncVoiceLifecycle?.();
    });
}
export function toggleTableSpeaker() {
  if (current) current.toggleSpeaker();
  else tableVoiceState.setState((s) => ({ speakerMuted: !s.speakerMuted }));
}

/** Mounted once by the retained native root, not by individual pushed screens. */
export function startTableVoice() {
  let tableId: string | null = null,
    sessionKey = "",
    speakerMuted = false;
  function sync() {
    const s = onlineStore.getState(),
      snapshot = s.snapshot;
    const member = snapshot?.members[snapshot.viewerId];
    const nextTable =
      snapshot && member && !member.left && !member.removed
        ? snapshot.id
        : null;
    if (pendingMicIntent) {
      if (!pendingMicIntent.tableId && nextTable)
        pendingMicIntent.tableId = nextTable;
      else if (pendingMicIntent.tableId !== nextTable) clearPendingMicIntent();
    }
    const changedTable = nextTable !== tableId;
    speakerMuted = changedTable
      ? false
      : tableVoiceState.getState().speakerMuted;
    tableId = nextTable;
    const key =
      tableId &&
      s.identity?.key &&
      s.connected &&
      (AppState.currentState === "active" || microphoneRequestPending)
        ? `${tableId}:${s.identity.key}`
        : "";
    if (key === sessionKey && !changedTable) {
      activatePendingMic();
      return;
    }
    const previous = current;
    current = undefined;
    currentTableId = null;
    previous?.stop();
    sessionKey = key;
    tableVoiceState.setState({
      tableId,
      micMuted: true,
      speakerMuted,
      busy: false,
      available: false,
      error: "",
    });
    if (!key || !tableId || !s.identity?.key) return;
    const token = s.identity.key,
      id = tableId,
      clientId = randomUUID();
    const controller = new VoiceController(
      {
        api: (body) =>
          request<VoiceReply>(`/v2/tables/${id}/voice`, {
            token,
            method: "POST",
            body: { ...body, clientId },
            timeoutMs: 25_000,
          }),
        peer: nativeVoicePeer,
        platform: Platform.OS,
        changed: (state) => {
          if (current === controller) {
            speakerMuted = state.speakerMuted;
            tableVoiceState.setState({ ...state, tableId: id });
          }
        },
      },
      speakerMuted,
    );
    current = controller;
    currentTableId = id;
    controller.start();
    activatePendingMic();
  }
  resyncVoiceLifecycle = sync;
  const unsubscribe = onlineStore.subscribe(sync);
  const appState = AppState.addEventListener("change", sync);
  const interrupt = new NativeEventEmitter(CircleDevice).addListener(
    "CircleAudioInterrupted",
    () => {
      current?.stop();
      current = undefined;
      currentTableId = null;
      clearPendingMicIntent();
      sessionKey = "";
      tableVoiceState.setState({
        micMuted: true,
        busy: false,
        available: false,
      });
      // Recovery occurs on next table heartbeat; capture remains off.
    },
  );
  sync();
  return () => {
    if (resyncVoiceLifecycle === sync) resyncVoiceLifecycle = undefined;
    unsubscribe();
    appState.remove();
    interrupt.remove();
    current?.stop();
    current = undefined;
    currentTableId = null;
    clearPendingMicIntent();
    tableVoiceState.setState({
      tableId: null,
      micMuted: true,
      speakerMuted: false,
      busy: false,
      available: false,
      error: "",
    });
  };
}
