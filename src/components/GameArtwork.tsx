import { AvatarPhoto } from "./AvatarPhoto";
import { t as tr, useLanguage } from "../i18n";
import { Text } from "../i18n/Text";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "./LinearGradient";
import { Pressable } from "./Pressable";
import { Icon } from "./CircleArtwork";
import { gameFont } from "../gameTypography";
import { GameStars } from "./GameStars";
import { GameFinish, MenuMedallion } from "./GameFinish";
import { useGamePreferences } from "../gamePreferences";
import { isAvatarId } from "../../shared/avatars";
import {
  avatarImages,
  coinImages,
  heroImage,
  iconImages,
  logoImage,
} from "./gameAssets";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from "react-native-svg";
export const gameBackground = require("../../assets/game-v3/game-background.png");
export function GameBackground({
  children,
  style,
  velvet = false,
  calm = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  velvet?: boolean;
  calm?: boolean;
}) {
  useLanguage();
  return (
    <ImageBackground
      source={gameBackground}
      fadeDuration={0}
      resizeMode="cover"
      style={[{ flex: 1, backgroundColor: "#31065b" }, style]}
    >
      {(velvet || calm) && (
        <LinearGradient
          pointerEvents="none"
          colors={
            velvet
              ? ["#3b075ce8", "#490d77ed", "#290540f5"]
              : ["#39075455", "#3c0758bb", "#32054799", "#26043644"]
          }
          style={StyleSheet.absoluteFill}
        />
      )}
      <GameStars />
      {children}
    </ImageBackground>
  );
}
export const GameHero = React.memo(function GameHero({
  height = 250,
}: {
  height?: number | "100%";
}) {
  useLanguage();
  return (
    <Image
      accessibilityLabel="Tambola Circle"
      source={heroImage}
      fadeDuration={0}
      style={{ width: "100%", height }}
      resizeMode="contain"
    />
  );
});
export const GameLogo = React.memo(function GameLogo({
  width = 160,
}: {
  width?: number;
}) {
  useLanguage();
  return (
    <Image
      accessibilityLabel="Tambola Circle"
      source={logoImage}
      fadeDuration={0}
      resizeMode="contain"
      style={{ width, height: width * 0.54 }}
    />
  );
});
export const CoinPile = React.memo(function CoinPile({
  index = 0,
  size = 86,
}: {
  index?: number;
  size?: number;
}) {
  useLanguage();
  return (
    <Image
      accessible={false}
      source={coinImages[Math.max(0, Math.min(2, Math.floor(index)))]}
      fadeDuration={0}
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
});
export function CoinChip({
  balance,
  onPress,
  compact = false,
}: {
  balance?: number;
  onPress: () => void;
  compact?: boolean;
}) {
  useLanguage();
  const coins =
    typeof balance === "number" && Number.isFinite(balance) && balance > 0
      ? Math.floor(balance)
      : 0;
  const id = React.useId().replace(/:/g, "");
  return (
    <View style={{ width: compact ? 139 : 154, height: 46 }}>
      <LinearGradient
        colors={["#fff887", "#ffd23f", "#f0ab18"]}
        style={{
          position: "absolute",
          top: 7,
          bottom: 6,
          left: 18,
          right: 16,
          borderWidth: 1.2,
          borderColor: "#fff29c",
          borderBottomWidth: 2.5,
          borderBottomColor: "#a76107",
          justifyContent: "center",
        }}
      >
        <Text
          accessibilityLabel={tr("{v0} coins", { v0: coins.toLocaleString() })}
          accessibilityLiveRegion="polite"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          maxFontSizeMultiplier={1.15}
          style={{
            color: "#4b2503",
            fontFamily: gameFont.medium,
            fontSize: compact ? 20 : 22,
            textAlign: "center",
            marginLeft: 20,
            marginRight: 16,
            includeFontPadding: false,
          }}
        >
          {coins.toLocaleString()}
        </Text>
      </LinearGradient>
      <Svg
        pointerEvents="none"
        width={41}
        height={46}
        viewBox="0 0 90 100"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Defs>
          <SvgGradient id={`${id}coin`} x1="0%" y1="0%" x2="85%" y2="100%">
            <Stop offset="0" stopColor="#fffba2" />
            <Stop offset="0.42" stopColor="#ffcd33" />
            <Stop offset="1" stopColor="#db7908" />
          </SvgGradient>
        </Defs>
        <Circle cx={45} cy={53} r={42} fill="#9c4c00" />
        <Circle
          cx={45}
          cy={47}
          r={41}
          fill={`url(#${id}coin)`}
          stroke="#ffd657"
          strokeWidth={3}
        />
        <Circle
          cx={45}
          cy={47}
          r={33}
          fill="none"
          stroke="#b76c0a"
          strokeWidth={3}
        />
        <Circle
          cx={44}
          cy={45}
          r={32}
          fill="none"
          stroke="#fff194"
          strokeWidth={2}
        />
        <Path
          d="M59 31C50 22 32 26 29 41C24 59 34 73 48 70C53 69 57 66 60 62"
          fill="none"
          stroke="#ab5700"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <Path
          d="M58 28C49 19 31 23 28 38C23 56 33 70 47 67C52 66 56 63 59 59"
          fill="none"
          stroke="#fff290"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <Path
          d="M18 26Q33 5 53 13"
          fill="none"
          stroke="#ffffce"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </Svg>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("Open wallet")}
        onPress={onPress}
        hitSlop={2}
        style={({ pressed }) => ({
          position: "absolute",
          right: 0,
          top: 1,
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <LinearGradient
          colors={["#49f779", "#09b544", "#008232"]}
          style={{
            width: 35,
            height: 37,
            borderRadius: 19,
            borderWidth: 1.3,
            borderColor: "#aaffb1",
            borderBottomWidth: 2.5,
            borderBottomColor: "#004f28",
            alignItems: "center",
            justifyContent: "center",
            elevation: 3,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 3,
              left: 6,
              width: 18,
              height: 5,
              borderRadius: 8,
              backgroundColor: "#c1ffd55c",
              transform: [{ rotate: "-22deg" }],
            }}
          />
          <Svg width={25} height={25} viewBox="0 0 32 32">
            <Path
              d="M16 6V27M6 16H26"
              stroke="#005229"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <Path
              d="M16 4V25M6 14H26"
              stroke="#fffdf1"
              strokeWidth={4.5}
              strokeLinecap="round"
            />
          </Svg>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export const GameIcon = React.memo(function GameIcon({
  index,
  size = 64,
}: {
  index: number;
  size?: number;
}) {
  useLanguage();
  return (
    <Image
      accessible={false}
      source={iconImages[index] ?? iconImages[0]}
      fadeDuration={0}
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
});
export const GameAvatar = React.memo(function GameAvatar({
  index = 0,
  photo,
  size = 48,
}: {
  index?: number;
  photo?: string;
  size?: number;
}) {
  useLanguage();
  const n = isAvatarId(index) ? index : 0;
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={avatarImages[n]}
        fadeDuration={0}
        resizeMode="cover"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#66258f",
        }}
      />
      <AvatarPhoto photo={photo} size={size} />
    </View>
  );
});
export function GameButton({
  children,
  onPress,
  tone = "gold",
  disabled = false,
  busy = false,
  icon,
  glyph,
  small = false,
  style,
  label,
  medallion = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  tone?: "gold" | "purple" | "cyan" | "red" | "paper";
  disabled?: boolean;
  busy?: boolean;
  icon?: number;
  glyph?: string;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
  medallion?: boolean;
}) {
  useLanguage();
  const press = useRef(new Animated.Value(0)).current;
  const reducedMotion = useGamePreferences((state) => state.reducedMotion);
  const animate = (down: boolean) => {
    if (reducedMotion) {
      press.stopAnimation();
      press.setValue(down ? 1 : 0);
      return;
    }
    Animated.spring(press, {
      toValue: down ? 1 : 0,
      speed: down ? 65 : 35,
      bounciness: down ? 0 : 5,
      useNativeDriver: true,
    }).start();
  };
  const styledRadius = StyleSheet.flatten(style)?.borderRadius;
  const radius =
    typeof styledRadius === "number"
      ? styledRadius
      : medallion
        ? 32
        : small
          ? 18
          : 26;
  const dark =
    tone === "gold"
      ? "#381137"
      : tone === "paper" || (medallion && tone === "cyan")
        ? "#35104f"
        : "#fff9e9";
  const edge = {
    gold: "#a76110",
    paper: "#a76110",
    purple: "#351052",
    red: "#8c1028",
    cyan: "#08647d",
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      onPressIn={() => animate(true)}
      onPressOut={() => animate(false)}
      android_ripple={{ color: "transparent" }}
      style={[
        {
          borderRadius: radius,
          backgroundColor: edge,
          paddingBottom: 4,
          minHeight: medallion ? 62 : small ? 44 : 54,
          justifyContent: "center",
          opacity: disabled && !busy ? 0.48 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          flex: 1,
          borderRadius: radius,
          overflow: "hidden",
          transform: [
            {
              translateY: press.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 3],
              }),
            },
            {
              scale: press.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.988],
              }),
            },
          ],
        }}
      >
        <GameFinish tone={tone} radius={radius} />
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: small ? 10 : 14,
            paddingVertical: 6,
          }}
        >
          {(busy || icon !== undefined || glyph) && (
            <View
              style={{
                width: medallion ? 46 : small ? 26 : 34,
                height: medallion ? 46 : small ? 26 : 34,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {busy ? (
                <ActivityIndicator color={dark} size="small" />
              ) : medallion && glyph ? (
                <MenuMedallion name={glyph} cyan={tone === "cyan"} />
              ) : icon !== undefined ? (
                <GameIcon index={icon} size={small ? 26 : 34} />
              ) : (
                <Icon name={glyph!} size={small ? 23 : 28} color={dark} />
              )}
            </View>
          )}
          <Text
            numberOfLines={small ? 1 : undefined}
            adjustsFontSizeToFit={small}
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.2}
            style={{
              color: dark,
              fontSize: medallion ? 20 : small ? 14 : 18,
              lineHeight: medallion ? 25 : small ? 18 : 22,
              includeFontPadding: false,
              fontFamily: gameFont.bold,
              textAlign: "center",
              flexShrink: 1,
              textShadowColor:
                tone === "gold" || tone === "paper" ? "#fff5be" : "#35114f",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 1,
            }}
          >
            {children}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
export function GameCard({
  children,
  style,
  gold = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gold?: boolean;
}) {
  useLanguage();
  return (
    <LinearGradient
      colors={gold ? ["#fff5ae", "#efbd4d"] : ["#fff8e5", "#f3deb3", "#fff0cf"]}
      style={[
        {
          borderRadius: 22,
          borderWidth: 1.5,
          borderColor: "#fff1d6",
          shadowColor: "#35104f",
          shadowOpacity: 0.22,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
          borderBottomWidth: 3,
          borderBottomColor: "#ae7534",
          padding: 12,
          gap: 10,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          right: 3,
          bottom: 3,
          borderWidth: 1,
          borderColor: "#ffffff9c",
          borderRadius: 18,
        }}
      />
      {children}
    </LinearGradient>
  );
}

export function GameFeatureButton({
  label,
  subtitle,
  icon,
  tone = "gold",
  onPress,
}: {
  label: string;
  subtitle?: string;
  icon: number;
  tone?: "gold" | "purple" | "cyan" | "paper";
  onPress: () => void;
}) {
  useLanguage();
  const colors = {
    gold: ["#fff7a5", "#ffdc32", "#ffad13"],
    purple: ["#c775ff", "#982bea", "#591093"],
    cyan: ["#74f9f2", "#00bad0", "#037b99"],
    paper: ["#fffdf4", "#f7e9cf", "#e4c79c"],
  }[tone];
  const ink =
    tone === "gold" ? "#51280c" : tone === "paper" ? "#371246" : "#fffbea";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 72,
        borderRadius: 25,
        borderWidth: 1.5,
        borderBottomWidth: 4,
        borderColor:
          tone === "cyan"
            ? "#9dfbfa"
            : tone === "purple"
              ? "#c9a1ff"
              : "#fff0b4",
        borderBottomColor:
          tone === "gold" || tone === "paper" ? "#bd8030" : "#351057",
        overflow: "hidden",
        elevation: 4,
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      <GameFinish tone={tone} radius={24} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          paddingHorizontal: 13,
          paddingVertical: 7,
        }}
      >
        <GameIcon index={icon} size={51} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            maxFontSizeMultiplier={1.15}
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{
              color: ink,
              fontSize: 20,
              fontFamily: gameFont.bold,
              includeFontPadding: false,
            }}
          >
            {label}
          </Text>
          {subtitle && (
            <Text
              style={{ color: ink, fontSize: 11, fontFamily: gameFont.medium }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <Icon name="chevron" size={22} color={ink} />
      </View>
    </Pressable>
  );
}
