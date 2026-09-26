import { t as tr, useLanguage } from "../i18n";
import { Text } from "../i18n/Text";
import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Pressable } from "./Pressable";
import { LinearGradient } from "./LinearGradient";
import { ALL_NUMBERS } from "../game";
import { callerLayout } from "../callerLayout";
import { type Preferences } from "../../shared/preferences";
import { Icon } from "./CircleArtwork";
import { GameLogo } from "./GameArtwork";
import { GameSlider, GameSwitch } from "./GameControls";
import { gameFont } from "../gameTypography";
import { setGamePreferences, useGamePreferences } from "../gamePreferences";

import { CallerSpeed } from "./CallerSpeed";

export function AutoSwitch({
  on,
  onPress,
  label = tr("Automatic calling"),
}: {
  on: boolean;
  onPress: () => void;
  scale?: number;
  label?: string;
}) {
  useLanguage();
  return <GameSwitch label={label} value={on} onChange={onPress} />;
}
function RoundButton({
  icon,
  label,
  onPress,
  size = 44,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  size?: number;
}) {
  useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      <LinearGradient
        colors={["#fff6b0", "#ffdc42", "#a45a09"]}
        style={[styles.roundButton, { borderRadius: size / 2 }]}
      >
        <LinearGradient
          colors={["#ab50ed", "#661da6", "#33065e"]}
          style={styles.roundButtonFace}
        >
          <View pointerEvents="none" style={styles.roundShine} />
          <Icon name={icon} size={size * 0.5} color="#fff6dd" />
        </LinearGradient>
      </LinearGradient>
    </Pressable>
  );
}
const NumberCell = memo(function NumberCell({
  number,
  called,
  font,
  diameter,
}: {
  number: number;
  called: boolean;
  font: number;
  diameter: number;
}) {
  useLanguage();
  const label = (
    <Text
      maxFontSizeMultiplier={1.1}
      numberOfLines={1}
      adjustsFontSizeToFit
      style={[
        styles.cellText,
        { fontSize: font },
        called && { color: "#fff", fontSize: diameter * 0.54 },
      ]}
    >
      {number}
    </Text>
  );
  return (
    <View
      testID={"number-" + number}
      accessibilityLabel={`${number}, ${called ? tr("called") : tr("not called")}`}
      style={styles.cell}
    >
      {called ? (
        <LinearGradient
          colors={["#ff4b59", "#f00821", "#c0000c"]}
          style={[
            styles.called,
            { width: diameter, height: diameter, borderRadius: diameter / 2 },
          ]}
        >
          <View pointerEvents="none" style={styles.chipShine} />
          {label}
        </LinearGradient>
      ) : (
        label
      )}
    </View>
  );
});
const NumberBoard = memo(function NumberBoard({
  history,
  width,
  height,
  font,
}: {
  history: number[];
  width: number;
  height: number;
  font: number;
}) {
  useLanguage();
  const called = new Set(history);
  const diameter = Math.min((width - 12) / 10 - 3, (height - 12) / 9 - 3);
  return (
    <LinearGradient
      colors={["#fff5a0", "#f2ad29", "#b77715"]}
      style={[styles.board, { width, height }]}
    >
      <View style={styles.boardInner}>
        {Array.from({ length: 9 }, (_, row) => (
          <View key={row} style={styles.boardRow}>
            {ALL_NUMBERS.slice(row * 10, row * 10 + 10).map((number) => (
              <NumberCell
                key={number}
                number={number}
                called={called.has(number)}
                font={font}
                diameter={diameter}
              />
            ))}
          </View>
        ))}
      </View>
    </LinearGradient>
  );
});

