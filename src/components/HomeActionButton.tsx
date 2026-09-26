import { Text } from "../i18n/Text";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Pressable } from "./Pressable";
import { GameIcon } from "./GameArtwork";
import { LinearGradient } from "./LinearGradient";
import Svg, { Path } from "react-native-svg";
import { gameFont } from "../gameTypography";

const palettes = {
  gold: {
    fill: ["#ffff83", "#ffe434", "#ffb915"],
    edge: "#fff77d",
    base: "#b96906",
    ink: "#492000",
  },
  purple: {
    fill: ["#b84bff", "#8b27d9", "#591092"],
    edge: "#50f7ff",
    base: "#241039",
    ink: "#fff8ec",
  },
  paper: {
    fill: ["#fffef7", "#fcf1dc", "#ecd2a8"],
    edge: "#fff6db",
    base: "#b88965",
    ink: "#2c1040",
  },
} as const;

/** Home-sized controls leave room for the illustrations in the approved design. */
export function HomeActionButton({
  label,
  icon,
  tone = "gold",
  height,
  onPress,
}: {
  label: string;
  icon: number;
  tone?: keyof typeof palettes;
  height: number;
  onPress: () => void;
}) {
  const palette = palettes[tone];
  const radius = height * 0.29;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        height,
        borderRadius: radius,
        backgroundColor: palette.base,
        borderWidth: tone === "purple" ? 2.5 : 1.5,
        borderColor: palette.edge,
        padding: tone === "purple" ? 3 : 2,
        paddingBottom: 6,
        elevation: pressed ? 2 : 7,
        shadowColor: "#160323",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        transform: [{ translateY: pressed ? 3 : 0 }],
      })}
    >
      <LinearGradient
        colors={palette.fill}
        style={{
          flex: 1,
          borderRadius: radius - 5,
          borderWidth: 1,
          borderColor: tone === "purple" ? "#d584ff" : "#fff9ba",
          justifyContent: "center",
        }}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius - 6,
              borderTopWidth: 2,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: tone === "purple" ? "#e6b4ff99" : "#ffffffaa",
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 6,
            left: 8,
            width: 22,
            height: 9,
            borderRadius: 8,
            backgroundColor: "#ffffff80",
            transform: [{ rotate: "-34deg" }],
          }}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 9,
            gap: 5,
          }}
        >
          <GameIcon index={icon} size={height * 0.86} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            maxFontSizeMultiplier={1.15}
            style={{
              flex: 1,
              color: palette.ink,
              fontFamily: gameFont.bold,
              fontSize: Math.min(29, height * 0.3),
              includeFontPadding: false,
              textShadowColor: tone === "purple" ? "#351153" : "#ffffff99",
              textShadowOffset: { width: 0, height: 1.5 },
              textShadowRadius: 1,
            }}
          >
            {label}
          </Text>
          <Svg width={22} height={28} viewBox="0 0 22 28">
            <Path
              d="M7 5L16 14 7 23"
              stroke={palette.ink}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
