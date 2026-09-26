import {
  invitationResource,
  refreshInvitations,
  startInvitations,
} from "../online/invitationStore";
import { INVITATION_NOTIFICATION_CHANNEL } from "../../shared/pushNotifications";
import type { TableInvitation } from "../../shared/invitations";
import { startTableVoice } from "../voiceChat/runtime";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Alert,
  AppState,
  DevSettings,
  Linking,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { API_URL } from "../api";
import { request } from "../api";
import CircleDevice from "../../modules/circle-device";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { offlineStore, initializeOffline } from "../state/offlineStore";
import { audioStore } from "../state/audioStore";
import { onlineStore, initializeOnline } from "../online/onlineStore";
import { startDeviceRecording } from "../online/deviceRegistration";
import { setGameUi } from "../online/device";
import { savedInvite } from "../online/storage";
import { parseInvite } from "../online/invites";
import { useAppUpdates } from "../updates/UpdateRoot";
import { warmGameArtwork } from "../components/gameAssets";
import { useVoice } from "../useVoice";
import { navigationStore, pushScreen } from "./router";
import { useScreenAppeared, useScreenActive } from "./ScreenContext";
import { initializeLanguage, languageStore } from "../i18n";
import { t as tr } from "../i18n";
import { FirstLanguagePicker } from "../i18n/LanguagePicker";
import { getMessaging, RemoteMessage } from "@react-native-firebase/messaging";

const noSubscription = () => () => {};
const permitted = () => true;