export function CallerScreen({
  width,
  height,
  preferences,
  history,
  running,
  historyOpen,
  audioError,
  voicePreparing = false,
  onPreferences,
  onMenu,
  onHistory,
  onPlay,
  onNext,
  onRepeat,
  onReplay,
}: {
  width: number;
  height: number;
  preferences: Preferences;
  history: number[];
  running: boolean;
  historyOpen: boolean;
  audioError: string;
  voicePreparing?: boolean;
  onPreferences: (prefs: Partial<Preferences>) => void;
  onMenu: () => void;
  onHistory: () => void;
  onPlay: () => void;
  onNext: () => void;
  onRepeat: () => void;
  onReplay: (n: number) => void;
}) {
  useLanguage();
  const l = callerLayout(width, height, !!audioError),
    current = history.at(-1),
    previous = history.at(-2);
  const [popup, setPopup] = useState(false);
  useEffect(() => {
    if (preferences.speed === 3 || preferences.speed === 6)
      onPreferences({ speed: preferences.speed === 3 ? 4 : 7 });
  }, [preferences.speed, onPreferences]);
  const voiceVolume = useGamePreferences((s) => s.voiceVolume),
    volume = preferences.sound ? voiceVolume : 0;
  const complete = history.length === 90,
    waiting = voicePreparing && !running;
  const action = complete
    ? tr("Finished")
    : preferences.auto
      ? running
        ? tr("Pause")
        : tr("Play")
      : tr("Call next");
  const diameter = Math.min(l.currentHeight, width * 0.35),
    volumeTop = Math.min(height - 110, l.currentTop + l.currentHeight + 2);
  return (
    <View testID="offline-caller" style={{ width, height, overflow: "hidden" }}>
      <View
        style={[
          styles.header,
          { left: l.padding, right: l.padding, top: l.padding },
        ]}
      >
        <RoundButton
          icon="back"
          label={tr("Open game menu")}
          onPress={onMenu}
        />
        <GameLogo width={125} />
        <RoundButton
          icon="history"
          label={tr("Called number history")}
          onPress={onHistory}
        />
      </View>
      <View
        style={[
          styles.controls,
          { top: l.speedTop, left: l.padding, right: l.padding },
        ]}
      >
        <LinearGradient colors={["#5b1c90", "#32084e"]} style={styles.auto}>
          <Text style={styles.autoText}>{tr("Auto")}</Text>
          <AutoSwitch
            on={preferences.auto}
            onPress={() => onPreferences({ auto: !preferences.auto })}
          />
        </LinearGradient>
        <CallerSpeed
          value={preferences.speed}
          onChange={(speed) => onPreferences({ speed })}
        />
      </View>
      <View
        style={{
          position: "absolute",
          top: l.currentTop,
          left: l.padding,
          right: l.padding,
          height: l.currentHeight,
          justifyContent: "center",
        }}
      >
        <LinearGradient
          colors={["#fff88d", "#ffd92e", "#b66a0a"]}
          style={styles.numberBar}
        >
          <LinearGradient
            colors={["#7728b0", "#491170", "#310747"]}
            style={styles.numberBarFace}
          />
        </LinearGradient>
        <View style={styles.numberRow}>
          <View style={styles.previous}>
            <Text style={styles.previousLabel}>{tr("Previous")}</Text>
            <LinearGradient
              colors={["#fff9cb", "#ffe78e", "#ecbc4c"]}
              style={styles.previousBall}
            >
              <Text
                accessibilityLabel={tr("Previous number {number}", {
                  number: previous ?? tr("none"),
                })}
                style={styles.previousText}
              >
                {previous ?? "—"}
              </Text>
            </LinearGradient>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              current
                ? tr("Repeat current number {v0}", { v0: current })
                : tr("No current number")
            }
            onPress={onRepeat}
            disabled={!current}
            style={{ width: diameter, height: diameter }}
          >
            <LinearGradient
              colors={["#fffac0", "#ffe354", "#f6bd18", "#ffdc39", "#a65a07"]}
              style={styles.ballFrame}
            >
              <LinearGradient
                colors={["#ffffff", "#fffdf7", "#eee2dc"]}
                style={styles.ballFace}
              >
                <Text
                  testID="current-number"
                  accessibilityLiveRegion="polite"
                  style={[styles.currentText, { fontSize: diameter * 0.57 }]}
                >
                  {current ?? "—"}
                </Text>
              </LinearGradient>
            </LinearGradient>
          </Pressable>
          <View style={styles.volume}>
            <RoundButton
              icon={volume ? "sound" : "muted"}
              label={tr("Caller volume {v0} percent", {
                v0: Math.round(volume * 100),
              })}
              size={51}
              onPress={() => setPopup(true)}
            />
            <View pointerEvents="none" style={styles.volumeTag}>
              <Text style={styles.volumeText}>{Math.round(volume * 100)}%</Text>
            </View>
          </View>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={waiting ? tr("Preparing audio") : action}
        accessibilityState={{ busy: waiting, disabled: complete || waiting }}
        disabled={complete || waiting}
        onPress={preferences.auto ? onPlay : onNext}
        style={[
          styles.action,
          {
            top: l.actionTop,
            left: width / 2 - 82,
            width: 164,
            opacity: complete ? 0.6 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={["#ff7988", "#f02740", "#b60a23"]}
          style={styles.actionFace}
        >
          {waiting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Icon
              name={running && preferences.auto ? "pause" : "play"}
              size={23}
            />
          )}
          <Text style={styles.actionText}>{action}</Text>
        </LinearGradient>
      </Pressable>
      {!!audioError && (
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={2}
          style={{
            position: "absolute",
            left: l.padding,
            right: l.padding,
            top: l.actionTop + 46,
            color: "#ffc3c9",
            fontSize: 11,
            textAlign: "center",
          }}
        >
          {audioError}
        </Text>
      )}
      <View
        style={[
          styles.progress,
          { left: l.padding, right: l.padding, top: l.boardTop - 30 },
        ]}
      >
        <Text style={styles.progressText}>
          <Text style={{ color: "#43e1f4" }}>{history.length}</Text>{" "}
          {tr("called")}
        </Text>
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${(history.length / 90) * 100}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          <Text style={{ color: "#ffe166" }}>{90 - history.length}</Text>{" "}
          {tr("remaining")}
        </Text>
      </View>
      <View
        style={{ position: "absolute", left: l.boardLeft, top: l.boardTop }}
      >
        <NumberBoard
          history={history}
          width={l.boardWidth}
          height={l.board}
          font={l.numberFont}
        />
      </View>
      <Modal
        visible={popup}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType="fade"
        onRequestClose={() => setPopup(false)}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            accessibilityLabel={tr("Close caller control")}
            onPress={() => setPopup(false)}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["#651e91", "#30084b"]}
            style={[
              styles.popover,
              {
                top: volumeTop,
                right: l.padding,
                width: Math.min(250, width - 24),
              },
            ]}
          >
            <View style={styles.sliderRow}>
              <GameSlider
                label={tr("Caller volume")}
                value={volume}
                onChange={(value) => {
                  setGamePreferences({ voiceVolume: value });
                  onPreferences({ sound: value > 0 });
                }}
              />
              <Text style={styles.popoverText}>
                {Math.round(volume * 100)}%
              </Text>
            </View>
          </LinearGradient>
        </View>
      </Modal>
      {historyOpen && (
        <>
          <Pressable
            accessibilityLabel={tr("Dismiss history")}
            onPress={onHistory}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#16042680",
              zIndex: 5,
            }}
          />
          <LinearGradient
            colors={["#631a91", "#2c084b"]}
            style={[styles.history, { width: Math.min(165, width * 0.46) }]}
          >
            <View style={{ alignItems: "flex-end", padding: 6 }}>
              <RoundButton
                icon="close"
                label={tr("Close history")}
                onPress={onHistory}
              />
            </View>
            <ScrollView
              contentContainerStyle={{
                alignItems: "center",
                paddingVertical: 8,
                gap: 8,
              }}
            >
              {!history.length && (
                <Text style={styles.popoverText}>{tr("No calls yet")}</Text>
              )}
              {[...history].reverse().map((n) => (
                <Pressable
                  key={n}
                  onPress={() => onReplay(n)}
                  accessibilityRole="button"
                  accessibilityLabel={tr("Replay {v0}", { v0: n })}
                >
                  <LinearGradient
                    colors={["#fffbda", "#ffe487", "#edb445"]}
                    style={styles.previousBall}
                  >
                    <Text style={styles.previousText}>{n}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          </LinearGradient>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  roundButtonFace: {
    flex: 1,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#d98aff",
    alignItems: "center",
    justifyContent: "center",
  },
  roundShine: {
    position: "absolute",
    left: 5,
    right: 5,
    top: 2,
    height: 10,
    borderRadius: 20,
    borderTopWidth: 1.5,
    borderColor: "#ffffffb0",
  },
  numberBarFace: {
    flex: 1,
    borderRadius: 60,
    borderWidth: 1.3,
    borderColor: "#aa58dd",
  },
  boardInner: {
    flex: 1,
    padding: 1,
    borderWidth: 1,
    borderColor: "#722877",
    borderRadius: 12,
    backgroundColor: "#f2dabc",
    overflow: "hidden",
  },
  chipShine: {
    position: "absolute",
    top: 1,
    left: 4,
    right: 4,
    height: 7,
    borderRadius: 15,
    borderTopWidth: 0.8,
    borderColor: "#ffd7d2",
  },
  header: {
    position: "absolute",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundButton: {
    flex: 1,
    padding: 2,
    borderWidth: 1,
    borderColor: "#fff6be",
    borderBottomWidth: 2,
    borderBottomColor: "#8b4a0a",
    elevation: 3,
  },
  controls: {
    position: "absolute",
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  auto: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    flex: 1,
    height: 40,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#a553d5",
  },
  autoText: { fontFamily: gameFont.medium, fontSize: 17, color: "#f7e9ff" },
  numberBar: {
    position: "absolute",
    width: "100%",
    height: "80%",
    borderRadius: 65,
    padding: 3,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: "#fff4bd",
    borderBottomColor: "#9d5b15",
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  previous: { alignItems: "center", gap: 4 },
  previousLabel: {
    fontFamily: gameFont.medium,
    fontSize: 12,
    color: "#d2b4ee",
  },
  previousBall: {
    width: 49,
    height: 49,
    borderRadius: 25,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: "#fff1ac",
    borderBottomColor: "#c38721",
    alignItems: "center",
    justifyContent: "center",
  },
  previousText: {
    fontFamily: gameFont.bold,
    fontSize: 27,
    color: "#321144",
    includeFontPadding: false,
  },
  ballFrame: {
    flex: 1,
    borderRadius: 100,
    padding: 6,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: "#fff6ab",
    borderBottomColor: "#b87106",
    elevation: 6,
  },
  ballFace: {
    flex: 1,
    borderRadius: 95,
    borderWidth: 1.4,
    borderColor: "#e3bd68",
    alignItems: "center",
    justifyContent: "center",
  },
  currentText: {
    fontFamily: gameFont.medium,
    color: "#260832",
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
  },
  volume: { marginTop: 5 },
  volumeTag: {
    position: "absolute",
    bottom: -8,
    right: -5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fff38e",
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: "#ffd044",
  },
  volumeText: { fontFamily: gameFont.bold, color: "#2b0b40", fontSize: 11 },
  action: {
    position: "absolute",
    height: 44,
    borderRadius: 24,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: "#ffdf6e",
    borderBottomColor: "#ac531d",
    overflow: "hidden",
  },
  actionFace: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { fontFamily: gameFont.bold, fontSize: 19, color: "#fff8ec" },
  progress: {
    position: "absolute",
    height: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#8643b2",
    backgroundColor: "#290642",
  },
  progressText: { fontFamily: gameFont.medium, fontSize: 11, color: "#dec9f3" },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#9850c7",
    backgroundColor: "#1c0333",
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: "#1dd6ef" },
  board: {
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    borderColor: "#ffefab",
    borderBottomColor: "#9b5f22",
    borderRadius: 16,
    padding: 3,
    overflow: "hidden",
  },
  boardRow: { flex: 1, flexDirection: "row" },
  cell: {
    flex: 1,
    margin: 0.6,
    backgroundColor: "#fff0d5",
    borderRadius: 5,
    borderWidth: 0.7,
    borderColor: "#fffaf0",
    borderBottomColor: "#e6c59c",
    borderBottomWidth: 1.3,
    justifyContent: "center",
    alignItems: "center",
  },
  called: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.8,
    borderBottomWidth: 2,
    borderColor: "#ff8990",
    borderBottomColor: "#ac0010",
    elevation: 2,
  },
  cellText: {
    fontFamily: gameFont.medium,
    color: "#32123f",
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
  },
  popover: {
    position: "absolute",
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#ffda65",
    paddingHorizontal: 9,
    paddingVertical: 3,
    elevation: 10,
  },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  popoverText: { fontFamily: gameFont.medium, color: "#fff2d6", fontSize: 14 },
  history: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderColor: "#d3b883",
    zIndex: 6,
  },
});
