import React from "react";
import {
  Platform,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeInput,
  type TextProps,
  type TextInputProps,
} from "react-native";
import { useLanguage } from "./index";

// Native fallback fonts shape Assamese and Devanagari; Fredoka only contains Latin.
// Reserve room for vowel signs above/below the baseline instead of clipping them.
function scriptStyle(style: TextProps["style"]) {
  const flat = StyleSheet.flatten(style) ?? {};
  const size = flat.fontSize ?? 14;
  return {
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    fontWeight:
      flat.fontWeight ??
      (flat.fontFamily?.includes("Bold") ? ("700" as const) : ("500" as const)),
    lineHeight: Math.max(flat.lineHeight ?? 0, Math.ceil(size * 1.45)),
    includeFontPadding: true,
  };
}
function hasIndic(value: React.ReactNode): boolean {
  return typeof value === "string"
    ? /[\u0900-\u09ff]/.test(value)
    : Array.isArray(value) && value.some(hasIndic);
}
export type Text = NativeText;
export type TextInput = NativeInput;
export const Text = React.forwardRef<NativeText, TextProps>(function Text(
  { style, children, ...props },
  ref,
) {
  return (
    <NativeText
      ref={ref}
      {...props}
      style={[style, hasIndic(children) && scriptStyle(style)]}
    >
      {children}
    </NativeText>
  );
});
export const TextInput = React.forwardRef<NativeInput, TextInputProps>(
  function TextInput({ style, ...props }, ref) {
    const language = useLanguage();
    return (
      <NativeInput
        ref={ref}
        {...props}
        style={[
          style,
          (language !== "en" || hasIndic(props.value)) && scriptStyle(style),
        ]}
      />
    );
  },
);
