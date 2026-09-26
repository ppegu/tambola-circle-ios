import { t as tr, useLanguage } from "../i18n";
import React from "react";
import { Modal, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GameButton } from "../components/GameArtwork";
import { gameFont } from "../gameTypography";
import { LinearGradient } from "../components/LinearGradient";
import { Pressable, Text, View } from "./components";

export function ExitGameDialog({
  phase,
  onClose,
  onLeave,
}: {
  phase: string;
  onClose: () => void;
  onLeave: () => void;
}) {
  useLanguage();
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.overlay}>
          <Pressable
            accessibilityLabel={tr("Keep playing")}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={styles.card}>
            <LinearGradient
              colors={["#fffef5", "#fff2d8", "#f7dfb5"]}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <Text accessibilityRole="header" style={styles.title}>
              {tr("Leave this table?")}
            </Text>
            <Text style={styles.subtitle}>
              {phase === "lobby"
                ? tr("Any reserved entry coins will be returned.")
                : tr(
                    "Leaving a live round does not refund its entry. You can rejoin from Play online.",
                  )}
            </Text>
            <GameButton glyph="play" onPress={onClose}>
              {tr("Keep playing")}
            </GameButton>
            <GameButton glyph="home" tone="red" onPress={onLeave}>
              {tr("Leave table")}
            </GameButton>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#17052c9c",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: "#ffe970",
    borderBottomColor: "#d79726",
    backgroundColor: "#fff0d6",
    padding: 16,
    gap: 10,
  },
  title: {
    color: "#2a0b42",
    fontFamily: gameFont.bold,
    fontSize: 25,
    textAlign: "center",
  },
  subtitle: {
    color: "#3e264b",
    fontFamily: gameFont.medium,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 3,
  },
});
