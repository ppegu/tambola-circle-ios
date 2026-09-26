import { t as tr, useLanguage } from "../i18n";
import { Text } from "../i18n/Text";
import React from "react";
import Slider from "@react-native-community/slider";
import { Pressable } from "./Pressable";
import { LinearGradient } from "./LinearGradient";
import { tapFeedback } from "../gamePreferences";

export function GameSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  useLanguage();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ minWidth: 66, height: 44, justifyContent: "center" }}
    >
      <LinearGradient
        colors={
          value
            ? ["#59f699", "#09bb57", "#007a3d"]
            : ["#d0c1c6", "#a5959e", "#7a6d7b"]
        }
        style={{
          width: 65,
          height: 30,
          borderRadius: 17,
          borderWidth: 1.5,
          borderColor: value ? "#a2ffc8" : "#e9dde1",
          borderBottomWidth: 2.5,
          padding: 2,
          flexDirection: value ? "row" : "row-reverse",
          alignItems: "center",
        }}
      >
        <Text
          maxFontSizeMultiplier={1}
          style={{
            flex: 1,
            color: "white",
            textAlign: "center",
            fontSize: 12,
            fontWeight: "800",
            includeFontPadding: false,
          }}
        >
          {value ? tr("ON") : tr("OFF")}
        </Text>
        <LinearGradient
          colors={["#fff", "#e3e9ed"]}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 0.8,
            borderColor: "#9ba6ac",
            elevation: 2,
          }}
        />
      </LinearGradient>
    </Pressable>
  );
}

export function GameSlider({
  label,
  value,
  onChange,
  minimum = 0,
  maximum = 1,
  step = 0.05,
  tone = "cyan",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  minimum?: number;
  maximum?: number;
  step?: number;
  tone?: "cyan" | "purple";
}) {
  useLanguage();
  const commit = (next: number) => {
    const rounded = Math.max(
      minimum,
      Math.min(maximum, Math.round((next - minimum) / step) * step + minimum),
    );
    if (rounded !== value) onChange(Number(rounded.toFixed(3)));
    tapFeedback();
  };
  return (
    <Slider
      testID={
        label === tr("Voice volume") || label === tr("Caller volume")
          ? "voice-volume-slider"
          : "call-interval-slider"
      }
      accessibilityLabel={label}
      minimumValue={minimum}
      maximumValue={maximum}
      step={step}
      value={value}
      minimumTrackTintColor={tone === "purple" ? "#9220d4" : "#00b5cc"}
      maximumTrackTintColor="#dfcbb5"
      thumbTintColor={tone === "purple" ? "#9220d4" : "#00b5cc"}
      thumbSize={27}
      tapToSeek
      onSlidingComplete={commit}
      style={{ flex: 1, height: 44, minWidth: 86 }}
    />
  );
}
