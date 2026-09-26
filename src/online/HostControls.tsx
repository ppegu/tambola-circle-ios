import { useScreenNavigation } from "../navigation/ScreenContext";
import { t as tr, useLanguage } from "../i18n";
import React from "react";
import { StyleSheet } from "react-native";
import type { RoomSnapshot } from "../../shared/online";
import {
  Action,
  GameIcon,
  Icon,
  Pressable,
  ScrollView,
  Text,
  View,
} from "./components";
import { TableAvatar } from "../components/TableAvatar";
import { GameCard } from "../components/GameArtwork";
import { LinearGradient } from "../components/LinearGradient";
import { gameFont } from "../gameTypography";
import { CaptainSeatSwitch, SetupChoice } from "./TableSetupFields";
import type { ControlPage } from "./TableManagement";

export function HostControls({
  snapshot: s,
  busy,
  rules,
  onPage,
  onShare,
  onEnd,
  onLeave,
  onExit,
  onPlay,
  onWatch,
  onPreferences,
  onReclaim,
  onAvatar,
}: {
  onAvatar?: () => void;
  snapshot: RoomSnapshot;
  busy: boolean;
  rules?: React.ReactNode;
  onPage: (page: ControlPage) => void;
  onShare: () => void;
  onEnd: () => void;
  onLeave: () => void;
  onExit: () => void;
  onPlay: () => void;
  onWatch: () => void;
  onPreferences?: () => void;
  onReclaim: () => void;
}) {
  useLanguage();
  const navigation = useScreenNavigation();
  const host = s.hostId === s.viewerId,
    owner = s.ownerId === s.viewerId,
    me = s.members[s.viewerId]!;
  const canPlay =
    !me.disqualification &&
    (s.phase === "lobby" || (!!me.paid && s.roster.includes(me.id)));
  const row = (
    title: string,
    icon: string,
    onPress: () => void,
    subtitle?: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
    >
      <GameCard style={styles.row}>
        <Icon name={icon} color="#7427ad" size={25} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <Icon name="chevron" color="#321542" size={18} />
      </GameCard>
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <LinearGradient colors={["#592198", "#32105d"]} style={styles.room}>
        <Pressable
          accessibilityRole={host ? "button" : "image"}
          accessibilityLabel={
            host ? tr("Change table avatar") : tr("Table avatar")
          }
          disabled={!host || busy}
          onPress={onAvatar}
        >
          <TableAvatar
            id={s.tableAvatarId}
            photo={s.tableAvatarPhoto}
            size={48}
          />
          {host && (
            <View
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                padding: 2,
                borderRadius: 9,
                backgroundColor: "#ffdf75",
              }}
            >
              <Icon name="edit" size={13} color="#421558" />
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.roomTitle}>{s.name}</Text>
          <Text style={styles.round}>
            {tr("Round")} {s.round} ·{" "}
            {s.phase === "lobby"
              ? tr("Lobby")
              : s.phase === "live"
                ? tr("Live")
                : s.phase === "finished"
                  ? tr("Ended")
                  : tr("Verifying")}
          </Text>
        </View>
        {host && <Icon name="crown" color="#ffdc4e" size={28} />}
      </LinearGradient>
      {s.phase !== "finished" && (
        <GameCard style={{ gap: 6 }}>
          <View style={styles.options}>
            {host ? (
              <View
                style={{
                  flex: 1,
                  borderRadius: 17,
                  backgroundColor: "#401362",
                }}
              >
                <CaptainSeatSwitch
                  playing={!me.spectator}
                  disabled={busy || !canPlay}
                  onChange={(playing) => (playing ? onPlay() : onWatch())}
                />
              </View>
            ) : (
              <>
                <SetupChoice
                  label={tr("Play")}
                  icon="ticket"
                  selected={!me.spectator}
                  disabled={busy || !canPlay}
                  onPress={() => {
                    if (me.spectator) onPlay();
                  }}
                />
                <SetupChoice
                  label={tr("Watch")}
                  icon="eye"
                  selected={me.spectator}
                  disabled={busy}
                  onPress={() => {
                    if (!me.spectator) onWatch();
                  }}
                />
              </>
            )}
          </View>
          {!canPlay && (
            <Text style={styles.subtitle}>
              {tr("Playing seats open next round.")}
            </Text>
          )}
        </GameCard>
      )}
      {rules}
      {host &&
        s.phase === "lobby" &&
        row(
          tr("Game countdown"),
          "clock",
          () => onPage("schedule"),
          s.scheduledAt ? tr("Scheduled start") : tr("Start manually"),
        )}
      {host &&
        navigation &&
        row(tr("Invite a player"), "user-plus", () =>
          navigation.push("InvitePlayers"),
        )}
      {row(tr("Invite friends"), "share", onShare)}
      {row(tr("Round history"), "history", () => onPage("history"))}
      {onPreferences && row(tr("Game preferences"), "settings", onPreferences)}
      {owner && !host && (
        <Action small disabled={busy} onPress={onReclaim}>
          {tr("Reclaim captain controls")}
        </Action>
      )}
      {host && s.phase !== "lobby" && s.phase !== "finished" && (
        <Action small danger icon="stop" disabled={busy} onPress={onEnd}>
          {tr("End this round")}
        </Action>
      )}
      <View style={styles.links}>
        <Pressable
          accessibilityRole="button"
          onPress={onExit}
          style={styles.link}
        >
          <Text style={styles.linkText}>{tr("Play online")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onLeave}
          style={styles.link}
        >
          <Text style={styles.linkText}>{tr("Leave table")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { gap: 9, paddingBottom: 12 },
  room: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#ae63ef",
    padding: 10,
  },
  roomTitle: { color: "#fff8e7", fontFamily: gameFont.bold, fontSize: 20 },
  round: { color: "#ffe05b", fontFamily: gameFont.medium, fontSize: 14 },
  options: { flexDirection: "row", gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingVertical: 8,
    borderRadius: 16,
  },
  rowTitle: { color: "#291238", fontFamily: gameFont.medium, fontSize: 16 },
  subtitle: {
    color: "#6a5071",
    fontFamily: gameFont.medium,
    fontSize: 12,
    marginTop: 2,
  },
  links: { flexDirection: "row", justifyContent: "space-between" },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: 7 },
  linkText: { color: "#edd2ff", fontFamily: gameFont.medium, fontSize: 14 },
});
