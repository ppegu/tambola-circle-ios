import { t as tr, useLanguage } from "../i18n";
import { Text } from "../i18n/Text";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  BackHandler,
  findNodeHandle,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CircleDevice from "../../modules/circle-device";
import { API_URL } from "../api";
import { gameFont } from "../gameTypography";
import { GameLogo } from "../components/GameArtwork";
import { LinearGradient } from "../components/LinearGradient";
import { Pressable } from "../components/Pressable";
import {
  UpdateController,
  isAccessCheckPending,
  type UpdateState,
} from "./controller";
import { UpdateArtwork, UpdateBackground } from "./UpdateArtwork";
import {
  useScreenActive,
  useScreenNavigation,
} from "../navigation/ScreenContext";

const Context = createContext<UpdateController | null>(null);
let sharedController: UpdateController | undefined;
let users = 0;
let stopService: (() => void) | undefined;
function retainUpdates() {
  const model = (sharedController ??= new UpdateController());
  if (users++ === 0) {
    void model.start();
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener("change", (value) => {
      const resumed = value === "active" && previous !== "active";
      previous = value;
      if (resumed) {
        void model.tick(true);
        void model.pollTransfer();
      }
    });
    const timer = setInterval(() => {
      void model.tick();
    }, 15_000);
    const progress = setInterval(() => {
      if (
        AppState.currentState === "active" &&
        (model.state.details ||
          (!model.state.permitted && model.release) ||
          ["downloading", "verifying", "installing"].includes(
            model.state.transfer?.status ?? "",
          ))
      )
        void model.pollTransfer();
    }, 750);
    stopService = () => {
      subscription.remove();
      clearInterval(timer);
      clearInterval(progress);
      model.stop();
    };
  }
  return () => {
    if (--users === 0) {
      stopService?.();
      stopService = undefined;
    }
  };
}
export const useAppUpdates = () => useContext(Context);
const mb = (bytes: number) => (bytes / 1048576).toFixed(1);
function GoldButton({
  children,
  onPress,
  disabled = false,
  secondary = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.6 : 1, width: "100%" }}
    >
      <LinearGradient
        colors={
          secondary ? ["#63278a", "#461066"] : ["#fff383", "#ffcd2c", "#ffb300"]
        }
        style={[s.button, secondary && s.secondary]}
      >
        <Text style={[s.buttonText, secondary && { color: "#fff7f2" }]}>
          {children}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
