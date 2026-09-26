import { t as tr, useLanguage } from "../i18n";
import { Text, TextInput } from "../i18n/Text";
import { Sheet } from "../online/components";
import { GameButton } from "./GameArtwork";
import { GamePreferencesSheet } from "../online/Extras";
import React, { useState } from "react";
import { Pressable } from "./Pressable";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { CALL_PAUSES, SPEEDS } from "../../shared/preferences";
import type { AppModel } from "../useAppState";
import { AutoSwitch } from "./CallerScreen";
import { Icon } from "./Artwork";

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useLanguage();
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={tr("Close dialog")}
        />
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={tr("Close")}
              hitSlop={12}
            >
              <Icon name="close" color="#fffaf2" size={23} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16 }}
          >
            <View>{children}</View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function GameMenu({
  width,
  onClose,
  onRestart,
  onHome,
}: {
  width: number;
  onClose: () => void;
  onRestart: () => void;
  onHome: () => void;
}) {
  useLanguage();
  return (
    <Sheet title={tr("Game menu")} onClose={onClose}>
      <View style={{ gap: 10, paddingBottom: 8 }}>
        <GameButton glyph="refresh" onPress={onRestart}>
          {tr("Restart new game")}
        </GameButton>
        <GameButton glyph="home" tone="purple" onPress={onHome}>
          {tr("Back to home")}
        </GameButton>
        <GameButton glyph="play" tone="cyan" onPress={onClose}>
          {tr("Keep playing")}
        </GameButton>
      </View>
    </Sheet>
  );
}