/** Home is the retained native root: audio, deep links and startup run exactly once. */
export function ApplicationServices() {
  const active = useScreenActive();
  const appeared = useScreenAppeared();
  const identityLoaded = useStore(onlineStore, (s) => s.loaded);
  const invitationKey = useStore(onlineStore, (s) =>
    s.identity?.profile ? s.identity.key : undefined,
  );
  const invitationSnapshot = useStore(
    invitationResource.store,
    useShallow((s) => ({ data: s.data, loaded: s.loaded })),
  );
  const languageSelected = useStore(languageStore, (s) => s.selected);
  const [pendingInvite, setPendingInvite] =
    useState<ReturnType<typeof parseInvite>>(null);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [popupRevision, setPopupRevision] = useState(0);
  const invitationSession = useRef<string | undefined>(undefined);
  const seenInvitationIds = useRef(new Set<string>());
  const popupQueue = useRef<TableInvitation[]>([]);
  const popupVisible = useRef(false);
  const notificationPermissionPrompted = useRef(false);
  const preferences = useStore(offlineStore, (s) => s.local.preferences);
  const route = useStore(navigationStore, (s) => s.name);
  const game = useStore(
    onlineStore,
    useShallow((s) => ({
      phase: s.snapshot?.phase,
      round: s.snapshot?.roundId,
      call: s.snapshot?.calls.at(-1),
      count: s.snapshot?.calls.length,
      at: s.snapshot?.lastCallAt,
      now: s.snapshot?.serverNow,
      connected: s.connected,
    })),
  );
  const updates = useAppUpdates();
  const allowed = useSyncExternalStore(
    updates?.subscribe ?? noSubscription,
    updates
      ? () =>
          updates.state.permitted &&
          !updates.state.details &&
          !updates.state.success
      : permitted,
  );
  useEffect(() => {
    if (!allowed || !invitationKey) {
      invitationSession.current = undefined;
      seenInvitationIds.current.clear();
      popupQueue.current = [];
      return;
    }
    invitationSession.current = invitationKey;
    seenInvitationIds.current.clear();
    popupQueue.current = [];
    const stop = startInvitations(invitationKey);
    return () => {
      stop();
      if (invitationSession.current === invitationKey) {
        invitationSession.current = undefined;
        popupQueue.current = [];
      }
    };
  }, [allowed, invitationKey]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!allowed || !invitationKey || Platform.OS !== "android") return;
    let active = true;
    let configured = false;
    let configuring = false;
    let tokenRetry: ReturnType<typeof setTimeout> | undefined;
    let tokenRetryCount = 0;
    const unsubscribe: (() => void)[] = [];
    const registerToken = async (token: string) => {
      if (!active) return;
      try {
        await request("/v2/me/push-token", {
          token: invitationKey,
          method: "POST",
          body: { token, platform: "android" },
        });
        clearTimeout(tokenRetry);
        tokenRetry = undefined;
        tokenRetryCount = 0;
      } catch (error) {
        console.warn("[push] token registration failed", {
          name: error instanceof Error ? error.name : typeof error,
        });
        if (active && tokenRetry === undefined) {
          const delay = Math.min(60_000, 5_000 * 2 ** tokenRetryCount++);
          tokenRetry = setTimeout(() => {
            tokenRetry = undefined;
            void registerToken(token);
          }, delay);
        }
      }
    };
    const openInvitationsFromPush = (
      message: {
        data?: Record<string, string>;
      } | null,
    ) => {
      if (message?.data?.type !== "invitation") return;
      void refreshInvitations(true);
      pushScreen("Invitations", {}, "circle-home");
    };
    const setupMessaging = async () => {
      if (
        !active ||
        configured ||
        configuring ||
        AppState.currentState !== "active"
      )
        return;
      configuring = true;
      try {
        await CircleDevice.createNotificationChannel?.(
          INVITATION_NOTIFICATION_CHANNEL,
          tr("Table invitations"),
          tr("Notifications for table invites"),
        );
        if (Number(Platform.Version) >= 33) {
          let granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (!granted && !notificationPermissionPrompted.current) {
            notificationPermissionPrompted.current = true;
            granted =
              (await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                {
                  title: tr("Allow notifications?"),
                  message: tr(
                    "Get notified when someone invites you to a table.",
                  ),
                  buttonPositive: tr("Allow"),
                  buttonNegative: tr("Not now"),
                },
              )) === PermissionsAndroid.RESULTS.GRANTED;
          }
          if (!granted) return;
        }

        const client = getMessaging();
        await client.registerDeviceForRemoteMessages();
        if (!active) return;
        unsubscribe.push(
          client.onTokenRefresh((token: string) => {
            void registerToken(token);
          }),
          client.onMessage((message: RemoteMessage) => {
            if (message.data?.type === "invitation")
              void refreshInvitations(true);
          }),
          client.onNotificationOpenedApp((message: RemoteMessage) =>
            openInvitationsFromPush(message.data || null),
          ),
        );
        configured = true;
        try {
          await registerToken(await client.getToken());
        } catch (error) {
          console.warn("[push] FCM token unavailable", {
            name: error instanceof Error ? error.name : typeof error,
          });
        }
        const initial = await client.getInitialNotification();
        if (active) openInvitationsFromPush(initial?.data || null);
      } catch (error) {
        if (active)
          console.warn("[push] setup failed", {
            name: error instanceof Error ? error.name : typeof error,
          });
      } finally {
        configuring = false;
      }
    };
    void setupMessaging();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void setupMessaging();
    });
    return () => {
      active = false;
      clearTimeout(tokenRetry);
      appState.remove();
      unsubscribe.forEach((remove) => remove());
    };
  }, [allowed, invitationKey]);
  useEffect(() => {
    if (
      !allowed ||
      !invitationKey ||
      invitationSession.current !== invitationKey ||
      !invitationSnapshot.loaded
    )
      return;
    let added = false;
    for (const invitation of invitationSnapshot.data) {
      if (
        invitation.status !== "pending" ||
        seenInvitationIds.current.has(invitation.id)
      )
        continue;
      seenInvitationIds.current.add(invitation.id);
      popupQueue.current.push(invitation);
      added = true;
    }
    if (added) setPopupRevision((revision) => revision + 1);
  }, [allowed, invitationKey, invitationSnapshot]);
  const liveTableScreen =
    route === "Caller" ||
    (["Table", "Numbers", "Players"].includes(route) &&
      !!game.phase &&
      game.phase !== "lobby" &&
      game.phase !== "finished");
  useEffect(() => {
    if (
      !allowed ||
      !appeared ||
      !foreground ||
      liveTableScreen ||
      popupVisible.current
    )
      return;
    const invitation = popupQueue.current.shift();
    if (!invitation) return;
    popupVisible.current = true;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      popupVisible.current = false;
      setTimeout(() => setPopupRevision((revision) => revision + 1), 400);
    };
    Alert.alert(
      tr("{name} invited you to play", { name: invitation.sender.name }),
      invitation.tableName,
      [
        { text: tr("Cancel"), style: "cancel", onPress: finish },
        {
          text: tr("Invitations"),
          onPress: () => {
            pushScreen("Invitations", {}, "circle-home");
            finish();
          },
        },
      ],
      { cancelable: true, onDismiss: finish },
    );
  }, [allowed, appeared, foreground, liveTableScreen, popupRevision]);
  useEffect(() => {
    if (allowed) return startTableVoice();
  }, [allowed]);
  const playing =
    allowed &&
    (route === "Caller" ||
      (!!game.phase && ["live", "claim"].includes(game.phase)));
  const voice = useVoice(
    preferences.sound,
    preferences.voice,
    preferences.callPause,
    playing,
  );
  const announced = useRef("");
  useEffect(() => {
    audioStore.setState(voice);
  }, [voice.speak, voice.stop, voice.isSpeaking, voice.preparing, voice.error]);
  useEffect(() => {
    void initializeLanguage();
    initializeOffline();
    initializeOnline();
    void warmGameArtwork();
    if (__DEV__ && API_URL === "http://127.0.0.1:8791")
      DevSettings.addMenuItem("Preview registration", () =>
        pushScreen("Registration"),
      );
    return Platform.OS === "ios" ? startDeviceRecording() : undefined;
  }, []);
  useEffect(() => {
    if (
      !allowed ||
      game.phase !== "live" ||
      !game.connected ||
      route === "Voices"
    ) {
      if (route !== "Caller" && route !== "Voices") voice.stop();
      return;
    }
    const key = `${game.round}:${game.count}`;
    if (game.call && announced.current !== key) {
      announced.current = key;
      if (game.at && (game.now ?? 0) - game.at < 2800) voice.speak(game.call);
    }
  }, [game, allowed, route, voice.speak, voice.stop]);
  useEffect(() => {
    const immersive =
      ["Table", "Numbers", "Players"].includes(route) &&
      !!game.phase &&
      game.phase !== "lobby";
    void setGameUi(immersive, playing).catch(() => {});
  }, [route, game.phase, playing]);
  useEffect(() => {
    if (!allowed) voice.stop();
  }, [allowed, voice.stop]);
  useEffect(() => {
    const receive = (url: string) => {
      const invite = parseInvite(url);
      if (!invite) return;
      void savedInvite.set(url);
      setPendingInvite(invite);
    };
    void Linking.getInitialURL().then((url) => {
      if (url) receive(url);
    });
    const listener = Linking.addEventListener("url", (event) =>
      receive(event.url),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    // Cold links must wait for saved sign-in, the native root, and the update gate.
    if (
      !pendingInvite ||
      !identityLoaded ||
      !languageSelected ||
      !allowed ||
      !appeared
    )
      return;
    pushScreen(
      onlineStore.getState().identity?.profile ? "JoinTable" : "Registration",
      { invite: pendingInvite },
    );
    setPendingInvite(null);
  }, [pendingInvite, identityLoaded, languageSelected, allowed, appeared]);
  return <FirstLanguagePicker allowed={allowed && !!active} />;
}