function Link({
  children,
  onPress,
  light = false,
}: {
  children: string;
  onPress: () => void;
  light?: boolean;
}) {
  useLanguage();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.link}>
      <Text style={[s.linkText, light && { color: "#fff3db" }]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function UpdateBanner() {
  useLanguage();
  const model = useAppUpdates();
  return model ? <SubscribedBanner model={model} /> : null;
}
function SubscribedBanner({ model }: { model: UpdateController }) {
  useLanguage();
  const state = useSyncExternalStore(model.subscribe, model.snapshot),
    release = model.release;
  if (
    state.access?.decision !== "optional_update" ||
    !release ||
    state.dismissed === release.id
  )
    return null;
  return (
    <View style={s.banner}>
      <Text accessible={false} style={{ fontSize: 25 }}>
        📣
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={s.bannerTitle}>{tr("A new version is ready")}</Text>
        <Text style={s.bannerBody}>
          {tr("Get the latest improvements")}
          {"\n"}
          {tr("for a smoother experience.")}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("View update")}
        onPress={model.show}
        style={s.bannerUpdate}
      >
        <Text
          style={{ color: "#34134a", fontFamily: gameFont.bold, fontSize: 15 }}
        >
          {tr("Update")}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("Dismiss this optional update")}
        onPress={() => {
          void model.dismiss();
        }}
        style={s.dismiss}
      >
        <Text style={{ color: "#371747", fontSize: 25 }}>×</Text>
      </Pressable>
    </View>
  );
}
export function AndroidUpdateRoot({ children }: { children: React.ReactNode }) {
  useLanguage();
  // Dev and release builds follow the same verified access/update workflow.
  return Platform.OS === "android" ? (
    <AndroidRoot>{children}</AndroidRoot>
  ) : (
    <>{children}</>
  );
}
function AndroidRoot({ children }: { children: React.ReactNode }) {
  useLanguage();
  const [model] = useState(() => (sharedController ??= new UpdateController()));
  const navigation = useScreenNavigation(),
    active = useScreenActive();
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(retainUpdates, []);
  const gate = !state.permitted || state.details || state.success;
  useEffect(() => {
    if (!gate || active === false) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (model.state.permitted) model.close();
      else BackHandler.exitApp();
      return true;
    });
    return () => listener.remove();
  }, [gate, model, active]);
  // Native screens stay mounted behind the gate, preserving forms and scroll state.
  return (
    <Context.Provider value={model}>
      {navigation ? (
        <>
          <View style={{ flex: 1, display: gate ? "none" : "flex" }}>
            {children}
          </View>
          {gate && active && <UpdateScreen model={model} state={state} />}
        </>
      ) : gate ? (
        <UpdateScreen model={model} state={state} />
      ) : (
        children
      )}
    </Context.Provider>
  );
}
export function UpdateScreen({
  model,
  state,
}: {
  model: UpdateController;
  state: UpdateState;
}) {
  useLanguage();
  const insets = useSafeAreaInsets(),
    heading = useRef<Text>(null),
    [notesOpen, setNotesOpen] = useState(false),
    [copied, setCopied] = useState(false),
    [helpError, setHelpError] = useState("");
  const release = model.release,
    kind = state.access?.decision;
  const required =
    !state.permitted &&
    (kind === "required_update" || kind === "release_blocked");
  const blocked = kind === "device_blocked",
    locked = kind === "app_locked";
  const transfer =
    release && state.transfer?.releaseId === release.id ? state.transfer : null;
  const downloading = transfer?.status === "downloading",
    verifying = transfer?.status === "verifying",
    paused = transfer?.status === "paused",
    failed = transfer?.status === "error";
  const ready =
    transfer?.status === "ready" || transfer?.status === "installing";
  const permission = ready && !transfer?.canInstall;
  const progress = transfer?.total
    ? Math.min(1, transfer.downloaded / transfer.total)
    : 0;
  const retired =
    kind === "release_blocked" &&
    !downloading &&
    !verifying &&
    !paused &&
    !ready &&
    !failed;
  const checking = isAccessCheckPending(state, !!release);
  const checkFailed =
    state.permitted &&
    state.details &&
    !release &&
    !!state.error &&
    !state.success;
  const connection =
    !checking && !state.permitted && !blocked && !locked && !required;
  const upToDate =
    state.success ||
    (state.permitted && !release && !state.error && !state.checking);
  const light =
    blocked ||
    locked ||
    connection ||
    checkFailed ||
    retired ||
    (required && !release);
  const transferError = (failed ? transfer.error : "") || state.error;
  const space = /space/i.test(transferError),
    integrity = /verify|signing|match|APK could not/i.test(transferError);
  const title = checking
    ? state.ready
      ? tr("Checking for updates")
      : tr("Checking app access")
    : checkFailed
      ? tr("Couldn’t check for updates")
      : blocked
        ? tr("Access restricted")
        : locked
          ? tr("We’ll be back soon")
          : connection
            ? tr("Connect to continue")
            : upToDate
              ? tr("You’re up to date")
              : retired
                ? release
                  ? tr("This version has retired")
                  : tr("This version is no longer supported.")
                : downloading
                  ? tr("Downloading update")
                  : verifying
                    ? tr("Verifying update")
                    : paused
                      ? tr("Download paused")
                      : failed || (transferError && space)
                        ? space
                          ? tr("More space needed")
                          : integrity
                            ? tr("We couldn’t verify this download.")
                            : tr("Download interrupted")
                        : permission
                          ? tr("Allow updates from Tambola Circle")
                          : ready
                            ? state.installAttempted
                              ? tr("Update not installed")
                              : tr("Ready to install")
                            : required
                              ? tr("Update to keep playing")
                              : tr("Update Tambola Circle");
  const illustration = blocked
    ? "lock"
    : locked
      ? "tools"
      : connection || checkFailed
        ? "wifi"
        : upToDate
          ? "success"
          : ready
            ? "install"
            : "download";
  const help = async () => {
    try {
      await Linking.openURL(
        API_URL + "/help/install-android" + (blocked ? "#access" : ""),
      );
    } catch {
      setHelpError(
        tr("Open the download page in your browser for installation help."),
      );
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      const tag = findNodeHandle(heading.current);
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 150);
    return () => clearTimeout(timer);
  }, [title]);
  const milestone = Math.floor(progress * 4);
  useEffect(() => {
    if (downloading && milestone > 0)
      AccessibilityInfo.announceForAccessibility(
        "Update download " + milestone * 25 + " percent",
      );
  }, [downloading, milestone]);
  return (
    <UpdateBackground
      gold={light}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#31065b" />
      {required && (
        <LinearGradient colors={["#fff477", "#ffc72a"]} style={s.required}>
          <Text style={s.requiredText}>{tr("⚠ Update required")}</Text>
        </LinearGradient>
      )}
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.center}>
          <GameLogo width={light ? 184 : 218} />
          <View style={[s.content, light && s.card]}>
            {!checking && (
              <UpdateArtwork
                kind={illustration}
                size={light ? 102 : 122}
                progress={downloading || verifying ? progress : undefined}
              />
            )}
            <Text
              ref={heading}
              accessibilityRole="header"
              style={[s.title, light && s.dark]}
            >
              {title}
            </Text>
            {checking ? (
              <ActivityIndicator
                size="large"
                color="#ffe177"
                accessibilityLabel={tr("Checking app access")}
              />
            ) : (
              <>
                {blocked ? (
                  <>
                    <Text style={[s.body, s.dark]}>
                      {tr(
                        "This device cannot use Tambola Circle. Contact support if you think this is a mistake.",
                      )}
                    </Text>
                    {!!state.access?.supportReference && (
                      <View style={s.reference}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.dark}>{tr("Support reference")}</Text>
                          <Text selectable style={s.referenceCode}>
                            {state.access.supportReference}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={tr("Copy support reference")}
                          style={s.copy}
                          onPress={() => {
                            void CircleDevice.setClipboard(
                              state.access!.supportReference!,
                            ).then(() => setCopied(true));
                          }}
                        >
                          <Text style={s.linkText}>
                            {copied ? tr("Copied") : tr("Copy")}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                    <GoldButton
                      onPress={() => {
                        void help();
                      }}
                    >
                      {tr("Get help")}
                    </GoldButton>
                    <Link
                      onPress={() => {
                        void model.refresh();
                      }}
                    >
                      {state.checking ? tr("Checking…") : tr("Check again")}
                    </Link>
                  </>
                ) : locked || connection || checkFailed ? (
                  <>
                    <Text style={[s.body, s.dark]}>
                      {locked
                        ? state.access?.message ||
                          tr(
                            "Tambola Circle is temporarily unavailable. Please try again later.",
                          )
                        : checkFailed
                          ? tr(
                              "Connect to the internet to check for the latest version.",
                            )
                          : tr(
                              "Go online so we can check this app version and device access.",
                            )}
                    </Text>
                    <GoldButton
                      disabled={state.checking}
                      onPress={() => {
                        void model.refresh();
                      }}
                    >
                      {tr("Try again")}
                    </GoldButton>
                    <Link
                      onPress={() => {
                        void help();
                      }}
                    >
                      {tr("Get help")}
                    </Link>
                    {connection && (
                      <Text style={[s.saved, s.dark]}>
                        {tr("ⓘ Your saved data is still on this device.")}
                      </Text>
                    )}
                  </>
                ) : upToDate ? (
                  <>
                    <Text style={s.body}>
                      {tr("Version")} {state.info?.appVersion}
                    </Text>
                    <Text style={[s.body, { marginBottom: 16 }]}>
                      {tr("Ready for your next game.")}
                    </Text>
                    <GoldButton onPress={model.close}>
                      {tr("Continue")}
                    </GoldButton>
                  </>
                ) : !release ? (
                  <>
                    <Text style={[s.body, light && s.dark]}>
                      {tr(
                        "A compatible update isn’t available for this device.",
                      )}
                    </Text>
                    <GoldButton
                      disabled={state.checking}
                      onPress={() => {
                        void model.refresh();
                      }}
                    >
                      {tr("Check again")}
                    </GoldButton>
                    <Link
                      light={!light}
                      onPress={() => {
                        void help();
                      }}
                    >
                      {tr("Get help")}
                    </Link>
                  </>
                ) : (
                  <>
                    {!downloading &&
                      !verifying &&
                      !paused &&
                      !failed &&
                      !ready && (
                        <Text style={[s.body, light && s.dark]}>
                          {retired
                            ? tr(
                                "Install the latest version to use Tambola Circle again.",
                              )
                            : required
                              ? tr("This version is no longer supported.")
                              : tr(
                                  "Get the latest improvements for a smoother experience.",
                                )}
                        </Text>
                      )}
                    {retired ? (
                      <View style={s.versionBox}>
                        <Text style={[s.body, s.dark]}>
                          {tr("Installed:")} {state.info?.appVersion}
                        </Text>
                        <Text style={[s.body, s.dark]}>
                          {tr("Available:")} {release.versionName}
                        </Text>
                      </View>
                    ) : (
                      !downloading &&
                      !verifying && (
                        <Text style={s.body}>
                          {tr("Version")} {release.versionName} ·{" "}
                          {mb(release.bytes)} {tr("MB")}
                        </Text>
                      )
                    )}
                    {(downloading || verifying || paused) && (
                      <>
                        <View style={s.progressRow}>
                          <View style={s.track}>
                            <LinearGradient
                              colors={["#fff47a", "#ffc820"]}
                              style={{
                                width: (progress * 100 + "%") as "100%",
                                height: 16,
                                borderRadius: 9,
                              }}
                            />
                          </View>
                          <Text style={s.percent}>
                            {Math.floor(progress * 100)}%
                          </Text>
                        </View>
                        <Text style={s.body}>
                          {mb(transfer!.downloaded)} {tr("MB of")}{" "}
                          {mb(release.bytes)} {tr("MB")}
                        </Text>
                        <Text style={s.hint}>
                          {tr("⌁ You can retry if the connection drops.")}
                          {paused ? tr("\nKeep the app open to continue.") : ""}
                        </Text>
                      </>
                    )}
                    {permission && (
                      <Text style={s.body}>
                        {tr(
                          "Android will ask you to allow installation from this source. Then return here to install.",
                        )}
                      </Text>
                    )}
                    {ready && !permission && (
                      <Text style={s.body}>
                        {state.installAttempted
                          ? tr("Tap Install update when you’re ready.")
                          : tr("Android will ask you to confirm the update.")}
                      </Text>
                    )}
                    {failed && (
                      <Text style={s.body}>
                        {space
                          ? tr("Free up space on this device, then try again.")
                          : integrity
                            ? tr("Download a fresh copy to continue.")
                            : tr("Check your connection and try again.")}
                      </Text>
                    )}
                    {!ready &&
                      !downloading &&
                      !paused &&
                      !failed &&
                      !verifying &&
                      !retired && (
                        <View style={s.noteBox}>
                          {release.notes.slice(0, 2).map((note, i) => (
                            <Text key={i} style={s.note}>
                              🟡 {note}
                            </Text>
                          ))}
                        </View>
                      )}
                    {verifying ? (
                      <ActivityIndicator color="#ffe46a" />
                    ) : downloading ? (
                      <GoldButton
                        secondary
                        disabled={state.busy}
                        onPress={() => {
                          void model.pause();
                        }}
                      >
                        {tr("Ⅱ Pause download")}
                      </GoldButton>
                    ) : ready ? (
                      <GoldButton
                        disabled={state.busy}
                        onPress={() => {
                          void (permission
                            ? model.permission()
                            : model.install());
                        }}
                      >
                        {permission
                          ? tr("Open Android settings")
                          : state.busy
                            ? tr("Preparing installer…")
                            : tr("Install update")}
                      </GoldButton>
                    ) : (
                      <GoldButton
                        disabled={state.busy}
                        onPress={() => {
                          void model.download();
                        }}
                      >
                        {paused
                          ? tr("Resume download")
                          : failed
                            ? integrity
                              ? tr("Download again")
                              : tr("Retry download")
                            : tr("Download update")}
                      </GoldButton>
                    )}
                    {!downloading && !verifying && (
                      <>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-around",
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            light={!light}
                            onPress={() => setNotesOpen(!notesOpen)}
                          >
                            {tr("What’s new")}
                          </Link>
                          <Link
                            light={!light}
                            onPress={() => {
                              void help();
                            }}
                          >
                            {tr("Get help")}
                          </Link>
                        </View>
                        {notesOpen && (
                          <View style={[s.noteBox, light && s.versionBox]}>
                            {release.notes.map((note, i) => (
                              <Text key={i} style={[s.note, light && s.dark]}>
                                ✓ {note}
                              </Text>
                            ))}
                            <Text style={[s.note, light && s.dark]}>
                              {tr("Android API")} {release.minSdk}
                              {tr("+ · Installed")} {state.info?.appVersion}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </>
                )}
                {!!(state.error || helpError) && (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[s.error, light && s.dark]}
                  >
                    {helpError || state.error}
                  </Text>
                )}
                {state.permitted && !upToDate && (
                  <Link light={!light} onPress={model.close}>
                    {tr("Back")}
                  </Link>
                )}
              </>
            )}
          </View>
          <Text style={s.footer}>
            {light
              ? tr("★   PLAY TOGETHER BRIGHTER   ★")
              : tr("Your saved data stays on this device.")}
          </Text>
        </View>
      </ScrollView>
    </UpdateBackground>
  );
}
const s = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20 },
  center: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  content: { width: "100%", alignItems: "center", gap: 12 },
  card: {
    backgroundColor: "#fff7f2",
    padding: 22,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#ffeedc",
    elevation: 5,
  },
  title: {
    fontFamily: gameFont.bold,
    fontSize: 30,
    lineHeight: 34,
    color: "#fff7f2",
    textAlign: "center",
  },
  dark: { color: "#2c074d" },
  body: { color: "#fff7f2", fontSize: 16, lineHeight: 23, textAlign: "center" },
  button: {
    borderRadius: 22,
    minHeight: 55,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#fff3a0",
    borderBottomWidth: 4,
    borderBottomColor: "#d38c16",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  buttonText: {
    color: "#2b1400",
    fontFamily: gameFont.bold,
    fontSize: 22,
    textAlign: "center",
  },
  secondary: {
    borderColor: "#c38ede",
    borderBottomColor: "#b780d5",
    borderBottomWidth: 1.5,
  },
  required: {
    padding: 12,
    minHeight: 49,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  requiredText: {
    textAlign: "center",
    color: "#641606",
    fontFamily: gameFont.bold,
    fontSize: 21,
  },
  link: {
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: {
    color: "#31065b",
    fontFamily: gameFont.medium,
    fontSize: 17,
    textDecorationLine: "underline",
  },
  noteBox: {
    backgroundColor: "#5e248480",
    borderColor: "#9755b9",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    gap: 9,
  },
  note: { fontSize: 15, lineHeight: 21, color: "#fff7f2" },
  progressRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 5,
  },
  track: {
    flex: 1,
    height: 18,
    borderWidth: 1,
    borderColor: "#a873bc",
    backgroundColor: "#3d145d",
    borderRadius: 10,
    overflow: "hidden",
  },
  percent: { color: "#fff7f2", fontFamily: gameFont.medium, fontSize: 18 },
  hint: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#62228888",
    borderWidth: 1,
    borderColor: "#9150b6",
    color: "#fff7f2",
    fontSize: 15,
    textAlign: "center",
    width: "100%",
  },
  footer: {
    color: "#fff0bd",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
  },
  error: {
    color: "#ffe2bc",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  saved: {
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#faeadc",
    fontSize: 14,
    lineHeight: 20,
  },
  versionBox: {
    backgroundColor: "#faebdf",
    borderColor: "#f0d4bb",
    borderRadius: 16,
    padding: 16,
    width: "100%",
  },
  reference: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#faeadc",
    width: "100%",
  },
  referenceCode: {
    color: "#31065b",
    fontFamily: gameFont.bold,
    fontSize: 21,
    marginTop: 3,
  },
  copy: { minHeight: 48, padding: 8, justifyContent: "center" },
  banner: {
    backgroundColor: "#fff7e9",
    borderWidth: 1.5,
    borderColor: "#ffdf5e",
    borderRadius: 14,
    padding: 10,
    paddingRight: 47,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 76,
  },
  bannerTitle: { fontFamily: gameFont.bold, color: "#290743", fontSize: 14 },
  bannerBody: { color: "#3b274a", fontSize: 10, lineHeight: 14, marginTop: 3 },
  bannerUpdate: {
    minHeight: 48,
    paddingHorizontal: 10,
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#ffdb42",
    borderWidth: 1,
    borderColor: "#e9aa1a",
  },
  dismiss: {
    position: "absolute",
    right: 0,
    top: 0,
    minWidth: 44,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
