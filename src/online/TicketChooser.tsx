import { t as tr, useLanguage } from "../i18n";
import { Text } from "../i18n/Text";
import { ScreenSafeArea, ScreenSurface } from "../navigation/ScreenContext";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { ticketCost } from "../../shared/online";
import { CoinChip, GameBackground } from "../components/GameArtwork";
import { LinearGradient } from "../components/LinearGradient";
import { gameFont } from "../gameTypography";
import { Icon, PageHeader, Pressable, TicketPanel } from "./components";
import type { OnlineModel } from "./useOnline";
import { TicketSkeleton } from "../navigation/skeletons";
const unmarkedTicket = Object.freeze({});

function TicketPack({ selected }: { selected: boolean }) {
  useLanguage();
  const ink = selected ? "#9c580d" : "#643792";
  return (
    <Svg width={28} height={31} viewBox="0 0 48 48">
      <Defs>
        <SvgGradient id="cards" x2="0" y2="1">
          <Stop stopColor={selected ? "#ffe77d" : "#eedfff"} />
          <Stop offset="1" stopColor={selected ? "#f8b823" : "#b08bdf"} />
        </SvgGradient>
      </Defs>
      <G stroke={ink} strokeWidth="1.5" fill="url(#cards)">
        <Rect
          x="6"
          y="10"
          width="22"
          height="32"
          rx="2"
          transform="rotate(-15 17 26)"
        />
        <Rect
          x="13"
          y="6"
          width="22"
          height="34"
          rx="2"
          transform="rotate(-6 24 23)"
        />
        <Rect
          x="23"
          y="3"
          width="22"
          height="35"
          rx="2"
          transform="rotate(6 34 20)"
        />
      </G>
      <Path d="M29 8l11 1-2 23-11-1z" fill="none" stroke={ink} opacity=".4" />
      <Path d="M28 20l11 1m-11 2 11 1" stroke={ink} opacity=".5" />
    </Svg>
  );
}

function ShuffleDice() {
  useLanguage();
  return (
    <Svg width={33} height={39} viewBox="0 0 42 46">
      <Path
        d="M21 1L40 12v23L21 45 2 34V12z"
        fill="#d8efff"
        stroke="#416881"
        strokeWidth="1"
      />
      <Path d="M21 1L40 12 21 24 2 12z" fill="#fff" />
      <Path d="M2 12l19 12v21L2 34z" fill="#e6f4ff" />
      <Path d="M40 12L21 24v21l19-10z" fill="#bad9e8" />
      {[
        [21, 8],
        [21, 16],
        [8, 22],
        [15, 35],
        [27, 27],
        [35, 23],
        [27, 38],
        [35, 34],
      ].map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r="2.4" fill="#183e55" />
      ))}
    </Svg>
  );
}

function ChooserAction({
  label,
  cyan,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  cyan?: boolean;
  onPress: () => void;
  disabled: boolean;
  busy?: boolean;
}) {
  useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled, busy }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          borderColor: cyan ? "#18e9fd" : "#fff382",
          borderBottomColor: cyan ? "#006284" : "#b36b06",
          opacity: disabled && !busy ? 0.65 : 1,
          transform: [
            { translateY: pressed ? 2 : 0 },
            { scale: pressed ? 0.98 : 1 },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={
          cyan
            ? ["#15dce9", "#0087b4", "#00527d"]
            : ["#fff18b", "#ffd93b", "#ffc529"]
        }
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.shine} />
      {busy ? (
        <ActivityIndicator size="small" color={cyan ? "#fff" : "#693c00"} />
      ) : cyan ? (
        <ShuffleDice />
      ) : (
        <Icon name="check" size={32} color="#542706" />
      )}
    </Pressable>
  );
}

