// Browser-only design preview. Native navigation is registered by index.js.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Linking,
  Platform,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Crypto from "./src/native/crypto";
import { SHARE_URL } from './src/config';
import { useAppState } from "./src/useAppState";
import { drawNumber, uniformInt } from "./src/game";
import { useVoice } from "./src/useVoice";
import { useOnline } from './src/online/useOnline';
import { GamePreferencesSheet } from './src/online/Extras';
import { HomeScreen } from "./src/components/HomeScreen";
import { CallerScreen } from "./src/components/CallerScreen";
import {
  AccountDialog,
  Button,
  Dialog,
  GameMenu,
  SettingsDialog,
  styles as dialogStyles,
} from "./src/components/Dialogs";
import type { Preferences } from "./shared/preferences";
import { OnlineApp, parseInvite } from "./src/online/OnlineApp";
import { savedInvite } from "./src/online/storage";
import { setGameUi } from "./src/online/device";
import { startDeviceRecording } from "./src/online/deviceRegistration";
import { AndroidUpdateRoot } from './src/updates/UpdateRoot';
import { API_URL } from './src/api';
import { warmGameArtwork } from './src/components/gameAssets';

function TambolaApp() {
  useEffect(() => { void warmGameArtwork(); }, []);
  useEffect(() => Platform.OS === 'ios' ? startDeviceRecording() : undefined, []);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = Math.min(windowWidth, 576);
  const height = windowHeight - insets.top - insets.bottom;
  const model = useAppState();
  const onlineModel = useOnline();
  const [screen, setScreen] = useState<"home" | "caller" | "online">("home");
  const [onlineGameActive, setOnlineGameActive] = useState(false);
  const [onlineStart, setOnlineStart] = useState<
    "home" | "profile" | "coins"
  >("home");
  const [dialog, setDialog] = useState<
    "menu" | "settings" | "account" | "share" | null
  >(null);
  const [running, setRunning] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef(model.local.history);
  const activeRef = useRef(false);
  const lastDraw = useRef(0);
  const {
    speak,
    stop,
    isSpeaking,
    preparing: voicePreparing,
    error: audioError,
  } = useVoice(
    model.local.preferences.sound,
    model.local.preferences.voice,
    model.local.preferences.callPause,
    screen === "caller" || onlineGameActive,
  );
  useEffect(() => {
    const receive = (url: string) => {
      if (parseInvite(url)) {
        void savedInvite.set(url);
        setScreen("online");
      }
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
    if (screen !== "online")
      void setGameUi(false, screen === "caller").catch(() => {});
  }, [screen]);
  useEffect(() => {
    historyRef.current = model.local.history;
  }, [model.local.history]);
  const pause = useCallback(() => {
    activeRef.current = false;
    setRunning(false);
    stop();
  }, [stop]);

  const next = useCallback(() => {
    if (model.local.preferences.sound && voicePreparing) return;
    // A quick double-tap should never consume two numbers or clip a new announcement.
    if (Date.now() - lastDraw.current < 400) return;
    const n = drawNumber(historyRef.current, (max) =>
      uniformInt(max, () => Crypto.getRandomBytes(1)[0]!),
    );
    if (n === null) {
      activeRef.current = false;
      setRunning(false);
      return;
    }
    lastDraw.current = Date.now();
    const history = [...historyRef.current, n];
    historyRef.current = history;
    model.updateHistory(history);
    speak(n);
    if (history.length === 90) {
      activeRef.current = false;
      setRunning(false);
    }
  }, [
    model.updateHistory,
    model.local.preferences.sound,
    model.local.preferences.voice,
    voicePreparing,
    speak,
  ]);

  useEffect(() => {
    if (
      !running ||
      !model.local.preferences.auto ||
      screen !== "caller" ||
      dialog ||
      historyOpen
    )
      return;
    const delay = model.local.preferences.speed * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const advanceWhenReady = () => {
      if (!activeRef.current) return;
      if (isSpeaking()) {
        timer = setTimeout(advanceWhenReady, 100);
        return;
      }
      next();
    };
    timer = setTimeout(advanceWhenReady, delay);
    return () => clearTimeout(timer);
  }, [
    running,
    model.local.preferences.auto,
    model.local.preferences.speed,
    model.local.history.length,
    screen,
    dialog,
    historyOpen,
    next,
    isSpeaking,
  ]);
  useEffect(() => {
    if (!model.local.preferences.auto) pause();
  }, [model.local.preferences.auto, pause]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") pause();
    });
    return () => listener.remove();
  }, [pause]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (dialog) return false; // Native Modal owns dismissal.
      if (historyOpen) {
        setHistoryOpen(false);
        return true;
      }
      if (screen === "caller") {
        pause();
        setDialog("menu");
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [screen, dialog, historyOpen, pause]);

  function openDialog(nextDialog: typeof dialog) {
    pause();
    setHistoryOpen(false);
    setDialog(nextDialog);
  }
  function updatePreferences(patch: Partial<Preferences>) {
    if (patch.auto !== undefined) pause();
    model.updatePreferences(patch);
  }
  function play() {
    if (running) {
      pause();
      return;
    }
    if (historyRef.current.length >= 90) return;
    if (model.local.preferences.sound && voicePreparing) return;
    activeRef.current = true;
    setRunning(true);
    next();
  }
  function restart() {
    pause();
    historyRef.current = [];
    lastDraw.current = 0;
    model.updateHistory([]);
    setHistoryOpen(false);
    setDialog(null);
  }
  const shareUrl = SHARE_URL.trim() || (API_URL ? API_URL + '/download/android' : '');
  const shareText = `Let’s play Tambola Circle! Your people. Your game.${shareUrl ? ` ${shareUrl}` : ""}`;
  async function share() {
    try {
      await Share.share({ title: "Tambola Circle", message: shareText });
    } catch {
      // Closing native sharing leaves the current screen unchanged.
    }
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: screen === "caller" ? "#000" : "#290435",
          paddingTop: screen === "online" ? 0 : insets.top,
          paddingBottom: screen === "online" ? 0 : insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />
      {!model.ready ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#efd080" />
          <Text style={styles.loadingText}>Tambola Circle</Text>
        </View>
      ) : (
        <>
          {screen === "home" ? (
            <View
              style={{ flex: 1, width }}
            >
              <HomeScreen
                width={width}
                height={height}
                username={onlineModel.identity?.profile?.name}
                avatarId={onlineModel.identity?.profile?.avatarId}
                balance={onlineModel.wallet?.balance}
                onCoins={() => { setOnlineStart("coins"); setScreen("online"); }}
                onStart={() => {
                  if (historyRef.current.length === 90) restart();
                  setScreen("caller");
                }}
                onOnline={() => {
                  pause();
                  setOnlineStart("home");
                  setScreen("online");
                }}
                onSettings={() => openDialog("settings")}
                onAccount={() => {
                  pause();
                  setOnlineStart("profile");
                  setScreen("online");
                }}
                onShare={() => {
                  void share();
                }}
              />
            </View>
          ) : screen === "online" ? (
            <View style={{ flex: 1, width }}>
              <OnlineApp
                model={onlineModel}
                initialMode={onlineStart}
                sound={model.local.preferences.sound}
                onSound={sound => updatePreferences({ sound })}
                audioError={audioError}
                onHome={() => {
                  stop();
                  setScreen("home");
                }}
                onOffline={() => {
                  stop();
                  setScreen("caller");
                }}
                onCall={speak}
                onStop={stop}
                onGameplay={setOnlineGameActive}
              />
            </View>
          ) : (
            <CallerScreen
              width={width}
              height={height}
              preferences={model.local.preferences}
              history={model.local.history}
              running={running}
              historyOpen={historyOpen}
              audioError={audioError}
              voicePreparing={voicePreparing && model.local.preferences.sound}
              onPreferences={updatePreferences}
              onMenu={() => openDialog("menu")}
              onHistory={() => {
                pause();
                setHistoryOpen(!historyOpen);
              }}
              onPlay={play}
              onNext={next}
              onRepeat={() => {
                const current = historyRef.current.at(-1);
                if (current) {
                  pause();
                  speak(current, true);
                }
              }}
              onReplay={(n) => speak(n, true)}
            />
          )}
          {!!model.saveError && (
            <View style={styles.saveError}>
              <Text
                accessibilityLiveRegion="polite"
                style={{ fontSize: 12, color: "#8b1a29", textAlign: "center" }}
              >
                {model.saveError}
              </Text>
            </View>
          )}
          {dialog === "menu" && (
            <GameMenu
              width={width}
              onClose={() => setDialog(null)}
              onRestart={restart}
              onHome={() => {
                // Leaving the caller ends this round, including the saved history.
                restart();
                setScreen("home");
              }}
            />
          )}
          {dialog === "settings" && (
            <GamePreferencesSheet onClose={() => { stop(); setDialog(null); }} sound={model.local.preferences.sound} onSound={sound => updatePreferences({ sound })} onPreview={() => speak(23, true)} onReplay={model.local.history.length ? () => speak(model.local.history.at(-1)!, true) : undefined} />
          )}
          {dialog === "account" && (
            <AccountDialog model={model} onClose={() => setDialog(null)} />
          )}
          {dialog === "share" && (
            <Dialog
              title="Share Tambola Circle"
              onClose={() => setDialog(null)}
            >
              <Text selectable style={dialogStyles.intro}>
                {shareText}
              </Text>
              <Button onPress={() => setDialog(null)}>Done</Button>
            </Dialog>
          )}
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AndroidUpdateRoot><TambolaApp /></AndroidUpdateRoot>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#18051e", alignItems: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  loadingText: { color: "#f2d486", fontSize: 27, fontFamily: "serif" },
  saveError: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    padding: 10,
    backgroundColor: "#ffe8e8",
    borderRadius: 8,
  },
});
