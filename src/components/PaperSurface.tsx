import React from "react";
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
const paper = require("../../assets/game-v3/native/paper.png");
const ticketPaper = require("../../assets/game-v3/native/ticket-paper.png");
const largePaper = require("../../assets/game-v3/native/paper-large.png");
/** Bundled 3× paper: one native image, with no per-frame SVG mask or pattern. */
export function PaperSurface({
  children,
  style,
  large = false,
  ticket = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  large?: boolean;
  ticket?: boolean;
}) {
  return (
    <View style={[{ position: "relative", padding: 8 }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          accessible={false}
          source={large ? largePaper : ticket ? ticketPaper : paper}
          resizeMode="stretch"
          fadeDuration={0}
          style={{ width: "100%", height: "100%" }}
        />
      </View>
      {children}
    </View>
  );
}
