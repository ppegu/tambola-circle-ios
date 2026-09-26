import { t as tr, useLanguage } from "../i18n";
import React from "react";
import { Modal, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CoinPile, GameButton, GameIcon } from "../components/GameArtwork";
import { LinearGradient } from "../components/LinearGradient";
import { Icon, Pressable, ScrollView, Text, View } from "./components";
import { gameFont } from "../gameTypography";

export function LowCoinsDialog({
  balance,
  cost,
  kind,
  busy,
  onClose,
  onCoins,
  onWatch,
}: {
  balance?: number;
  cost: number;
  kind: "half" | "full";
  busy: boolean;
  onClose: () => void;
  onCoins: () => void;
  onWatch: () => void;
}) {
  useLanguage();
  const available =
      Number.isFinite(balance) && balance! > 0 ? Math.floor(balance!) : 0,
    missing = Math.max(0, cost - available);
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel={tr("Close coin notice")}
            onPress={onClose}
          />
          <View accessibilityViewIsModal style={styles.card}>
            <LinearGradient
              pointerEvents="none"
              colors={["#fffdf5", "#fff1da", "#f4dfbf"]}
              style={StyleSheet.absoluteFill}
            />
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.illustration}>
                <CoinPile index={0} size={91} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr("Close coin notice")}
                  onPress={onClose}
                  style={styles.close}
                >
                  <Icon name="close" size={23} color="#60293b" />
                </Pressable>
              </View>
              <Text style={styles.title}>
                {tr("A few more coins")}
                {"\n"}
                {tr("to play")}
              </Text>
              <View style={styles.amounts}>
                <View style={styles.amountRow}>
                  <Text style={styles.label}>{tr("Your balance")}</Text>
                  <GameIcon index={3} size={27} />
                  <Text style={styles.number}>
                    {available.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.line} />
                <View style={styles.amountRow}>
                  <Text style={styles.label}>
                    {kind === "full" ? tr("Full") : tr("Half")}{" "}
                    {tr("strip entry")}
                  </Text>
                  <GameIcon index={3} size={27} />
                  <Text style={styles.number}>{cost.toLocaleString()}</Text>
                </View>
              </View>
              <Text style={styles.needed}>
                <Text style={styles.missing}>{missing.toLocaleString()}</Text>{" "}
                {tr("more coins needed")}
              </Text>
              <GameButton
                disabled={busy}
                glyph="coins"
                onPress={onCoins}
                style={styles.button}
              >
                {tr("Get coins")}
              </GameButton>
              <GameButton
                disabled={busy}
                tone="cyan"
                glyph="eye"
                onPress={onWatch}
                style={styles.button}
              >
                {tr("Watch game")}
              </GameButton>
              <Text style={styles.hint}>
                {tr("Join this table as a spectator")}
              </Text>
            </ScrollView>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#19052b91",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 350,
    maxHeight: "95%",
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: "#fff6df",
    borderBottomColor: "#cca57a",
    backgroundColor: "#fff1dc",
  },
  content: { padding: 13, gap: 9 },
  illustration: { alignItems: "center", height: 85 },
  close: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: "#d4ad8b",
    backgroundColor: "#f8e6d0",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#301042",
    fontFamily: gameFont.bold,
    fontSize: 27,
    textAlign: "center",
    lineHeight: 30,
  },
  amounts: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ecd2b64a",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 37,
  },
  label: {
    flex: 1,
    color: "#451a55",
    fontFamily: gameFont.medium,
    fontSize: 15,
  },
  number: {
    minWidth: 44,
    color: "#291235",
    fontFamily: gameFont.medium,
    fontSize: 21,
    textAlign: "right",
  },
  line: { height: 0.7, backgroundColor: "#d7baa3" },
  needed: {
    textAlign: "center",
    color: "#341044",
    fontFamily: gameFont.medium,
    fontSize: 17,
    paddingVertical: 2,
  },
  missing: { color: "#e72145", fontFamily: gameFont.bold, fontSize: 27 },
  button: { minHeight: 50, borderRadius: 27 },
  hint: {
    color: "#775b79",
    fontFamily: gameFont.medium,
    fontSize: 13,
    textAlign: "center",
    paddingBottom: 5,
  },
});
