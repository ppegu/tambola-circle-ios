import { t as tr, useLanguage } from "../i18n";
import { TextInput } from "../i18n/Text";
import React, { useEffect, useState } from "react";
import { StyleSheet, Switch } from "react-native";
import { ticketCost, type TableConfig } from "../../shared/online";
import { LinearGradient } from "../components/LinearGradient";
import { GameSlider } from "../components/GameControls";
import { GameFinish } from "../components/GameFinish";
import { gameFont } from "../gameTypography";
import { Icon, Pressable, Text, View } from "./components";

export function SetupCard({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  useLanguage();
  return (
    <LinearGradient
      colors={["#fffcf0", "#fff6e6", "#f7e8d2"]}
      style={setupStyles.card}
    >
      <LinearGradient
        colors={["#ffff91", "#ffda2b", "#f2a71a"]}
        style={setupStyles.badge}
      >
        <Icon name={icon} color="#38142d" size={29} />
      </LinearGradient>
      <View style={setupStyles.content}>{children}</View>
    </LinearGradient>
  );
}

export function SetupChoice({
  label,
  icon,
  selected,
  onPress,
  disabled,
  compact = false,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  useLanguage();
  return (
    <Pressable
      collapsable={false}
      android_ripple={{ color: "transparent" }}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        setupStyles.choice,
        compact && setupStyles.compactChoice,
        {
          borderColor: selected ? "#ed9b11" : "#bd8ade",
          backgroundColor: selected ? "#ffd139" : "#7b21bd",
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <GameFinish tone={selected ? "gold" : "purple"} radius={22} />
      <View
        pointerEvents="none"
        style={{ width: compact ? 17 : 23, alignItems: "center" }}
      >
        <Icon
          name={icon}
          size={compact ? 16 : 20}
          color={selected ? "#482117" : "#fff4d8"}
        />
      </View>
      <Text
        pointerEvents="none"
        suppressHighlighting
        numberOfLines={compact ? 1 : undefined}
        adjustsFontSizeToFit={compact}
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.15}
        style={[
          setupStyles.choiceText,
          compact && setupStyles.compactChoiceText,
          { color: selected ? "#482117" : "#fff4d8" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function CaptainSeatSwitch({
  playing,
  disabled,
  onChange,
}: {
  playing: boolean;
  disabled?: boolean;
  onChange: (playing: boolean) => void;
}) {
  useLanguage();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 8,
        paddingRight: 2,
        gap: 2,
      }}
    >
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.15}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: gameFont.medium,
          fontSize: 12,
          color: "#ffe9a3",
        }}
      >
        {tr("Play this round")}
      </Text>
      <Switch
        accessibilityLabel={tr("Play this round")}
        accessibilityHint={tr("Off: Captain only. On: play with tickets.")}
        value={playing}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: "#73528e", true: "#188b57" }}
        thumbColor={playing ? "#ffde72" : "#ddd0e9"}
        ios_backgroundColor="#73528e"
      />
    </View>
  );
}

