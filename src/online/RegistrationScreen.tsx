import { t as tr, useLanguage } from "../i18n";
import { TextInput } from "../i18n/Text";
import { useScreenNavigation } from "../navigation/ScreenContext";
import React, { useEffect, useState } from "react";
import {
  BackHandler,
  DevSettings,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { normalizeMobile } from "../../shared/device";
import { API_URL } from "../api";
import { GameAvatar, GameButton, GameLogo } from "../components/GameArtwork";
import { CurvedGameTitle, TicketOrnament } from "../components/GameFinish";
import { PaperSurface } from "../components/PaperSurface";
import {
  Icon,
  IconButton,
  Pressable,
  ScrollView,
  Text,
  View,
  ui,
} from "./components";
import { selectDeviceNumber } from "./device";
import { PolicyScreen } from "./PolicyScreen";
import { AvatarPicker } from "./AvatarPicker";
import { gameFont } from "../gameTypography";

export function RegistrationScreen({
  busy,
  phoneEntryMode,
  onRegister,
  onGuest,
  onBack,
}: {
  busy: boolean;
  phoneEntryMode: "manual" | "device";
  onRegister: (
    name: string,
    mobile: string,
    avatarId: number,
    photo?: string,
  ) => void;
  onGuest: () => void;
  onBack: () => void;
}) {
  useLanguage();
  const navigation = useScreenNavigation();
  const compact = useWindowDimensions().height < 850,
    avatarSize = compact ? 96 : 112;
  const [name, setName] = useState(""),
    [mobile, setMobile] = useState(""),
    [avatarId, setAvatarId] = useState(0);
  const [avatarPhoto, setAvatarPhoto] = useState<string | undefined>();
  const [avatarsOpen, setAvatarsOpen] = useState(false);
  const [selecting, setSelecting] = useState(false),
    [policy, setPolicy] = useState<"terms" | "privacy" | null>(null);
  const normalized = normalizeMobile(mobile);
  useEffect(() => {
    if (__DEV__ && API_URL === "http://127.0.0.1:8791")
      DevSettings.addMenuItem("Use fictional QA number", () => {
        setName("QA Captain");
        setMobile("+15550001102");
      });
  }, []);
  useEffect(() => {
    if (!policy) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setPolicy(null);
      return true;
    });
    return () => sub.remove();
  }, [policy]);
  async function pick() {
    setSelecting(true);
    try {
      const value = await selectDeviceNumber();
      if (value) setMobile(value);
    } catch {
      /* Dismissal or an unavailable choice leaves the existing number unchanged. */
    } finally {
      setSelecting(false);
    }
  }
  if (policy)
    return <PolicyScreen initialTab={policy} onClose={() => setPolicy(null)} />;
  return (
    <KeyboardAvoidingView
      style={ui.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 16,
          gap: compact ? 6 : 8,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "100%",
            alignItems: "center",
            minHeight: compact ? 96 : 100,
          }}
        >
          <View style={{ position: "absolute", left: 0, top: 0, zIndex: 1 }}>
            <IconButton name="back" label={tr("Back")} onPress={onBack} light />
          </View>
          <GameLogo width={compact ? 180 : 205} />
        </View>
        <CurvedGameTitle size={34}>{tr("Registration")}</CurvedGameTitle>
        <Text
          style={{
            color: "#f4e2fa",
            fontSize: 16,
            lineHeight: 21,
            textAlign: "center",
            fontFamily: gameFont.medium,
          }}
        >
          {tr("Create your player profile")}
          {"\n"}
          {tr("to get started")}
        </Text>
        <View
          style={{
            width: "100%",
            maxWidth: 480,
            marginTop: 3,
            paddingTop: compact ? 55 : 63,
          }}
        >
          <PaperSurface
            large
            style={{
              padding: compact ? 16 : 22,
              paddingTop: compact ? 49 : 57,
              gap: 9,
            }}
          >
            <TicketOrnament />
            <Text
              style={{
                color: "#35104f",
                fontFamily: gameFont.medium,
                fontSize: 18,
              }}
            >
              {tr("Name")}
            </Text>
            <View
              style={[
                ui.input,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 0,
                },
              ]}
            >
              <Icon name="user" color="#93817f" size={20} />
              <TextInput
                accessibilityLabel={tr("Your name")}
                placeholder={tr("Your name")}
                placeholderTextColor="#968193"
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: 0,
                  color: "#35104f",
                  fontSize: 18,
                  fontFamily: gameFont.medium,
                }}
                value={name}
                maxLength={40}
                autoCorrect={false}
                autoComplete="name"
                editable={!busy}
                onChangeText={setName}
              />
            </View>
            <Text
              style={{
                marginTop: 4,
                color: "#35104f",
                fontFamily: gameFont.medium,
                fontSize: 18,
              }}
            >
              {tr("Mobile number")}
            </Text>
            <View style={ui.row}>
              <View
                style={[
                  ui.input,
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 0,
                    backgroundColor:
                      phoneEntryMode === "device" ? "#eee2d2" : "#fff9e9",
                  },
                ]}
              >
                <Icon name="mobile" color="#93817f" size={20} />
                <TextInput
                  accessibilityLabel={
                    phoneEntryMode === "manual"
                      ? tr("Mobile number with country code")
                      : tr("Selected device number")
                  }
                  editable={phoneEntryMode === "manual" && !busy}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    minWidth: 0,
                    padding: 0,
                    color: "#524959",
                    fontSize: 16,
                    fontFamily: gameFont.medium,
                  }}
                  value={mobile}
                  onChangeText={setMobile}
                  onFocus={() => {
                    if (phoneEntryMode === "device" && !busy && !selecting) {
                      void pick();
                    }
                  }}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  maxLength={24}
                  keyboardType="phone-pad"
                  pointerEvents={phoneEntryMode === "manual" ? "auto" : "none"}
                  placeholder={
                    phoneEntryMode === "manual"
                      ? "+91 90000 00000"
                      : tr("Mobile number")
                  }
                  placeholderTextColor="#968193"
                />
                {phoneEntryMode === "device" && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={selecting || busy}
                    onPress={() => {
                      if (!busy && !selecting) void pick();
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="edit" size={16} color="#7421c6" />
                  </Pressable>
                )}
              </View>
            </View>
            <View
              style={{
                height: 1,
                backgroundColor: "#d6b98f",
                marginVertical: 4,
              }}
            />
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: "#5e4563",
                  fontFamily: gameFont.medium,
                  fontSize: 12,
                }}
              >
                {tr("By continuing, you agree to our")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  columnGap: 5,
                }}
              >
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    navigation
                      ? navigation.push("Policy", { tab: "terms" })
                      : setPolicy("terms")
                  }
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={policyLink}>{tr("Terms and Conditions")}</Text>
                </Pressable>
                <Text style={{ color: "#5e4563", fontSize: 12 }}>
                  {tr("and")}
                </Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    navigation
                      ? navigation.push("Policy", { tab: "privacy" })
                      : setPolicy("privacy")
                  }
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={policyLink}>{tr("Privacy Policy")}</Text>
                </Pressable>
              </View>
            </View>
            <GameButton
              busy={busy}
              disabled={
                busy || selecting || !normalized || name.trim().length < 2
              }
              onPress={() => {
                if (normalized)
                  onRegister(name.trim(), normalized, avatarId, avatarPhoto);
              }}
              style={{ borderRadius: 32, minHeight: 60 }}
            >
              {tr("Continue ›")}
            </GameButton>
          </PaperSurface>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Choose your avatar")}
            accessibilityHint={tr("Opens a gallery of 15 avatars")}
            disabled={busy}
            onPress={() => setAvatarsOpen(true)}
            style={{
              position: "absolute",
              top: 0,
              alignSelf: "center",
              width: avatarSize,
              height: avatarSize,
            }}
          >
            <GameAvatar
              size={avatarSize}
              index={avatarId}
              photo={avatarPhoto}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 31,
                height: 31,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: "#fff0a8",
                backgroundColor: "#ffce40",
                alignItems: "center",
                justifyContent: "center",
                elevation: 3,
              }}
            >
              <Icon name="edit" size={17} color="#542609" />
            </View>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("Play as guest")}
          onPress={onGuest}
          style={{
            minHeight: 44,
            paddingHorizontal: 18,
            justifyContent: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="play" size={18} />
          <Text
            style={{
              color: "#fff3db",
              fontSize: 15,
              fontWeight: "800",
              textDecorationLine: "underline",
            }}
          >
            {tr("Play as guest")}
          </Text>
        </Pressable>
      </ScrollView>
      {avatarsOpen && (
        <AvatarPicker
          selected={avatarId}
          selectedPhoto={avatarPhoto}
          onSelect={(id, photo) => {
            setAvatarId(id);
            setAvatarPhoto(photo);
            setAvatarsOpen(false);
          }}
          onClose={() => setAvatarsOpen(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}
const policyLink = {
  color: "#7421c6",
  fontSize: 13,
  fontFamily: gameFont.medium,
  textDecorationLine: "underline" as const,
};