export function Button({
  children,
  onPress,
  disabled = false,
  danger = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: danger ? "#b52638" : "#efd080",
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[styles.actionText, { color: danger ? "white" : "#290435" }]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function SettingsDialog({
  model,
  onClose,
  onPreviewVoice,
}: {
  model: AppModel;
  onClose: () => void;
  onPreviewVoice: (number: number) => void;
}) {
  useLanguage();
  return (
    <GamePreferencesSheet
      onClose={onClose}
      sound={model.local.preferences.sound}
      onSound={(sound) => model.updatePreferences({ sound, voice: "female" })}
      onPreview={() => onPreviewVoice(23)}
      onReplay={
        model.local.history.length
          ? () => onPreviewVoice(model.local.history.at(-1)!)
          : undefined
      }
    />
  );
}

export function AccountDialog({
  model,
  onClose,
}: {
  model: AppModel;
  onClose: () => void;
}) {
  useLanguage();
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [codeSaved, setCodeSaved] = useState(false);
  const profile = model.identity?.profile;
  const isUser = profile?.kind === "user";
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Please try again."));
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    if (!busy && (!newCode || codeSaved)) onClose();
  };
  return (
    <Dialog
      title={
        newCode
          ? tr("Save your recovery code")
          : isUser
            ? tr("Your account")
            : tr("Play your way")
      }
      onClose={close}
    >
      {newCode ? (
        <>
          <Text style={styles.intro}>
            {tr(
              "Keep this code somewhere safe. It is the only way to reset your password, and is shown only once.",
            )}
          </Text>
          <Text selectable style={styles.recoveryCode}>
            {newCode}
          </Text>
          <Pressable
            onPress={() => setCodeSaved(!codeSaved)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: codeSaved }}
            aria-checked={codeSaved}
            style={styles.checkRow}
          >
            <View
              style={[
                styles.checkbox,
                codeSaved && { backgroundColor: "#76207d" },
              ]}
            >
              {codeSaved && <Icon name="check" size={17} />}
            </View>
            <Text style={styles.help}>
              {tr("I have saved my recovery code")}
            </Text>
          </Pressable>
          <Button disabled={!codeSaved} onPress={onClose}>
            {tr("Done")}
          </Button>
        </>
      ) : !model.cloudAvailable ? (
        <>
          <Text style={styles.intro}>
            {tr("You’re ready to play as a guest.")}
          </Text>
          <View style={styles.note}>
            <Text style={styles.noteText}>
              {tr(
                "Accounts are not available in this build. Your game and preferences are saved on this device, and the caller works offline.",
              )}
            </Text>
          </View>
          <Button onPress={onClose}>{tr("Continue as guest")}</Button>
        </>
      ) : isUser ? (
        <>
          <Text style={styles.intro}>
            {tr("Signed in as")}{" "}
            <Text style={{ fontWeight: "700", color: "#76207d" }}>
              {profile.username}
            </Text>
          </Text>
          <Text style={styles.help}>
            {tr(
              "Your calling preferences sync across your devices. Each device keeps its own game.",
            )}
          </Text>
          <Text style={styles.sync}>{model.syncStatus}</Text>
          {!deleting ? (
            <>
              <Button
                disabled={busy}
                onPress={() => {
                  void perform(async () => {
                    await model.signOut();
                    onClose();
                  });
                }}
              >
                {tr("Sign out")}
              </Button>
              <Pressable
                style={styles.linkButton}
                onPress={() => {
                  setDeleting(true);
                  setPassword("");
                }}
                accessibilityRole="button"
              >
                <Text style={[styles.link, { color: "#a82b36" }]}>
                  {tr("Delete account and cloud data")}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.note}>
                <Text style={styles.noteText}>
                  {tr(
                    "This permanently deletes your account, saved cloud preferences, and all account sessions. Your local game will also be cleared.",
                  )}
                </Text>
              </View>
              <TextInput
                accessibilityLabel={tr("Password to delete account")}
                placeholder={tr("Confirm your password")}
                placeholderTextColor="#9a8b9c"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                autoCapitalize="none"
                maxLength={128}
              />
              <Button
                danger
                disabled={busy || !password}
                onPress={() => {
                  void perform(async () => {
                    await model.deleteProfile(password);
                    onClose();
                  });
                }}
              >
                {tr("Permanently delete account")}
              </Button>
              <Pressable
                style={styles.linkButton}
                onPress={() => setDeleting(false)}
              >
                <Text style={styles.link}>{tr("Cancel")}</Text>
              </Pressable>
            </>
          )}
        </>
      ) : (
        <>
          <Text style={styles.intro}>
            {mode === "register"
              ? tr("Save your preferences across devices.")
              : mode === "recover"
                ? tr("Use your recovery code to set a new password.")
                : tr("Sign in to bring your preferences with you.")}
          </Text>
          <Text style={styles.label}>{tr("Username")}</Text>
          <TextInput
            accessibilityLabel={tr("Username")}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            maxLength={24}
            placeholder={tr("Your username")}
            placeholderTextColor="#9a8b9c"
            style={styles.input}
            editable={!busy}
          />
          {mode === "recover" && (
            <>
              <Text style={styles.label}>{tr("Recovery code")}</Text>
              <TextInput
                accessibilityLabel={tr("Recovery code")}
                value={recovery}
                onChangeText={setRecovery}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={64}
                placeholder={tr("Your saved recovery code")}
                placeholderTextColor="#9a8b9c"
                style={styles.input}
                editable={!busy}
              />
            </>
          )}
          <Text style={styles.label}>
            {mode === "recover" ? tr("New password") : tr("Password")}
          </Text>
          <TextInput
            accessibilityLabel={
              mode === "recover" ? tr("New password") : tr("Password")
            }
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            maxLength={128}
            placeholder={tr("At least 12 characters")}
            placeholderTextColor="#9a8b9c"
            style={styles.input}
            editable={!busy}
          />
          <Button
            disabled={
              busy ||
              !username ||
              !password ||
              (mode === "recover" && !recovery)
            }
            onPress={() => {
              void perform(async () => {
                const code = await model.authenticate(
                  mode,
                  username.trim(),
                  password,
                  recovery.trim(),
                );
                setPassword("");
                setRecovery("");
                if (code) setNewCode(code);
                else onClose();
              });
            }}
          >
            {mode === "register"
              ? tr("Create account")
              : mode === "recover"
                ? tr("Reset password")
                : tr("Sign in")}
          </Button>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            style={styles.linkButton}
            onPress={() => {
              setMode(mode === "register" ? "login" : "register");
              setError("");
            }}
          >
            <Text style={styles.link}>
              {mode === "register"
                ? tr("Already have an account? Sign in")
                : tr("Create a free account")}
            </Text>
          </Pressable>
          {mode === "login" && (
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              style={styles.linkButton}
              onPress={() => {
                setMode("recover");
                setError("");
              }}
            >
              <Text style={styles.link}>{tr("Forgot password?")}</Text>
            </Pressable>
          )}
          <View style={styles.divider} />
          <Text style={styles.help}>
            {tr(
              "Guest preferences use a random app ID. No hardware ID, ad tracking, or permissions are used.",
            )}
          </Text>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            onPress={onClose}
            style={styles.linkButton}
          >
            <Text style={styles.link}>{tr("Continue as guest")}</Text>
          </Pressable>
          {profile?.kind === "guest" && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              style={styles.linkButton}
              onPress={() => setDeleting(!deleting)}
            >
              <Text style={[styles.help, { color: "#a82b36" }]}>
                {tr("Reset guest data")}
              </Text>
            </Pressable>
          )}
          {deleting && (
            <>
              <Text style={styles.help}>
                {tr(
                  "This clears your game and deletes this guest’s saved cloud preferences.",
                )}
              </Text>
              <Button
                danger
                disabled={busy}
                onPress={() => {
                  void perform(async () => {
                    await model.deleteProfile("");
                    onClose();
                  });
                }}
              >
                {tr("Confirm reset guest data")}
              </Button>
            </>
          )}
        </>
      )}
      {busy && <ActivityIndicator color="#76207d" style={{ marginTop: 14 }} />}
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
    </Dialog>
  );
}

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#1e072477",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  gameOverlay: {
    flex: 1,
    backgroundColor: "#0009",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "88%",
    backgroundColor: "#fffcf7",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e8d3ac",
    boxShadow: "0 12px 45px #22072d40",
  },
  heading: {
    backgroundColor: "#290435",
    padding: 20,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#ece2e9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 21, color: "#fffaf2", fontWeight: "700", flex: 1 },
  intro: { color: "#66556a", fontSize: 15, lineHeight: 23, marginBottom: 20 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
  },
  label: { color: "#402647", fontSize: 14, fontWeight: "600" },
  help: { color: "#8a788b", fontSize: 12, lineHeight: 19, marginTop: 4 },
  speeds: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
    marginTop: 13,
    marginBottom: 9,
  },
  speed: {
    flex: 1,
    minWidth: 36,
    maxWidth: 48,
    height: 44,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#d9c5db",
    alignItems: "center",
    justifyContent: "center",
  },
  speedSelected: { backgroundColor: "#76207d", borderColor: "#76207d" },
  voiceOption: {
    flex: 1,
    minHeight: 48,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#d9c5db",
  },
  note: {
    backgroundColor: "#f3edf5",
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
  },
  noteText: { fontSize: 13, color: "#756078", lineHeight: 20 },
  sync: {
    color: "#668b56",
    fontSize: 12,
    textAlign: "center",
    marginVertical: 9,
  },
  action: {
    minHeight: 47,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 12,
  },
  actionText: {
    color: "#fff8eb",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  linkButton: {
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
  },
  link: {
    color: "#76207d",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#dfd1df",
    borderRadius: 9,
    padding: 13,
    fontSize: 15,
    color: "#402647",
    backgroundColor: "#fff",
    marginTop: 8,
    marginBottom: 16,
  },
  error: {
    color: "#af2d3a",
    backgroundColor: "#ffe9e9",
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 15,
  },
  divider: { height: 1, backgroundColor: "#e7dce7", marginVertical: 14 },
  recoveryCode: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    lineHeight: 22,
    color: "#402647",
    padding: 16,
    backgroundColor: "#eee4ee",
    borderRadius: 10,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginVertical: 17,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#76207d",
    alignItems: "center",
    justifyContent: "center",
  },
});