function CoinStepper({
  kind,
  value,
  onChange,
}: {
  kind: "half" | "full";
  value: number;
  onChange: (value: number) => void;
}) {
  useLanguage();
  const [draft, setDraft] = useState(String(value)),
    [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  const update = (next: number) => {
    const safe = Math.max(1, Math.min(100000, next));
    setDraft(String(safe));
    onChange(safe);
  };
  return (
    <View style={setupStyles.feeColumn}>
      <Text maxFontSizeMultiplier={1.1} style={setupStyles.feeLabel}>
        {kind === "half" ? tr("Half · 3 tickets") : tr("Full · 6 tickets")}
      </Text>
      <View style={setupStyles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("Decrease {v0} ticket fee", { v0: kind })}
          accessibilityState={{ disabled: value <= 1 }}
          disabled={value <= 1}
          onPress={() => update(value - 10)}
          style={setupStyles.stepHit}
        >
          <LinearGradient
            colors={["#35d5df", "#0295a7", "#007083"]}
            style={setupStyles.stepFace}
          >
            <Icon name="minus" size={20} />
          </LinearGradient>
        </Pressable>
        <TextInput
          accessibilityLabel={tr("{v0} ticket coin fee", { v0: kind })}
          value={draft}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            update(Number(draft) || 1);
          }}
          selectTextOnFocus
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={(text) => {
            const next = text.replace(/\D/g, "");
            setDraft(next);
            onChange(Math.min(100000, Number(next)));
          }}
          style={setupStyles.feeInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("Increase {v0} ticket fee", { v0: kind })}
          accessibilityState={{ disabled: value >= 100000 }}
          disabled={value >= 100000}
          onPress={() => update(value + 10)}
          style={setupStyles.stepHit}
        >
          <LinearGradient
            colors={["#35d5df", "#0295a7", "#007083"]}
            style={setupStyles.stepFace}
          >
            <Icon name="plus" size={20} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

export function TimingFields({
  config,
  onChange,
}: {
  config: TableConfig;
  onChange: (config: TableConfig) => void;
  compact?: boolean;
}) {
  useLanguage();
  const pace = (n: number) =>
    onChange({ ...config, callSeconds: Math.max(3, Math.min(10, n)) });
  return (
    <View style={{ gap: 5 }}>
      <SetupCard icon="coins">
        <Text style={setupStyles.label}>{tr("Coins per round")}</Text>
        <View style={setupStyles.options}>
          {(["half", "full"] as const).map((kind) => (
            <CoinStepper
              key={kind}
              kind={kind}
              value={ticketCost(config, kind)}
              onChange={(value) =>
                onChange({
                  ...config,
                  [kind === "half" ? "halfCoins" : "fullCoins"]: value,
                })
              }
            />
          ))}
        </View>
      </SetupCard>
      <SetupCard icon="clock">
        <View style={setupStyles.row}>
          <Text style={[setupStyles.label, { flex: 1 }]}>
            {tr("Calls every")}
          </Text>
          <View style={setupStyles.interval}>
            <Text style={setupStyles.intervalText}>
              {config.callSeconds} {tr("seconds")}
            </Text>
          </View>
        </View>
        <View style={[setupStyles.row, { gap: 3 }]}>
          <Text style={setupStyles.endpoint}>3s</Text>
          <GameSlider
            label={tr("Number call interval")}
            minimum={3}
            maximum={10}
            step={1}
            tone="purple"
            value={config.callSeconds}
            onChange={pace}
          />
          <Text style={setupStyles.endpoint}>10s</Text>
        </View>
      </SetupCard>
    </View>
  );
}

export const setupStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 9,
    padding: 6,
    paddingHorizontal: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#fff6d8",
    elevation: 3,
  },
  badge: {
    width: 42,
    height: 44,
    borderRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: "#fff395",
    borderBottomColor: "#d08a0d",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  content: { flex: 1, minWidth: 0, gap: 3 },
  label: {
    fontFamily: gameFont.bold,
    color: "#2d0c43",
    fontSize: 17,
    lineHeight: 20,
    includeFontPadding: false,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 7 },
  options: { flexDirection: "row", gap: 6 },
  choice: {
    flex: 1,
    minHeight: 42,
    borderRadius: 23,
    borderWidth: 1,
    borderBottomWidth: 2,
    elevation: 2,
    borderColor: "#d2b092",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 5,
    paddingVertical: 5,
    overflow: "hidden",
  },
  selected: { borderColor: "#ed9b11", borderBottomWidth: 2, elevation: 2 },
  choiceText: {
    fontFamily: gameFont.medium,
    fontSize: 13,
    color: "#31132b",
    flexShrink: 1,
  },
  compactChoice: {
    minWidth: 0,
    minHeight: 44,
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 17,
  },
  compactChoiceText: { fontSize: 12, includeFontPadding: false },
  check: {
    width: 23,
    height: 23,
    borderRadius: 13,
    backgroundColor: "#4e2525",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontFamily: gameFont.medium,
    color: "#705482",
    fontSize: 11,
    lineHeight: 14,
  },
  feeColumn: { flex: 1, minWidth: 0, gap: 3 },
  feeLabel: {
    fontFamily: gameFont.medium,
    color: "#321344",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    includeFontPadding: false,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d7b69b",
    borderRadius: 14,
    backgroundColor: "#f8ebd8",
  },
  stepHit: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepFace: {
    width: 29,
    height: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: "#78e9e8",
    borderBottomColor: "#076676",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  feeInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    padding: 0,
    fontFamily: gameFont.bold,
    fontSize: 18,
    color: "#2c0a40",
    textAlign: "center",
  },
  interval: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#f8ebd9",
    borderWidth: 1,
    borderColor: "#d5b296",
  },
  intervalText: { fontFamily: gameFont.medium, fontSize: 14, color: "#31113f" },
  endpoint: { fontFamily: gameFont.medium, fontSize: 13, color: "#301043" },
});