export function TicketChooser({
  model,
  onClose,
  onCoins,
}: {
  model: OnlineModel;
  onClose: () => void;
  onCoins: () => void;
}) {
  useLanguage();
  const [pending, setPending] = useState<
    "shuffle" | "confirm" | "change" | null
  >(null);
  const s = model.snapshot!,
    me = s.members[s.viewerId]!,
    generated = useRef(false);
  const disabled = model.busy || !model.connected;
  useEffect(() => {
    if (
      !generated.current &&
      (!me.panels.length || me.spectator) &&
      !me.ready &&
      model.connected &&
      !model.busy
    ) {
      generated.current = true;
      void model.command("SELECT", { kind: me.kind });
    }
  }, [
    me.panels.length,
    me.spectator,
    me.kind,
    me.ready,
    model.connected,
    model.busy,
    model.command,
  ]);
  return (
    <ScreenSurface onClose={onClose}>
      <ScreenSafeArea>
        <GameBackground>
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            <PageHeader
              title={tr("Choose tickets")}
              onBack={onClose}
              right={
                <CoinChip
                  compact
                  balance={model.wallet?.balance}
                  onPress={onCoins}
                />
              }
            />
            <View style={styles.selection}>
              <View style={styles.kinds}>
                {(["half", "full"] as const).map((kind) => {
                  const selected = me.kind === kind;
                  return (
                    <Pressable
                      key={kind}
                      accessibilityRole="radio"
                      accessibilityLabel={tr("{v0}, {v1} coins", {
                        v0:
                          kind === "half"
                            ? tr("Half, 3 tickets")
                            : tr("Full, 6 tickets"),
                        v1: ticketCost(s.config, kind),
                      })}
                      accessibilityState={{
                        selected,
                        disabled: disabled || me.ready,
                      }}
                      disabled={disabled || me.ready}
                      onPress={() => {
                        if (!selected) void model.command("SELECT", { kind });
                      }}
                      style={({ pressed }) => [
                        styles.kind,
                        {
                          borderColor: selected ? "#ffe86a" : "#eedcff",
                          borderBottomColor: selected ? "#d58b13" : "#9062b5",
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={
                          selected
                            ? ["#fff397", "#ffdc45", "#ffbd1f"]
                            : ["#f3e7ff", "#e1c8f5", "#bd91e5"]
                        }
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.shine} />
                      <TicketPack selected={selected} />
                      <View>
                        <Text
                          maxFontSizeMultiplier={1.1}
                          style={[
                            styles.kindText,
                            { color: selected ? "#442200" : "#321046" },
                          ]}
                        >
                          {kind === "half" ? tr("Half · 3") : tr("Full · 6")}
                        </Text>
                        <Text style={styles.kindPrice}>
                          ● {ticketCost(s.config, kind)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <FlatList
              style={{ flex: 1, minHeight: 0 }}
              data={me.panels}
              keyExtractor={(_, i) => me.stripVersion + ":" + i}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={3}
              removeClippedSubviews={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.tickets}
              renderItem={({ item, index }) => (
                <TicketPanel
                  compact
                  panel={item}
                  index={index}
                  count={me.panels.length}
                  marks={unmarkedTicket}
                />
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  {model.busy ? (
                    <TicketSkeleton />
                  ) : (
                    <Text style={styles.price}>
                      {tr("Regenerate to find your lucky tickets.")}
                    </Text>
                  )}
                </View>
              }
            />
            <View style={styles.footer}>
              <LinearGradient
                colors={["#5b1b8599", "#36085d", "#31064f"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.actions}>
                <ChooserAction
                  label={tr("Regenerate tickets")}
                  cyan
                  disabled={disabled}
                  busy={pending === "shuffle"}
                  onPress={() => {
                    setPending("shuffle");
                    void (async () => {
                      if (
                        me.ready &&
                        !(await model.command("READY", { ready: false }))
                      )
                        return;
                      await model.command("SELECT", { kind: me.kind });
                    })().finally(() => setPending(null));
                  }}
                />
                <ChooserAction
                  label={me.ready ? tr("Done") : tr("Use these tickets")}
                  busy={pending === "confirm"}
                  disabled={disabled || !me.panels.length}
                  onPress={() => {
                    if (me.ready) {
                      onClose();
                      return;
                    }
                    setPending("confirm");
                    void model
                      .command("CONFIRM_STRIP", {
                        stripVersion: me.stripVersion,
                      })
                      .then((ok) => {
                        if (ok) onClose();
                      })
                      .finally(() => setPending(null));
                  }}
                />
              </View>
            </View>
          </SafeAreaView>
        </GameBackground>
      </ScreenSafeArea>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  selection: { paddingHorizontal: 10, paddingTop: 1, paddingBottom: 5, gap: 4 },
  kinds: { flexDirection: "row", gap: 9 },
  kind: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 25,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    overflow: "hidden",
    elevation: 4,
  },
  kindText: {
    fontFamily: gameFont.bold,
    fontSize: 17,
    includeFontPadding: false,
  },
  kindPrice: {
    fontFamily: gameFont.medium,
    fontSize: 12,
    color: "#613715",
    textAlign: "center",
    includeFontPadding: false,
  },
  price: {
    color: "#f2defc",
    fontFamily: gameFont.medium,
    fontSize: 14,
    textAlign: "center",
  },
  tickets: { paddingHorizontal: 9, paddingBottom: 1 },
  empty: { padding: 8 },
  footer: {
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 7,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    gap: 4,
  },
  actions: { flexDirection: "row", justifyContent: "center", gap: 12 },
  action: {
    width: 108,
    height: 48,
    paddingHorizontal: 8,
    gap: 5,
    borderRadius: 30,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 18,
    fontFamily: gameFont.bold,
    flexShrink: 1,
    includeFontPadding: false,
  },
  shine: {
    position: "absolute",
    top: 2,
    left: 4,
    right: 4,
    height: 20,
    borderTopWidth: 1.5,
    borderColor: "#ffffffaa",
    borderRadius: 28,
  },
});
