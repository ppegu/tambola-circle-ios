import { t as tr, useLanguage } from "../i18n";
import { Text } from "../i18n/Text";
import { useShallow } from "zustand/react/shallow";
import { useScreenNavigation } from "../navigation/ScreenContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  ScrollView as NativeScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line, Rect } from "react-native-svg";
import { GameFinish, GoldGear } from "../components/GameFinish";
import { gameFont } from "../gameTypography";
import { PaperSurface } from "../components/PaperSurface";
import { LinearGradient } from "../components/LinearGradient";
import { Pressable } from "../components/Pressable";
import {
  GameAvatar,
  GameBackground,
  GameButton,
  GameIcon,
} from "../components/GameArtwork";
import { Icon, FooterWave } from "../components/CircleArtwork";
import { useGamePreferences, type GamePreferences } from "../gamePreferences";
import type { Panel } from "../../shared/tickets";
import { cellKey } from "../../shared/online";
export function ScrollView(props: ScrollViewProps) {
  useLanguage();
  return (
    <NativeScrollView
      removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...props}
    />
  );
}
export const color = {
  plum: "#35104f",
  violet: "#8033bd",
  gold: "#ffd469",
  paper: "#fff4dd",
  ink: "#382346",
  muted: "#786287",
  line: "#d8bd97",
  red: "#e62639",
  green: "#198657",
  lilac: "#f0dff8",
};
export function Action({
  children,
  label,
  onPress,
  disabled,
  busy,
  secondary,
  danger,
  small,
  purple,
  icon,
  style,
}: {
  children: React.ReactNode;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
  danger?: boolean;
  small?: boolean;
  purple?: boolean;
  icon?: string;
  arrow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  useLanguage();
  return (
    <GameButton
      label={label}
      onPress={onPress}
      disabled={disabled}
      busy={busy}
      glyph={icon}
      small={small}
      tone={danger ? "red" : secondary ? "cyan" : purple ? "purple" : "gold"}
      style={style}
    >
      {children || (icon === "minus" ? "−" : icon === "plus" ? "+" : "↻")}
    </GameButton>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  light = false,
  goldRim = false,
}: {
  name: string;
  label: string;
  onPress: () => void;
  light?: boolean;
  goldRim?: boolean;
  boxed?: boolean;
}) {
  useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 24,
        borderWidth: 1.5,
        borderBottomWidth: 3,
        borderColor: goldRim ? "#ffe48d" : light ? "#dca1ff" : "#fff2b0",
        borderBottomColor: goldRim ? "#976017" : light ? "#3b096c" : "#a26416",
        backgroundColor: light ? "#7733a9" : "#ffdb78",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        elevation: 3,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      {goldRim ? (
        <LinearGradient
          pointerEvents="none"
          colors={["#733aa0", "#43176c", "#29083f"]}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <GameFinish tone={light ? "purple" : "gold"} radius={24} />
      )}
      {name === "settings" ? (
        <GoldGear />
      ) : (
        <Icon
          name={name}
          color={goldRim ? "#ffe59b" : light ? "#fff3e6" : color.plum}
          size={24}
        />
      )}
    </Pressable>
  );
}
export function Brand({ small }: { small?: boolean }) {
  useLanguage();
  return (
    <Text
      style={{
        fontSize: small ? 22 : 28,
        color: color.gold,
        fontWeight: "900",
      }}
    >
      Tambola Circle
    </Text>
  );
}
export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  hideHeader?: boolean;
  illustration?: "tickets" | "family" | "join";
}) {
  useLanguage();
  return (
    <View style={ui.header}>
      {onBack && (
        <IconButton name="back" label={tr("Back")} onPress={onBack} light />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.2}
          style={{
            color: "#fff4d5",
            fontSize: 20,
            lineHeight: 24,
            includeFontPadding: false,
            fontFamily: gameFont.bold,
            textShadowColor: "#230039",
            textShadowOffset: { width: 1, height: 2 },
            textShadowRadius: 2,
          }}
        >
          {title ?? "Tambola Circle"}
        </Text>
        {subtitle && (
          <Text style={{ color: "#e8d3fa", fontSize: 11 }}>{subtitle}</Text>
        )}
      </View>
      {right}
    </View>
  );
}
export function Avatar({
  name,
  size = 44,
  online,
  index,
  avatarId,
  photo,
}: {
  name: string;
  size?: number;
  online?: boolean;
  index?: number;
  avatarId?: number;
  photo?: string;
}) {
  useLanguage();
  return (
    <View accessibilityLabel={name} style={{ width: size, height: size }}>
      <GameAvatar
        photo={photo}
        index={
          avatarId ??
          index ??
          [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 6
        }
        size={size}
      />
      {online !== undefined && (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: online ? "#4ade80" : "#938699",
            borderWidth: 2,
            borderColor: "#fff4dd",
          }}
        />
      )}
    </View>
  );
}
export function Pill({
  children,
  tone = "purple",
}: {
  children: React.ReactNode;
  tone?: "purple" | "green" | "gold" | "red";
}) {
  useLanguage();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: {
          purple: "#e5cdf4",
          green: "#c9f1d3",
          gold: "#ffdf91",
          red: "#ffced5",
        }[tone],
      }}
    >
      <Text style={{ fontSize: 12, color: color.plum, fontWeight: "800" }}>
        {children}
      </Text>
    </View>
  );
}
export function Notice({
  children,
  icon = "info",
  tone = "purple",
}: {
  children: React.ReactNode;
  icon?: string;
  tone?: "purple" | "gold" | "red" | "green";
}) {
  useLanguage();
  return (
    <View
      style={[
        ui.banner,
        ui.row,
        {
          backgroundColor: {
            purple: "#ead4f4",
            gold: "#ffe6a3",
            red: "#ffd9df",
            green: "#d9f0cb",
          }[tone],
        },
      ]}
    >
      <Icon name={icon} size={24} color={color.violet} />
      <View style={{ flex: 1 }}>
        {typeof children === "string" ? (
          <Text style={ui.text}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
export function Segments({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  useLanguage();
  return (
    <View style={ui.segments}>
      {options.map((o) => (
        <GameButton
          key={o.value}
          small
          style={{ flex: 1 }}
          tone={value === o.value ? "gold" : "purple"}
          onPress={() => onChange(o.value)}
        >
          {o.label}
        </GameButton>
      ))}
    </View>
  );
}
type TicketPreferences = Pick<
  GamePreferences,
  "markColor" | "stars" | "reducedMotion" | "largeNumbers"
>;
type TicketCellProps = {
  number: number | null;
  marked: boolean;
  selected: boolean;
  cell: number;
  onAction?: (cell: number) => void;
  compact?: boolean;
  preferences: TicketPreferences;
};
function ticketCellStyle({
  number,
  selected,
  compact,
  preferences,
}: TicketCellProps): ViewStyle {
  return {
    flex: 1,
    minWidth: 0,
    height: preferences.largeNumbers ? 44 : 33,
    borderWidth: selected ? 1.5 : 0,
    borderColor: color.red,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: number || compact ? "transparent" : "#a9804020",
  };
}
function TicketNumber({
  number,
  marked,
  compact,
  preferences,
}: Pick<TicketCellProps, "number" | "marked" | "compact" | "preferences">) {
  return (
    <>
      {!!number && (
        <View
          pointerEvents="none"
          style={{
            width: "94%",
            height: preferences.largeNumbers ? 38 : 29,
            maxWidth: preferences.largeNumbers ? 38 : 29,
            borderRadius: 24,
            backgroundColor: marked ? preferences.markColor : "transparent",
            borderWidth: marked ? 1 : 0,
            borderColor: "#ffffff80",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            style={{
              fontSize: preferences.largeNumbers ? 24 : compact ? 18 : 19,
              fontFamily: compact ? gameFont.medium : undefined,
              lineHeight: preferences.largeNumbers ? 30 : 24,
              includeFontPadding: false,
              fontWeight: compact ? undefined : "800",
              color: marked ? "#fff" : compact ? "#211b19" : "#30212d",
              fontVariant: ["tabular-nums"],
            }}
          >
            {number}
          </Text>
        </View>
      )}
    </>
  );
}
// Read-only strips and blank cells have no gesture/animation subscriptions.
const StaticTicketCell = React.memo(function StaticTicketCell(
  props: TicketCellProps & { label: string },
) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={props.label}
      accessibilityState={{ selected: props.marked }}
      style={ticketCellStyle(props)}
    >
      <TicketNumber {...props} />
    </View>
  );
});
const TicketCell = React.memo(function TicketCell({
  number,
  marked,
  selected,
  cell,
  onAction,
  compact = false,
  preferences,
}: TicketCellProps) {
  useLanguage();
  const pop = useRef(new Animated.Value(0)).current,
    previous = useRef(marked);
  // An invisible transformed Text can still distort Android's hit testing.
  // Mount decoration only during the celebration, under a non-touchable View.
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const celebrate =
      marked &&
      !previous.current &&
      preferences.stars &&
      !preferences.reducedMotion;
    previous.current = marked;
    if (!celebrate) {
      setCelebrating(false);
      return;
    }
    let active = true;
    setCelebrating(true);
    pop.setValue(1);
    const animation = Animated.timing(pop, {
      toValue: 0,
      duration: 650,
      useNativeDriver: true,
    });
    animation.start(() => {
      if (active) setCelebrating(false);
    });
    return () => {
      active = false;
      animation.stop();
    };
  }, [marked, pop, preferences.stars, preferences.reducedMotion]);
  return (
    <Pressable
      accessibilityRole={onAction && number ? "button" : "text"}
      accessibilityLabel={
        number ? `${number}${marked ? ", " + tr("marked") : ""}` : tr("Blank")
      }
      accessibilityState={{ selected: marked, disabled: !number || !onAction }}
      disabled={!number || !onAction}
      pressRetentionOffset={0}
      onPress={() => onAction?.(cell)}
      style={ticketCellStyle({
        number,
        marked,
        selected,
        cell,
        compact,
        preferences,
      })}
    >
      <TicketNumber
        number={number}
        marked={marked}
        compact={compact}
        preferences={preferences}
      />
      {celebrating && (
        <Animated.View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -7,
            right: -3,
            opacity: pop,
            transform: [
              {
                scale: pop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.7, 0.7],
                }),
              },
              {
                translateY: pop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-14, 0],
                }),
              },
            ],
          }}
        >
          <Text style={{ color: "#ffc521", fontSize: 26 }}>✦</Text>
        </Animated.View>
      )}
    </Pressable>
  );
});
const TicketGrid = React.memo(function TicketGrid({
  solid,
}: {
  solid: boolean;
}) {
  useLanguage();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 99"
        preserveAspectRatio="none"
      >
        <Rect
          x={0.5}
          y={0.5}
          width={359}
          height={98}
          rx={3}
          fill="none"
          stroke="#92734f"
          strokeWidth={0.75}
          strokeDasharray={solid ? undefined : "3 2"}
        />
        {Array.from({ length: 8 }, (_, i) => (
          <Line
            key={i}
            x1={(i + 1) * 40}
            x2={(i + 1) * 40}
            y1={0}
            y2={99}
            stroke="#92734f"
            strokeWidth={0.65}
            strokeDasharray={solid ? undefined : "3 2"}
          />
        ))}
        {[33, 66].map((y) => (
          <Line
            key={y}
            x1={0}
            x2={360}
            y1={y}
            y2={y}
            stroke="#92734f"
            strokeWidth={0.65}
            strokeDasharray={solid ? undefined : "3 2"}
          />
        ))}
      </Svg>
    </View>
  );
});
function TicketPanelView({
  panel,
  index,
  count,
  marks,
  onMark,
  onWin,
  showWinButton = true,
  highlights = [],
  onSelect,
  title,
  saved = true,
  compact = false,
}: {
  panel: Panel;
  index: number;
  count: number;
  marks: Record<string, boolean>;
  onMark?: (cell: number) => void;
  onWin?: () => void;
  showWinButton?: boolean;
  highlights?: number[];
  onSelect?: (cell: number) => void;
  title?: string;
  saved?: boolean;
  compact?: boolean;
}) {
  useLanguage();
  const preferences = useGamePreferences(
    useShallow((p) => ({
      markColor: p.markColor,
      stars: p.stars,
      reducedMotion: p.reducedMotion,
      largeNumbers: p.largeNumbers,
    })),
  );
  const actionRef = useRef(onSelect ?? onMark);
  actionRef.current = onSelect ?? onMark;
  const action = useCallback((cell: number) => actionRef.current?.(cell), []);
  const marked = panel
    .flat()
    .reduce<number>(
      (sum, n, cell) => sum + (n && marks[cellKey(index, cell)] ? 1 : 0),
      0,
    );
  return (
    <PaperSurface
      ticket
      style={{
        paddingHorizontal: 7,
        paddingTop: compact ? 3 : 4,
        paddingBottom: compact ? 7 : 8,
        marginBottom: 2,
      }}
    >
      <View
        style={[
          ui.row,
          {
            minHeight: onWin ? 31 : 24,
            marginBottom: 0,
            gap: 5,
            paddingHorizontal: 5,
            borderWidth: onWin ? 0.7 : 0,
            borderColor: "#c6a171",
            borderRadius: 10,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            flex: 1,
            minWidth: 0,
          }}
        >
          {!onWin && (
            <View style={{ transform: [{ rotate: "-12deg" }] }}>
              <Icon name="ticket" size={16} color={color.plum} />
            </View>
          )}
          <Text
            numberOfLines={1}
            accessibilityLabel={
              title ?? tr("Ticket {v0} of {v1}", { v0: index + 1, v1: count })
            }
            maxFontSizeMultiplier={1.15}
            style={[
              ui.ticketTitle,
              compact && {
                fontFamily: gameFont.medium,
                fontWeight: undefined,
                fontSize: 15,
                color: onWin ? "#21160c" : color.plum,
              },
            ]}
          >
            {title ?? tr("Ticket {v0}", { v0: index + 1 })}
          </Text>
        </View>
        {onWin && (
          <>
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 1,
                borderWidth: 0.8,
                borderColor: "#c79559",
                borderRadius: 14,
                backgroundColor: "#fff7df",
              }}
            >
              <Text
                accessibilityLabel={tr("{v0} of 15 marked", { v0: marked })}
                style={{
                  color: "#472617",
                  fontSize: 13,
                  fontFamily: gameFont.medium,
                }}
              >
                {marked} / 15
              </Text>
            </View>
            <View
              accessibilityLiveRegion="polite"
              accessibilityLabel={
                saved ? tr("Ticket saved") : tr("Saving ticket")
              }
              style={{
                width: 47,
                flexDirection: "row",
                gap: 3,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 9,
                  borderRadius: 5,
                  borderWidth: 0.8,
                  borderColor: saved ? "#158d62" : "#b87725",
                  backgroundColor: saved ? "#26d689" : "#e7b349",
                }}
              />
              <Text
                style={{
                  color: "#302019",
                  fontFamily: gameFont.medium,
                  fontSize: 10,
                }}
              >
                {saved ? tr("Saved") : tr("Saving")}
              </Text>
            </View>
            {showWinButton && <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr("Full house, Ticket {v0}", {
                v0: index + 1,
              })}
              onPress={onWin}
              style={({ pressed }) => ({
                height: 27,
                minWidth: 81,
                paddingHorizontal: 6,
                borderRadius: 10,
                borderWidth: 1,
                borderBottomWidth: 2.5,
                borderColor: "#fff3a3",
                borderBottomColor: "#b97415",
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <LinearGradient
                colors={["#fff598", "#ffcf38", "#ffc222"]}
                style={StyleSheet.absoluteFill}
              />
              <Text
                style={{
                  color: "#281400",
                  fontFamily: gameFont.medium,
                  fontSize: 13,
                }}
              >
                {tr("Full house!")}
              </Text>
            </Pressable>}
          </>
        )}
      </View>
      <View style={{ borderRadius: 7, overflow: "hidden" }}>
        {panel.map((row, r) => (
          <View key={r} style={{ flexDirection: "row" }}>
            {row.map((number, c) => {
              const cell = r * 9 + c;
              const props = {
                cell,
                compact,
                number,
                marked: !!marks[cellKey(index, cell)],
                selected: highlights.includes(cell),
                preferences,
              };
              return number && (onSelect || onMark) ? (
                <TicketCell key={c} {...props} onAction={action} />
              ) : (
                <StaticTicketCell
                  key={c}
                  {...props}
                  label={
                    number
                      ? `${number}${props.marked ? ", " + tr("marked") : ""}`
                      : tr("Blank")
                  }
                />
              );
            })}
          </View>
        ))}
        <TicketGrid solid={!!onWin} />
      </View>
    </PaperSurface>
  );
}
type TicketProps = React.ComponentProps<typeof TicketPanelView>;
export const TicketPanel = React.memo(
  TicketPanelView,
  (a: TicketProps, b: TicketProps) => {
    if (
      a.index !== b.index ||
      a.count !== b.count ||
      a.saved !== b.saved ||
      a.compact !== b.compact ||
      a.title !== b.title ||
      a.onMark !== b.onMark ||
      a.onSelect !== b.onSelect ||
      a.onWin !== b.onWin
      || a.showWinButton !== b.showWinButton
    )
      return false;
    for (let cell = 0; cell < 27; cell++) {
      if (
        a.panel[Math.floor(cell / 9)]?.[cell % 9] !==
          b.panel[Math.floor(cell / 9)]?.[cell % 9] ||
        !!a.marks[cellKey(a.index, cell)] !==
          !!b.marks[cellKey(b.index, cell)] ||
        !!a.highlights?.includes(cell) !== !!b.highlights?.includes(cell)
      )
        return false;
    }
    return true;
  },
);
export function Sheet({
  title,
  children,
  onClose,
  full = false,
  right,
  hideHeader = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  full?: boolean;
  right?: React.ReactNode;
  hideHeader?: boolean;
  illustration?: "tickets" | "family" | "join";
}) {
  useLanguage();
  const navigation = useScreenNavigation();
  if (full && navigation)
    return (
      <GameBackground>
        <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
          {!hideHeader && (
            <PageHeader title={title} onBack={onClose} right={right} />
          )}
          <View style={{ flex: 1, paddingHorizontal: 12, gap: 10 }}>
            {children}
          </View>
        </SafeAreaView>
      </GameBackground>
    );
  return (
    <Modal
      visible
      transparent
      hardwareAccelerated
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: "#170527b3",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Pressable
            accessibilityLabel={tr("Close overlay")}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 576,
              height: full ? "100%" : undefined,
              maxHeight: full ? "100%" : "90%",
              borderRadius: full ? 0 : 26,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "#d7a65a",
            }}
          >
            <GameBackground
              style={{
                flex: full ? 1 : undefined,
                flexShrink: 1,
                paddingTop: full ? 0 : 8,
              }}
            >
              <SafeAreaView
                edges={full ? ["top", "bottom"] : ["bottom"]}
                style={{
                  flex: full ? 1 : undefined,
                  flexShrink: 1,
                  paddingBottom: 12,
                }}
              >
                {!hideHeader && (
                  <PageHeader title={title} onBack={onClose} right={right} />
                )}
                <View
                  style={{
                    flex: full ? 1 : undefined,
                    flexShrink: 1,
                    paddingHorizontal: 12,
                    gap: 10,
                  }}
                >
                  {children}
                </View>
              </SafeAreaView>
            </GameBackground>
          </View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
export const ui = StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: "transparent" },
  body: { padding: 12, gap: 12, paddingBottom: 20, flexGrow: 1 },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brand: { fontSize: 22, fontWeight: "800", color: color.gold },
  heading: {
    fontSize: 20,
    lineHeight: 25,
    color: color.plum,
    fontWeight: "800",
    flexShrink: 1,
  },
  text: { color: color.ink, fontSize: 14, lineHeight: 19 },
  muted: { color: color.muted, fontSize: 12, lineHeight: 16 },
  card: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#fff1d7",
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: "#e8bc6d",
    gap: 10,
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#c5a574",
    backgroundColor: "#fff9e9",
    color: color.ink,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  action: { padding: 12 },
  timer: {
    padding: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#d7a64a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  ticket: {
    borderWidth: 1,
    borderColor: "#d6b573",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingTop: 3,
    paddingBottom: 7,
    marginBottom: 3,
  },
  ticketTitle: { color: color.plum, fontSize: 14, fontWeight: "800" },
  banner: { padding: 10, borderRadius: 14 },
  error: { backgroundColor: "#ffd9df", padding: 10, borderRadius: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  segments: { flexDirection: "row", gap: 6 },
  divider: { height: 1, backgroundColor: color.line, marginVertical: 6 },
});
export { Text, View, Pressable, Icon, FooterWave, GameIcon };
export function Countdown({
  deadline,
  serverNow,
  label,
  compact = false,
  hero = false,
}: {
  deadline: number;
  serverNow: number;
  label: string;
  compact?: boolean;
  hero?: boolean;
}) {
  useLanguage();
  const [base, setBase] = useState({
    server: serverNow,
    monotonic: performance.now(),
  });
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setBase({ server: serverNow, monotonic: performance.now() });
    setNow(serverNow);
  }, [serverNow]);
  useEffect(() => {
    const id = setInterval(
      () => setNow(base.server + performance.now() - base.monotonic),
      250,
    );
    return () => clearInterval(id);
  }, [base]);
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000)),
    text = `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`,
    tint = seconds <= 10 ? color.red : color.plum;
  if (compact)
    return (
      <Text
        accessibilityLabel={
          label + ": " + tr("{seconds} seconds remaining", { seconds })
        }
        style={{
          color: tint,
          fontSize: 13,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
        }}
      >
        {text}
      </Text>
    );
  return (
    <View
      style={[
        ui.timer,
        { backgroundColor: seconds <= 10 ? "#ffe4e7" : "#fae2a9" },
        hero && {
          alignSelf: "center",
          flexDirection: "column",
          gap: 1,
          paddingHorizontal: 28,
          paddingVertical: 9,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="clock" size={20} color={tint} />
        <Text
          style={{ color: tint, fontSize: hero ? 15 : 12, fontWeight: "600" }}
        >
          {label}
        </Text>
      </View>
      <Text
        accessibilityLabel={
          label + ": " + tr("{seconds} seconds remaining", { seconds })
        }
        maxFontSizeMultiplier={1.2}
        style={{
          color: tint,
          fontSize: hero ? 40 : 23,
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
          letterSpacing: hero ? 1 : 0,
        }}
      >
        {text}
      </Text>
      {seconds === 0 && <Text style={ui.muted}>{tr("Resolving…")}</Text>}
    </View>
  );
}
