import React, { useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { t as tr, useLanguage } from "../i18n";
import { Text } from "../i18n/Text";
import { gameFont } from "../gameTypography";
import { setGamePreferences, useGamePreferences } from "../gamePreferences";
import { GameSlider } from "./GameControls";
import { GameFinish } from "./GameFinish";
import { Icon } from "./CircleArtwork";
import { LinearGradient } from "./LinearGradient";
import { Pressable } from "./Pressable";

export function CallerVolume({
  sound = true,
  onSound,
}: {
  sound?: boolean;
  onSound?: (enabled: boolean) => void;
}) {
  useLanguage();
  const saved = useGamePreferences((s) => s.voiceVolume),
    volume = sound ? saved : 0;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("Caller volume {v0} percent", {
          v0: Math.round(volume * 100),
        })}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          width: 46,
          height: 48,
          marginBottom: 3,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: "#ffdb70",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <GameFinish tone="purple" radius={24} />
          <Icon name={volume ? "sound" : "muted"} color="#fff4d5" size={26} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: "#fff3a1",
            backgroundColor: "#ffd443",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: "#381046",
              fontFamily: gameFont.bold,
              fontSize: 10,
            }}
          >
            {Math.round(volume * 100)}%
          </Text>
        </View>
      </Pressable>
      <Modal
        visible={open}
        transparent
        hardwareAccelerated
        statusBarTranslucent
        navigationBarTranslucent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#19042e40",
            padding: 25,
          }}
        >
          <Pressable
            accessibilityLabel={tr("Close caller control")}
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["#6f2895", "#310a4b"]}
            style={{
              width: "100%",
              maxWidth: 320,
              borderRadius: 25,
              borderWidth: 2,
              borderColor: "#ffd970",
              paddingHorizontal: 12,
              paddingVertical: 5,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
            accessibilityViewIsModal
          >
            <Icon name="sound" color="#ffdf78" size={22} />
            <GameSlider
              label={tr("Caller volume")}
              value={volume}
              onChange={(value) => {
                setGamePreferences({ voiceVolume: value });
                onSound?.(value > 0);
              }}
            />
            <Text
              style={{
                color: "#fff3da",
                fontFamily: gameFont.medium,
                fontSize: 14,
                minWidth: 37,
              }}
            >
              {Math.round(volume * 100)}%
            </Text>
          </LinearGradient>
        </View>
      </Modal>
    </>
  );
}

export function CallProgress({
  count,
  compact = false,
}: {
  count: number;
  compact?: boolean;
}) {
  useLanguage();
  if (compact)
    return (
      <View
        accessibilityLabel={tr("{v0} called, {v1} left", {
          v0: count,
          v1: 90 - count,
        })}
        style={{
          flex: 1,
          height: 30,
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#9654be",
          backgroundColor: "#290642",
          overflow: "hidden",
        }}
      >
        {(
          [
            [count, "called", "#43e1f4"],
            [90 - count, "left", "#ffe166"],
          ] as const
        ).map(([value, label, color]) => (
          <View
            key={label}
            style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}
          >
            <Text
              maxFontSizeMultiplier={1.1}
              style={{
                fontFamily: gameFont.bold,
                fontSize: 11,
                lineHeight: 13,
                color,
              }}
            >
              {value}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.1}
              style={{ ...progressText, fontSize: 8, lineHeight: 10 }}
            >
              {tr(label)}
            </Text>
          </View>
        ))}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            width: `${(count / 90) * 100}%`,
            backgroundColor: "#1dd6ef",
          }}
        />
      </View>
    );
  return (
    <View
      accessibilityLabel={tr("{v0} called, {v1} left", {
        v0: count,
        v1: 90 - count,
      })}
      style={{
        height: 25,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 9,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#9654be",
        backgroundColor: "#290642",
      }}
    >
      <Text style={progressText}>
        <Text style={{ color: "#43e1f4" }}>{count}</Text> {tr("called")}
      </Text>
      <View
        style={{
          flex: 1,
          height: 7,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: "#9850c7",
          backgroundColor: "#1c0333",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${(count / 90) * 100}%`,
            height: "100%",
            backgroundColor: "#1dd6ef",
          }}
        />
      </View>
      <Text style={progressText}>
        <Text style={{ color: "#ffe166" }}>{90 - count}</Text> {tr("left")}
      </Text>
    </View>
  );
}
const progressText = {
  fontFamily: gameFont.medium,
  fontSize: 11,
  color: "#dec9f3",
};
