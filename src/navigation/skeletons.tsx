import { t as tr, useLanguage } from "../i18n";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useStore } from "zustand";
import { gamePreferencesStore } from "../gamePreferences";

// One native opacity animation per placeholder group keeps the loading state
// visible without scheduling a JavaScript frame for each card or cell.
function Pulse({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  useLanguage();
  const opacity = useRef(new Animated.Value(0.64)).current;
  const reducedMotion = useStore(
    gamePreferencesStore,
    (state) => state.reducedMotion,
  );
  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.64,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);
  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      pointerEvents="none"
      style={[style, { opacity }]}
    >
      {children}
    </Animated.View>
  );
}
function Block({
  width,
  height,
  round = 9,
  dark = false,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  round?: number;
  dark?: boolean;
  style?: ViewStyle;
}) {
  useLanguage();
  return (
    <View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: round,
          backgroundColor: dark ? "#b27ed0" : "#e6d1b6",
        },
        style,
      ]}
    />
  );
}

function TableCardShape() {
  useLanguage();
  return (
    <View style={styles.tableFrame}>
      <View style={styles.paper}>
        <View style={styles.row}>
          <Block width={62} height={62} round={32} dark />
          <View style={styles.grow}>
            <Block width="68%" height={22} />
            <Block width="85%" height={15} />
          </View>
        </View>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <View style={styles.row}>
            <Block width={29} height={29} round={16} dark />
            <Block width={29} height={29} round={16} dark />
            <Block width={29} height={29} round={16} dark />
          </View>
          <Block width={108} height={37} round={18} dark />
        </View>
      </View>
    </View>
  );
}

export function TableCardsSkeleton({ history = false }: { history?: boolean }) {
  useLanguage();
  return (
    <Pulse
      label={history ? tr("Loading past games") : tr("Loading tables")}
      style={styles.list}
    >
      <TableCardShape />
      <TableCardShape />
    </Pulse>
  );
}

export function JoinPreviewSkeleton() {
  useLanguage();
  return (
    <Pulse label={tr("Finding table")} style={styles.joinFrame}>
      <View style={styles.joinHead}>
        <Block width="58%" height={25} dark />
        <Block width={70} height={24} round={12} dark />
      </View>
      <View style={styles.joinPaper}>
        <View style={styles.row}>
          <Block width={58} height={58} round={30} dark />
          <View style={styles.grow}>
            <Block width="42%" height={13} />
            <Block width="64%" height={20} />
          </View>
        </View>
        <Block width="100%" height={1} round={0} />
        <View style={styles.row}>
          <Block width="47%" height={43} />
          <Block width="47%" height={43} />
        </View>
        <Block width="100%" height={54} round={27} dark />
      </View>
    </Pulse>
  );
}

export function WalletBalanceSkeleton() {
  useLanguage();
  return (
    <Pulse label={tr("Loading wallet balance")} style={styles.balance}>
      <View style={styles.row}>
        <Block width={100} height={100} round={50} dark />
        <View style={styles.grow}>
          <Block width="76%" height={18} dark />
          <Block width="64%" height={43} dark />
        </View>
      </View>
      <View style={styles.balanceFoot}>
        <Block width={33} height={33} round={17} />
        <Block width="50%" height={15} />
        <Block width={40} height={22} />
      </View>
    </Pulse>
  );
}

export function TransactionRowsSkeleton({
  full = false,
  embedded = false,
}: {
  full?: boolean;
  embedded?: boolean;
}) {
  useLanguage();
  return (
    <Pulse
      label={tr("Loading coin transactions")}
      style={[styles.transactions, embedded && styles.embeddedTransactions]}
    >
      {full && <Block width="65%" height={24} style={{ marginBottom: 5 }} />}
      {Array.from({ length: full ? 5 : 3 }, (_, index) => (
        <View key={index} style={styles.transactionRow}>
          <Block width={40} height={40} round={20} dark />
          <View style={styles.grow}>
            <Block width={index % 2 ? "58%" : "75%"} height={16} />
            <Block width="46%" height={11} />
          </View>
          <Block width={53} height={18} />
        </View>
      ))}
    </Pulse>
  );
}

export function RoomSkeleton() {
  useLanguage();
  return (
    <Pulse label={tr("Opening table")} style={styles.room}>
      <View style={styles.roomHeader}>
        <Block width="56%" height={29} dark />
        <Block width="36%" height={17} dark />
        <View style={styles.row}>
          <Block width={43} height={43} round={22} dark />
          <Block width={43} height={43} round={22} dark />
          <Block width={43} height={43} round={22} dark />
        </View>
      </View>
      <View style={styles.roomTicket}>
        <Block width="48%" height={24} />
        <View style={styles.ticketGrid}>
          {Array.from({ length: 27 }, (_, index) => (
            <Block key={index} height={36} round={3} style={{ width: "10%" }} />
          ))}
        </View>
      </View>
      <Block width="100%" height={56} round={28} dark />
    </Pulse>
  );
}

export function CoinPlansSkeleton() {
  useLanguage();
  return (
    <Pulse label={tr("Loading coin packs")} style={styles.plans}>
      {Array.from({ length: 3 }, (_, index) => (
        <View key={index} style={styles.plan}>
          <Block width={58} height={58} round={30} dark />
          <Block width="85%" height={20} />
          <Block width="74%" height={31} round={16} dark />
        </View>
      ))}
    </Pulse>
  );
}

