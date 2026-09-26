import React, { useId } from "react";
import {
  Platform,
  processColor,
  requireNativeComponent,
  StyleSheet,
  UIManager,
  View,
  type ViewProps,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Rect,
  Stop,
} from "react-native-svg";

type Point = { x: number; y: number };
type Props = ViewProps & {
  colors: readonly string[];
  start?: Point;
  end?: Point;
};
type NativeProps = ViewProps & {
  gradientColors: number[];
  gradientPoints: number[];
};
const NativeGradient =
  Platform.OS === "android" && UIManager.getViewManagerConfig("CircleGradient")
    ? requireNativeComponent<NativeProps>("CircleGradient")
    : null;
/** Android paints in one native view, with layout-safe zero-size handling. */
export function LinearGradient({
  colors,
  start = { x: 0.5, y: 0 },
  end = { x: 0.5, y: 1 },
  children,
  style,
  ...props
}: Props) {
  return (
    <View
      {...props}
      style={[{ overflow: "hidden", backgroundColor: colors[0] }, style]}
    >
      <GradientPaint
        stops={colors.join("|")}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
      />
      {children}
    </View>
  );
}
const GradientPaint = React.memo(function GradientPaint({
  stops,
  x1,
  y1,
  x2,
  y2,
}: {
  stops: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const id = useId().replace(/:/g, ""),
    colors = stops.split("|");
  if (NativeGradient)
    return (
      <NativeGradient
        pointerEvents="none"
        accessible={false}
        gradientColors={colors.map((color) => Number(processColor(color)) || 0)}
        gradientPoints={[x1, y1, x2, y2]}
        style={StyleSheet.absoluteFill}
      />
    );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <SvgGradient
            id={id}
            x1={`${x1 * 100}%`}
            y1={`${y1 * 100}%`}
            x2={`${x2 * 100}%`}
            y2={`${y2 * 100}%`}
          >
            {colors.map((color, i) => (
              <Stop
                key={i}
                offset={i / Math.max(1, colors.length - 1)}
                stopColor={color}
              />
            ))}
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});
