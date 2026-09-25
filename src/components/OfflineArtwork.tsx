import React, { useId } from "react";
import { Image, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

const reference = require("../../assets/offline/original-caller.jpg");
function OriginalControl({
  x,
  y,
  cropWidth,
  cropHeight,
  width,
  height,
}: {
  x: number;
  y: number;
  cropWidth: number;
  cropHeight: number;
  width: number;
  height: number;
}) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, overflow: "hidden" }}
    >
      <Image
        source={reference}
        resizeMode="stretch"
        style={{
          position: "absolute",
          left: (-x * width) / cropWidth,
          top: (-y * height) / cropHeight,
          width: (576 * width) / cropWidth,
          height: (1280 * height) / cropHeight,
        }}
      />
    </View>
  );
}

/** The original offline caller has its own controls, separate from online tables. */
export function OfflineOrb({
  size,
  lines,
  exit = false,
}: {
  size: number;
  lines?: string[];
  exit?: boolean;
}) {
  const id = "offline" + useId().replace(/\W/g, "");
  if (exit)
    return (
      <OriginalControl
        x={17}
        y={76}
        cropWidth={76}
        cropHeight={78}
        width={size}
        height={size}
      />
    );
  if (lines?.join(" ") === "Call Next Number")
    return (
      <OriginalControl
        x={421}
        y={242}
        cropWidth={129}
        cropHeight={130}
        width={size}
        height={size}
      />
    );
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id={id} cx="42%" cy="30%" r="70%">
          <Stop stopColor="#d377ed" />
          <Stop offset={0.45} stopColor="#ac35d1" />
          <Stop offset={0.8} stopColor="#7404a2" />
          <Stop offset="1" stopColor="#360045" />
        </RadialGradient>
      </Defs>
      <Circle
        cx="60"
        cy="60"
        r="57"
        fill={`url(#${id})`}
        stroke="#51056c"
        strokeWidth="3"
      />
      <Path
        d="M17 39Q29 10 59 8"
        fill="none"
        stroke="#edb8f3"
        strokeWidth="3"
        opacity=".65"
      />
      {exit ? (
        <Path
          d="M57 24H32v70h25V80H45V38h12M56 59h38M78 43l18 16-18 18"
          fill="none"
          stroke="#fbf226"
          strokeWidth="7"
          strokeLinejoin="round"
        />
      ) : (
        lines?.map((line, i) => (
          <SvgText
            key={i}
            x="60"
            y={60 - (lines.length - 1) * 11 + i * 22 + 7}
            textAnchor="middle"
            fontSize="21"
            fontWeight="700"
            fill="white"
            stroke="#451154"
            strokeWidth=".7"
          >
            {line}
          </SvgText>
        ))
      )}
    </Svg>
  );
}

export function NumberHistorySign({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <OriginalControl
      x={436}
      y={75}
      cropWidth={124}
      cropHeight={79}
      width={width}
      height={height}
    />
  );
}

export function OfflineSpeaker({
  size,
  muted,
}: {
  size: number;
  muted: boolean;
}) {
  if (!muted)
    return (
      <OriginalControl
        x={33}
        y={332}
        cropWidth={72}
        cropHeight={72}
        width={size}
        height={size}
      />
    );
  return (
    <Svg width={size} height={size} viewBox="0 0 66 66">
      <Circle
        cx="33"
        cy="33"
        r="30"
        fill="white"
        stroke="#88b482"
        strokeWidth="2.5"
      />
      <Path d="M15 26h8l10-9v32l-10-9h-8Z" fill="#333" />
      {muted ? (
        <Path d="M41 25l12 16m0-16L41 41" stroke="#333" strokeWidth="3" />
      ) : (
        <Path
          d="M39 24q10 9 0 18m6-23q15 14 0 28"
          stroke="#333"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </Svg>
  );
}
