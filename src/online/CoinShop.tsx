import { t as tr, useLanguage } from "../i18n";
import React, { useEffect, useRef, useState } from "react";
import { RefreshControl, StyleSheet } from "react-native";
import {
  Action,
  GameIcon,
  Icon,
  Notice,
  Pressable,
  ScrollView,
  Text,
  View,
} from "./components";
import { CoinPile, GameButton, GameLogo } from "../components/GameArtwork";
import { LinearGradient } from "../components/LinearGradient";
import { PaperSurface } from "../components/PaperSurface";
import { gameFont } from "../gameTypography";
import * as Crypto from "../native/crypto";
import type { OnlineModel } from "./useOnline";
import { CoinPlansSkeleton } from "../navigation/skeletons";

const coinCount = (value: number | undefined) =>
  Number.isFinite(value) && value! > 0 ? Math.floor(value!) : 0;
export function CoinShopBalance({ balance }: { balance?: number }) {
  useLanguage();
  return (
    <View style={{ alignItems: "flex-end", gap: 3 }}>
      <LinearGradient
        colors={["#fff98f", "#ffd73b", "#ec9b13"]}
        style={styles.balance}
      >
        <GameIcon index={3} size={35} />
        <Text
          accessibilityLabel={tr("{v0} coins", {
            v0: coinCount(balance).toLocaleString(),
          })}
          style={styles.balanceNumber}
        >
          {coinCount(balance).toLocaleString()}
        </Text>
      </LinearGradient>
      <Text style={styles.balanceHint}>{tr("Play credits · no cash-out")}</Text>
    </View>
  );
}

