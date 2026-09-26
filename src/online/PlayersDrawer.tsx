import { GameDrawerSurface } from "./GameDrawerSurface";
import { t as tr, useLanguage } from "../i18n";
import { Text } from "../i18n/Text";
import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  memberProgress,
  type Member,
  type RoomSnapshot,
} from "../../shared/online";
import { LinearGradient } from "../components/LinearGradient";
import { Pressable } from "../components/Pressable";
import { gameFont } from "../gameTypography";
import { Avatar, Icon, ScrollView } from "./components";

function Stars() {
  useLanguage();
  return (
    <View accessible={false} style={styles.separator}>
      <View style={styles.line} />
      <Text style={styles.stars}>✦ ★ ✦</Text>
      <View style={styles.line} />
    </View>
  );
}

export function PlayersDrawer({
  snapshot: s,
  onMember,
  onClose,
  native = false,
}: {
  native?: boolean;
  snapshot: RoomSnapshot;
  onMember: (id: string) => void;
  onClose: () => void;
}) {
  useLanguage();
  const { height } = useWindowDimensions();
  const members = Object.values(s.members).filter(
    (member) => !member.left && !member.removed,
  );
  const players = members
    .filter((member) => s.roster.includes(member.id) && !member.spectator)
    .map((member) => ({ member, progress: memberProgress(member, s.calls) }))
    .sort(
      (a, b) =>
        b.progress.completed - a.progress.completed ||
        b.progress.best - a.progress.best ||
        a.member.joinedAt - b.member.joinedAt ||
        a.member.id.localeCompare(b.member.id),
    );
  const watching = members.filter(
    (member) => !s.roster.includes(member.id) || member.spectator,
  );
  const role = (member: Member) =>
    member.id === s.hostId
      ? tr("Captain")
      : member.id === s.coHostId
        ? tr("Co-captain")
        : member.id === s.viewerId
          ? tr("You")
          : "";
  return (
    <GameDrawerSurface native={native} onClose={onClose}>
      <SafeAreaProvider>
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Close players overlay")}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["#fffbed", "#fff4db", "#fffbea"]}
            style={[styles.panel, { marginTop: height * 0.12 }]}
          >
            <SafeAreaView
              accessibilityViewIsModal
              style={{ flex: 1 }}
              edges={["bottom"]}
            >
              <View style={styles.header}>
                <Text style={styles.title}>{tr("Players")}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr("Close players")}
                  onPress={onClose}
                  style={styles.close}
                >
                  <Icon name="close" color="#321052" size={24} />
                </Pressable>
              </View>
              <Text style={styles.subtitle}>
                {tr("Ranked by ticket progress")}
              </Text>
              <Stars />
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
              >
                {players.map(({ member, progress }, index) => (
                  <Pressable
                    key={member.id}
                    accessibilityRole="button"
                    accessibilityLabel={tr(
                      "View {v0}, rank {v1}, {v2} full houses, best ticket {v3} of 15, {v4} left",
                      {
                        v0: member.name,
                        v1: index + 1,
                        v2: progress.completed,
                        v3: progress.best,
                        v4: progress.left,
                      },
                    )}
                    onPress={() => onMember(member.id)}
                    style={styles.player}
                  >
                    <LinearGradient
                      colors={["#fffbed", "#fff2d7"]}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                    <View style={styles.playerTop}>
                      <View
                        style={[
                          styles.rank,
                          {
                            borderColor:
                              ["#e5a320", "#aaaaba", "#d58c49"][index] ??
                              "#d2aa70",
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={
                            index === 0
                              ? ["#fff08a", "#ffba25"]
                              : index === 1
                                ? ["#fff", "#c1bfce"]
                                : index === 2
                                  ? ["#ffe1a6", "#ed9347"]
                                  : ["#fffdf0", "#ffedcf"]
                          }
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      <Avatar
                        name={member.name}
                        avatarId={member.avatarId}
                        photo={member.avatarPhoto}
                        size={44}
                      />
                      <View style={styles.details}>
                        <View style={styles.nameRow}>
                          <Text numberOfLines={1} style={styles.name}>
                            {member.name}
                          </Text>
                          <View style={styles.viewButton}>
                            <LinearGradient
                              colors={["#b454fa", "#7c19d8", "#500498"]}
                              style={StyleSheet.absoluteFill}
                              pointerEvents="none"
                            />
                            <Icon name="eye" color="#fff8ed" size={16} />
                            <Text style={styles.viewText}>{tr("View")}</Text>
                          </View>
                        </View>
                        <Text style={styles.completed}>
                          {progress.completed} {tr("full")}{" "}
                          {progress.completed === 1
                            ? tr("house")
                            : tr("houses")}
                        </Text>
                        <View
                          accessibilityRole="progressbar"
                          accessibilityValue={{
                            min: 0,
                            max: 15,
                            now: progress.best,
                          }}
                          style={styles.track}
                        >
                          <LinearGradient
                            colors={["#ce79ff", "#972bf1", "#7413bf"]}
                            style={[
                              styles.fill,
                              { width: `${(progress.best / 15) * 100}%` },
                            ]}
                          />
                        </View>
                        <Text
                          maxFontSizeMultiplier={1.15}
                          style={styles.progress}
                        >
                          {tr("Best ticket")} {progress.best}/15 ·{" "}
                          {progress.left} {tr("left")}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
                {!players.length && (
                  <Text style={styles.empty}>
                    {tr("No players in this round")}
                  </Text>
                )}
                {!!watching.length && (
                  <>
                    <Stars />
                    <Text style={styles.watchingTitle}>
                      {tr("Watching (")}
                      {watching.length})
                    </Text>
                    {watching.map((member) => (
                      <Pressable
                        key={member.id}
                        accessibilityRole="button"
                        accessibilityLabel={tr("View {v0}, watching{v1}", {
                          v0: member.name,
                          v1: role(member) ? `, ${role(member)}` : "",
                        })}
                        onPress={() => onMember(member.id)}
                        style={styles.watcher}
                      >
                        <Avatar
                          name={member.name}
                          avatarId={member.avatarId}
                          photo={member.avatarPhoto}
                          size={42}
                        />
                        <Text
                          numberOfLines={1}
                          style={[styles.name, { flex: 1 }]}
                        >
                          {member.name}
                          {role(member) ? (
                            <Text style={styles.role}> · {role(member)}</Text>
                          ) : null}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}
                <Stars />
                <Text style={styles.footer}>{tr("Updates live")}</Text>
              </ScrollView>
            </SafeAreaView>
          </LinearGradient>
        </View>
      </SafeAreaProvider>
    </GameDrawerSurface>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", backgroundColor: "#14082088" },
  panel: {
    flex: 1,
    width: "100%",
    maxWidth: 576,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 1,
    borderColor: "#fff9d4",
    overflow: "hidden",
  },
  header: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 42,
    paddingTop: 9,
  },
  title: { fontFamily: gameFont.bold, color: "#2d0648", fontSize: 27 },
  close: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cfaa74",
    backgroundColor: "#fff8e8",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  subtitle: {
    color: "#60536f",
    fontFamily: gameFont.medium,
    fontSize: 13,
    textAlign: "center",
    marginTop: 2,
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 14,
    marginVertical: 8,
  },
  line: { flex: 1, height: 0.65, backgroundColor: "#c39b69" },
  stars: { color: "#ffbe35", fontSize: 14, letterSpacing: 2 },
  content: { paddingHorizontal: 8, paddingBottom: 12, gap: 6 },
  player: {
    borderRadius: 14,
    borderWidth: 0.7,
    borderColor: "#cfa46f",
    paddingHorizontal: 5,
    paddingVertical: 9,
    overflow: "hidden",
  },
  playerTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  rank: {
    height: 29,
    width: 26,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  rankText: { fontFamily: gameFont.medium, fontSize: 20, color: "#442000" },
  details: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  name: {
    fontFamily: gameFont.bold,
    fontSize: 15,
    flexShrink: 1,
    color: "#300c4b",
  },
  completed: { fontFamily: gameFont.medium, fontSize: 12, color: "#96600c" },
  viewButton: {
    marginLeft: "auto",
    height: 28,
    paddingHorizontal: 6,
    gap: 3,
    borderWidth: 1.2,
    borderBottomWidth: 2.5,
    borderColor: "#d9a0ff",
    borderBottomColor: "#430972",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  viewText: { fontFamily: gameFont.medium, fontSize: 12, color: "#fff7ee" },
  track: {
    height: 7,
    borderRadius: 5,
    backgroundColor: "#cfcbc8",
    overflow: "hidden",
    marginTop: 2,
  },
  fill: { height: "100%", borderRadius: 5 },
  progress: {
    color: "#5d536c",
    fontFamily: gameFont.medium,
    fontSize: 11,
    marginTop: 1,
  },
  watchingTitle: {
    fontFamily: gameFont.bold,
    fontSize: 18,
    color: "#310d4e",
    marginHorizontal: 3,
  },
  watcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderWidth: 0.7,
    borderColor: "#cda66f",
    borderRadius: 12,
    backgroundColor: "#fff9e98c",
  },
  role: { color: "#8933c5", fontFamily: gameFont.medium, fontSize: 12 },
  footer: {
    fontFamily: gameFont.medium,
    color: "#655873",
    fontSize: 12,
    textAlign: "center",
  },
  empty: {
    fontFamily: gameFont.medium,
    color: "#655873",
    fontSize: 14,
    padding: 18,
    textAlign: "center",
  },
});
