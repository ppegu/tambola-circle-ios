import React, { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  RadialGradient,
  Path,
  Stop,
} from "react-native-svg";

const star = "M0 -10L3 -3 10 -2 5 3 6 10 0 6 -6 10 -5 3 -10 -2 -3 -3Z";
const sparkle = "M0 -11L3 -3 9 0 3 3 0 11 -3 3 -9 0 -3 -3Z";
const accents = [
  [25, 130, 0.6],
  [94, 54, 0.5],
  [262, 60, 0.55],
  [338, 138, 0.65],
  [21, 254, 0.5],
  [337, 277, 0.45],
  [44, 334, 0.45],
  [316, 355, 0.55],
  [16, 472, 0.4],
  [344, 541, 0.5],
  [43, 682, 0.6],
  [309, 724, 0.5],
];

/** One static vector layer; no image download, animation loop or touch surface. */
export const GameStars = React.memo(function GameStars() {
  const id = "stars" + useId().replace(/:/g, "");
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 780"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <RadialGradient id={id + "halo"}>
            <Stop offset="0" stopColor="#ffe677" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#ffc32e" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#fffbd0" />
            <Stop offset={0.45} stopColor="#ffe665" />
            <Stop offset="1" stopColor="#f6a61a" />
          </LinearGradient>
        </Defs>
        {accents.map(([x, y, scale], i) => (
          <G key={i} transform={`translate(${x} ${y}) scale(${scale})`}>
            <Circle r={19} fill={`url(#${id}halo)`} />
            <Path
              d={i % 3 ? sparkle : star}
              fill="#6d330b"
              transform="translate(0 2)"
              opacity={0.65}
            />
            <Path
              d={i % 3 ? sparkle : star}
              fill={`url(#${id})`}
              stroke="#ffe6a0"
              strokeWidth={0.8}
            />
            <Path
              d="M-2 -5L0 -8 1 -2"
              stroke="#fffbe0"
              strokeWidth={1.1}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        ))}
      </Svg>
    </View>
  );
});
