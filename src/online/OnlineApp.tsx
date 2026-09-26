import { t as tr, useLanguage } from "../i18n";
import { GameBackground } from "../components/GameArtwork";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Action, color, Text, View, ui } from "./components";
import { OnlineEntry } from "./OnlineEntry";
import { TableScreen } from "./TableScreen";
import { savedInvite } from "./storage";
import type { OnlineModel } from "./useOnline";
import { setGameUi } from "./device";
import { ExitGameDialog } from "./ExitGameDialog";

import { parseInvite } from "./invites";
export { parseInvite } from "./invites";
export function OnlineApp({
  model,
  onHome,
  onOffline,
  onCall,
  onStop,
  onGameplay,
  initialMode,
  sound,
  onSound,
  audioError,
}: {
  model: OnlineModel;
  sound?: boolean;
  onSound?: (enabled: boolean) => void;
  audioError?: string;
  onHome: () => void;
  onOffline: () => void;
  onCall: (n: number) => void;
  onStop: () => void;
  onGameplay: (active: boolean) => void;
  initialMode?: "home" | "profile" | "coins";
}) {
  useLanguage();
  const insets = useSafeAreaInsets();
  const [invite, setInvite] = useState<ReturnType<typeof parseInvite>>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const receive = useCallback((url: string) => {
    const value = parseInvite(url);
    if (value) {
      setInvite(value);
      void savedInvite.set(url);
    }
  }, []);
  useEffect(() => {
    void savedInvite.get().then((url) => {
      if (url) receive(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) receive(url);
    });
    const sub = Linking.addEventListener("url", (event) => receive(event.url));
    return () => sub.remove();
  }, [receive]);
  const immersive = !!model.snapshot && model.snapshot.phase !== "lobby";
  const fullScreen = immersive && Platform.OS === "android";
  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!model.snapshot) return false;
      setConfirmExit(true);
      return true;
    });
    return () => back.remove();
  }, [model.snapshot, model.exitTableView, onHome, onStop]);
  useEffect(() => {
    void setGameUi(fullScreen, immersive).catch(() => {});
    return () => {
      onGameplay(false);
      void setGameUi(false, false).catch(() => {});
    };
  }, [fullScreen, immersive, onGameplay]);
  return (
    <GameBackground
      style={[
        ui.page,
        {
          paddingTop: fullScreen ? 0 : insets.top,
          paddingBottom: fullScreen ? 0 : insets.bottom,
          backgroundColor: color.plum,
        },
      ]}
    >
      <StatusBar hidden={fullScreen} barStyle="light-content" />
      {confirmExit && model.snapshot && (
        <ExitGameDialog
          phase={model.snapshot.phase}
          onClose={() => setConfirmExit(false)}
          onLeave={() => {
            setConfirmExit(false);
            onStop();
            model.exitTableView();
          }}
        />
      )}
      {!!audioError && model.snapshot?.phase === "live" && (
        <View style={ui.error}>
          <Text style={{ color: color.red, fontSize: 12 }}>
            {tr("Audio interrupted. Tap the current number to retry.")}
          </Text>
        </View>
      )}
      {!model.loaded ? (
        <ActivityIndicator style={{ flex: 1 }} color={color.violet} />
      ) : model.snapshot ? (
        <TableScreen
          model={model}
          sound={sound}
          onSound={onSound}
          onCall={onCall}
          onStop={onStop}
          onGameplay={onGameplay}
        />
      ) : (
        <OnlineEntry
          onHome={onHome}
          model={model}
          initialMode={initialMode}
          invite={invite}
          onInviteUsed={() => {
            setInvite(null);
            void savedInvite.set(null);
          }}
          onOffline={onOffline}
        />
      )}
    </GameBackground>
  );
}
