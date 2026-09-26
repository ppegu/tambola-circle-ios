import { t as tr, useLanguage } from "../i18n";
import React, { useRef, useState } from "react";
import { Modal, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from "react-native-svg";
import type { RoomSnapshot } from "../../shared/online";
import { CoinPile, GameButton, GameIcon } from "../components/GameArtwork";
import { LinearGradient } from "../components/LinearGradient";
import { gameFont } from "../gameTypography";
import { Icon, Pressable, ScrollView, Text, View } from "./components";

function EndFlag() {
  useLanguage();
  const id = React.useId().replace(/:/g, "");
  return (
    <Svg
      width={107}
      height={80}
      viewBox="0 0 150 112"
      accessibilityElementsHidden
    >
      <Defs>
        <SvgGradient id={id} x1="0%" y1="0%" x2="100%" y2="65%">
          <Stop offset="0" stopColor="#ff8b98" />
          <Stop offset="0.35" stopColor="#ff2b4b" />
          <Stop offset="0.7" stopColor="#c6062d" />
          <Stop offset="1" stopColor="#ff4662" />
        </SvgGradient>
      </Defs>
      <Path
        d="M47 20Q71 6 97 21Q116 31 133 22L131 78Q113 88 94 74Q68 61 55 77Z"
        fill={`url(#${id})`}
        stroke="#4d152c"
        strokeWidth="3"
      />
      <Path
        d="M53 24L59 70M89 22L93 66"
        stroke="#ff96a5"
        strokeWidth="5"
        opacity=".6"
      />
      <Path d="M44 17L58 103" stroke="#4e211b" strokeWidth="9" />
      <Path d="M42 17L56 100" stroke="#b96c3b" strokeWidth="3" />
      <Circle
        cx="43"
        cy="15"
        r="8"
        fill="#8e4b31"
        stroke="#441f21"
        strokeWidth="3"
      />
      <Path
        d="M17 45L5 31M17 63L4 60M137 53L147 41"
        stroke="#ffd653"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function EndRoundDialog({
  snapshot: room,
  busy,
  onClose,
  onEnd,
}: {
  snapshot: RoomSnapshot;
  busy: boolean;
  onClose: () => void;
  onEnd: () => Promise<boolean>;
}) {
  useLanguage();
  const [working, setWorking] = useState(false),
    [error, setError] = useState(false),
    sending = useRef(false);
  const members = Object.values(room.members);
  // Match the server's END operation: release reservations and refund paid holds,
  // including anyone who disconnected or left after paying for this round.
  const refund = members.reduce(
    (sum, member) =>
      sum +
      (member.coinHold && Number.isFinite(member.entryCoins)
        ? Math.max(0, member.entryCoins!)
        : 0),
    0,
  );
  const players =
    room.phase === "lobby"
      ? members.filter((m) => !m.left && !m.removed && !m.spectator).length
      : room.roster.length;
  const disabled =
    busy ||
    working ||
    room.hostId !== room.viewerId ||
    room.phase === "finished";
  async function end() {
    if (disabled || sending.current) return;
    sending.current = true;
    setWorking(true);
    setError(false);
    try {
      if (await onEnd()) onClose();
      else setError(true);
    } catch {
      setError(true);
    } finally {
      sending.current = false;
      setWorking(false);
    }
  }
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (!working) onClose();
      }}
    >
      <SafeAreaProvider>
        <SafeAreaView style={s.overlay}>
          <Pressable
            accessibilityLabel={tr("Close end-round confirmation")}
            disabled={working}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={s.card}>
            <LinearGradient
              colors={["#fffef5", "#fff2d8", "#f7dfb5"]}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <ScrollView contentContainerStyle={s.content}>
              <View style={s.flag}>
                <EndFlag />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr("Close end-round confirmation")}
                  disabled={working}
                  onPress={onClose}
                  style={s.close}
                >
                  <Icon name="close" size={24} color="#5d3027" />
                </Pressable>
              </View>
              <Text style={s.title}>{tr("End this round?")}</Text>
              <Text style={s.subtitle}>
                {tr("The game will stop for everyone.")}
              </Text>
              <View style={s.stats}>
                <View style={s.stat}>
                  <Text style={s.statTitle}>
                    {tr("Round")} {room.round}
                  </Text>
                  <View style={s.crown}>
                    <Icon name="crown" size={31} color="#ffdc35" />
                  </View>
                </View>
                <View style={[s.stat, s.statDivider]}>
                  <Text style={s.statTitle}>
                    {players} {tr("players")}
                  </Text>
                  <GameIcon index={0} size={59} />
                </View>
                <View style={[s.stat, s.statDivider]}>
                  <Text style={s.statTitle}>
                    {refund.toLocaleString()} {tr("coins")}
                  </Text>
                  <Text style={s.caption}>{tr("returned in total")}</Text>
                  <CoinPile index={0} size={49} />
                </View>
              </View>
              <View style={s.notice}>
                <Icon name="info" color="#3672c1" size={28} />
                <Text style={s.noticeText}>
                  {tr("All entry coins return to players.")}
                  {"\n"}
                  {tr("The table stays open.")}
                </Text>
              </View>
              {error && (
                <Text accessibilityLiveRegion="polite" style={s.error}>
                  {tr("Couldn’t end the round. Please try again.")}
                </Text>
              )}
              <GameButton
                glyph="play"
                disabled={working}
                onPress={onClose}
                style={s.button}
              >
                {tr("Keep playing")}
              </GameButton>
              <GameButton
                glyph="stop"
                tone="red"
                disabled={disabled}
                onPress={() => {
                  void end();
                }}
                style={s.button}
              >
                {working ? tr("Ending round…") : tr("End round & refund")}
              </GameButton>
            </ScrollView>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#17052c9c",
    justifyContent: "center",
    alignItems: "center",
    padding: 13,
  },
  card: {
    width: "100%",
    maxWidth: 410,
    maxHeight: "96%",
    borderRadius: 29,
    overflow: "hidden",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: "#ffe970",
    borderBottomColor: "#d79726",
    backgroundColor: "#fff0d6",
  },
  content: { padding: 13, gap: 9 },
  flag: { alignItems: "center", height: 80 },
  close: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 38,
    height: 38,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: "#cfaa7c",
    backgroundColor: "#faebce",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: gameFont.bold,
    color: "#2a0b42",
    fontSize: 29,
    lineHeight: 35,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: gameFont.medium,
    color: "#3e264b",
    fontSize: 15,
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 0.8,
    borderColor: "#dfc299",
    paddingVertical: 9,
    backgroundColor: "#fceacb",
  },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 2 },
  statDivider: { borderLeftWidth: 0.8, borderColor: "#d9b997" },
  statTitle: {
    fontFamily: gameFont.bold,
    color: "#321044",
    fontSize: 13,
    textAlign: "center",
  },
  caption: { fontFamily: gameFont.medium, fontSize: 9, color: "#4d3554" },
  crown: {
    width: 49,
    height: 49,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#b269e9",
    backgroundColor: "#6620ab",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#e6e0e7",
    borderRadius: 13,
    padding: 10,
    borderWidth: 0.7,
    borderColor: "#c5b6ba",
  },
  noticeText: {
    flex: 1,
    fontFamily: gameFont.medium,
    fontSize: 12,
    color: "#371642",
    lineHeight: 16,
  },
  error: {
    color: "#9e1231",
    fontFamily: gameFont.medium,
    textAlign: "center",
    fontSize: 13,
  },
  button: { borderRadius: 27, minHeight: 51 },
});