export function TicketSkeleton() {
  useLanguage();
  return (
    <Pulse label={tr("Preparing your tickets")} style={styles.ticketList}>
      {Array.from({ length: 3 }, (_, panel) => (
        <View key={panel} style={styles.ticketPanel}>
          <View style={styles.ticketLabel}>
            <Block width="34%" height={14} />
            <Block width={29} height={14} />
          </View>
          <View style={styles.ticketCells}>
            {Array.from({ length: 27 }, (_, cell) => (
              <View key={cell} style={styles.ticketCell} />
            ))}
          </View>
        </View>
      ))}
    </Pulse>
  );
}

export function RoundArchiveSkeleton() {
  useLanguage();
  return (
    <Pulse label={tr("Loading game details")} style={styles.archive}>
      <Block width="61%" height={29} dark />
      <Block width="81%" height={18} dark />
      <View style={styles.archiveBoard}>
        <Block width="46%" height={20} />
        <View style={styles.ticketGrid}>
          {Array.from({ length: 30 }, (_, index) => (
            <Block
              key={index}
              height={28}
              round={6}
              style={{ width: "8.8%" }}
            />
          ))}
        </View>
      </View>
    </Pulse>
  );
}

export function ScreenSkeleton({ kind }: { kind?: string }) {
  useLanguage();
  if (kind === "Table") return <RoomSkeleton />;
  if (kind === "Online" || kind === "PastGames")
    return <TableCardsSkeleton history={kind === "PastGames"} />;
  if (kind === "Wallet") return <WalletBalanceSkeleton />;
  if (kind === "Transactions") return <TransactionRowsSkeleton full />;
  if (kind === "PastGame") return <RoundArchiveSkeleton />;
  if (kind === "JoinTable") return <JoinPreviewSkeleton />;
  return (
    <Pulse label={tr("Loading screen")} style={styles.room}>
      <Block width="62%" height={26} dark />
      <Block width="100%" height={174} round={23} />
      <Block width="100%" height={54} round={27} dark />
    </Pulse>
  );
}

const styles = StyleSheet.create({
  block: { opacity: 0.9 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  grow: { flex: 1, gap: 10 },
  list: { paddingHorizontal: 2, gap: 13 },
  tableFrame: {
    backgroundColor: "#c78322",
    borderWidth: 2,
    borderColor: "#ffe789",
    borderBottomWidth: 5,
    borderRadius: 26,
    padding: 3,
  },
  paper: { backgroundColor: "#fff0d3", borderRadius: 21, padding: 12, gap: 16 },
  joinFrame: {
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#b25bed",
    backgroundColor: "#421769",
    overflow: "hidden",
    width: "100%",
  },
  joinHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  joinPaper: {
    backgroundColor: "#fff4df",
    padding: 13,
    gap: 13,
    borderRadius: 22,
  },
  balance: {
    borderRadius: 29,
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: "#ffdc53",
    borderBottomColor: "#e59c18",
    backgroundColor: "#4c1679",
    padding: 15,
    gap: 8,
  },
  balanceFoot: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#fff0d6",
    padding: 8,
    borderRadius: 18,
  },
  transactions: {
    backgroundColor: "#fff2d8",
    borderRadius: 24,
    padding: 12,
    gap: 4,
  },
  embeddedTransactions: { backgroundColor: "transparent", padding: 0 },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 58,
    borderBottomWidth: 0.6,
    borderColor: "#d6c1a9",
  },
  plans: { flexDirection: "row", gap: 7 },
  plan: {
    flex: 1,
    borderRadius: 17,
    backgroundColor: "#fff0d3",
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: "#ead4a8",
    padding: 7,
    alignItems: "center",
    gap: 8,
  },
  ticketList: { gap: 9, paddingHorizontal: 8, paddingVertical: 6 },
  ticketPanel: {
    borderRadius: 13,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: "#d49c48",
    backgroundColor: "#fff1d0",
    padding: 6,
    gap: 5,
  },
  ticketLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketCells: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    justifyContent: "space-between",
  },
  ticketCell: {
    width: "10.3%",
    aspectRatio: 1.1,
    borderRadius: 2,
    borderWidth: 0.7,
    borderColor: "#d2ae76",
    backgroundColor: "#fff9e9",
  },
  room: { padding: 14, gap: 16 },
  roomHeader: {
    backgroundColor: "#4d197d",
    borderRadius: 24,
    padding: 16,
    gap: 13,
  },
  roomTicket: {
    backgroundColor: "#fff0d3",
    borderRadius: 20,
    padding: 12,
    gap: 12,
  },
  ticketGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 3,
  },
  archive: { padding: 14, gap: 12 },
  archiveBoard: {
    backgroundColor: "#fff0d3",
    padding: 12,
    borderRadius: 20,
    gap: 14,
  },
});

/** Compact card placeholders for exact-number search and the invitations inbox. */
export function InvitationSkeleton({ search = false }: { search?: boolean }) {
  return (
    <Pulse
      label={search ? tr("Finding player") : tr("Loading invitations")}
      style={{ gap: 12 }}
    >
      {(search ? [0] : [0, 1]).map((key) => (
        <View key={key} style={styles.paper}>
          <View style={styles.row}>
            <Block width={54} height={54} round={27} dark />
            <View style={styles.grow}>
              <Block width="65%" height={20} />
              <Block width="85%" height={14} />
            </View>
          </View>
          {!search && <Block width="100%" height={40} round={20} dark />}
        </View>
      ))}
    </Pulse>
  );
}