export function CoinsContent({
  model,
  onHistory,
}: {
  model: OnlineModel;
  onHistory?: () => void;
}) {
  useLanguage();
  const ids = useRef<Record<string, string>>({}),
    [receipt, setReceipt] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    void model.refreshCatalog();
    void model.refreshWallet();
  }, [model.refreshCatalog, model.refreshWallet]);
  const plans = model.catalog?.plans ?? [],
    pack =
      plans.find((p) => p.id === selected) ??
      plans.find((p) => p.recommended) ??
      plans[0];
  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([model.refreshWallet(), model.refreshCatalog()]);
    } finally {
      setRefreshing(false);
    }
  }
  function buy() {
    if (!pack) return;
    const id =
      ids.current[pack.id] ?? (ids.current[pack.id] = Crypto.randomUUID());
    void model.buyCoins(pack.id, id).then((credited) => {
      if (credited !== undefined) {
        delete ids.current[pack.id];
        setReceipt(
          tr("{count} coins added. No charge.", {
            count: credited.toLocaleString(),
          }),
        );
      }
    });
  }
  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor="#ffe365"
            colors={["#8637cf"]}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <GameLogo width={180} />
          <Text style={styles.tagline}>
            {tr("More fun. More rounds together!")}
          </Text>
        </View>
        {!model.catalog && !model.catalogError && <CoinPlansSkeleton />}
        {!!model.catalogError && (
          <Notice tone="red">
            <Text style={styles.error}>{tr("Coin packs couldn’t load.")}</Text>
            <Action
              small
              onPress={() => {
                void model.refreshCatalog();
              }}
            >
              {tr("Retry packs")}
            </Action>
          </Notice>
        )}
        {model.catalog && !plans.length && (
          <Notice>{tr("No coin packs are available right now.")}</Notice>
        )}
        <View style={styles.plans}>
          {plans.map((p) => {
            const chosen = pack?.id === p.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="radio"
                accessibilityLabel={tr("{v0}, {v1} test coins", {
                  v0: p.label,
                  v1: p.coins,
                })}
                accessibilityState={{ checked: chosen, disabled: model.busy }}
                disabled={model.busy}
                onPress={() => {
                  setSelected(p.id);
                  setReceipt("");
                }}
                style={[styles.plan, chosen && styles.selectedPlan]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={
                    chosen
                      ? ["#fff9c3", "#ffe98c", "#ffc62d"]
                      : ["#fffaf0", "#f6e6c8"]
                  }
                  style={StyleSheet.absoluteFill}
                />
                <View collapsable={false} style={styles.planBody}>
                  <CoinPile index={p.artwork} size={64} />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={1.1}
                    style={styles.planCoins}
                  >
                    {p.coins.toLocaleString()} {tr("coins")}
                  </Text>
                  <LinearGradient
                    colors={["#11c6ce", "#009bab", "#007185"]}
                    style={styles.freeBadge}
                  >
                    <Text style={styles.freeText}>{tr("Free")}</Text>
                  </LinearGradient>
                  <View style={styles.selection}>
                    <Icon
                      name={chosen ? "check" : "coins"}
                      size={12}
                      color="#602607"
                    />
                    <Text numberOfLines={1} style={styles.selectedText}>
                      {chosen ? tr("Selected") : p.label}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        {pack && (
          <>
            <PaperSurface style={styles.packSummary}>
              <CoinPile index={pack.artwork} size={65} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryCoins}>
                  {pack.coins.toLocaleString()} {tr("coins")}
                </Text>
                <Text style={styles.freeSummary}>{tr("Free test pack")}</Text>
              </View>
            </PaperSurface>
            <GameButton
              busy={!!model.pending?.purchase}
              disabled={
                model.busy ||
                model.catalogLoading ||
                !!model.catalogError ||
                !model.catalog?.testMode
              }
              onPress={buy}
              style={styles.buy}
            >
              {model.busy ? tr("Adding coins…") : tr("Get test coins")}
            </GameButton>
          </>
        )}
        <Text style={styles.testHint}>
          {model.catalog && !model.catalog.testMode
            ? tr("Coin purchases are currently unavailable.")
            : tr("Free test coins · No payment")}
        </Text>
        {!!receipt && (
          <Text accessibilityLiveRegion="polite" style={styles.receipt}>
            {receipt}
          </Text>
        )}
        {!!model.wallet?.held && (
          <Text style={styles.testHint}>
            {model.wallet.held.toLocaleString()}{" "}
            {tr("coins reserved for ready tickets")}
          </Text>
        )}
        <Text style={styles.deferred}>
          {tr("Payments and rewarded ads · Coming later")}
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  balance: {
    minWidth: 123,
    height: 39,
    paddingRight: 13,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#ffe997",
    borderBottomWidth: 3,
    borderBottomColor: "#a7650a",
  },
  balanceNumber: { color: "#422006", fontFamily: gameFont.bold, fontSize: 22 },
  balanceHint: { color: "#ead6f7", fontFamily: gameFont.medium, fontSize: 10 },
  content: { gap: 10, paddingBottom: 16 },
  hero: { alignItems: "center", gap: 3, paddingBottom: 1 },
  tagline: {
    fontFamily: gameFont.medium,
    color: "#fff7e9",
    fontSize: 16,
    textAlign: "center",
  },
  error: { fontFamily: gameFont.medium, color: "#602036", fontSize: 15 },
  plans: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
    paddingTop: 2,
  },
  plan: {
    flexGrow: 1,
    flexBasis: "29%",
    minWidth: 86,
    borderRadius: 17,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: "#fff0c8",
    borderBottomColor: "#ad8153",
    backgroundColor: "#fff0d3",
    overflow: "hidden",
  },
  selectedPlan: {
    borderColor: "#fff344",
    borderBottomColor: "#d68705",
    borderWidth: 2,
  },
  planBody: { alignItems: "center", padding: 5, gap: 3 },
  planCoins: { fontFamily: gameFont.medium, fontSize: 16, color: "#35142c" },
  freeBadge: {
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    paddingVertical: 4,
    borderWidth: 0.7,
    borderColor: "#81f4ef",
  },
  freeText: { fontFamily: gameFont.bold, color: "#fffdf1", fontSize: 19 },
  selection: { flexDirection: "row", gap: 3, alignItems: "center", height: 18 },
  selectedText: {
    flexShrink: 1,
    color: "#632d0d",
    fontFamily: gameFont.medium,
    fontSize: 10,
  },
  packSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 22,
    backgroundColor: "#fff2d7",
    overflow: "hidden",
    padding: 9,
  },
  summaryCoins: { color: "#351244", fontFamily: gameFont.bold, fontSize: 26 },
  freeSummary: { color: "#7c24b6", fontFamily: gameFont.medium, fontSize: 21 },
  buy: { minHeight: 57, borderRadius: 29 },
  testHint: {
    textAlign: "center",
    color: "#f0d8ff",
    fontFamily: gameFont.medium,
    fontSize: 12,
  },
  receipt: {
    textAlign: "center",
    color: "#92ffb8",
    fontFamily: gameFont.medium,
    fontSize: 14,
  },
  deferred: {
    color: "#d6b3ec",
    fontFamily: gameFont.medium,
    fontSize: 10,
    textAlign: "center",
  },
});
