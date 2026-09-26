import React from "react";
import {
  Pressable as NativePressable,
  type PressableProps,
} from "react-native";
import { tapFeedback } from "../gamePreferences";
export function Pressable({
  onPress,
  onPressIn,
  android_ripple,
  ...props
}: PressableProps) {
  return (
    <NativePressable
      android_ripple={
        android_ripple ?? { color: "#ffffff24", foreground: true }
      }
      {...props}
      onPressIn={(event) => {
        if (onPress) tapFeedback();
        onPressIn?.(event);
      }}
      onPress={onPress}
    />
  );
}
