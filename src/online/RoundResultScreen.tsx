import { t as tr, useLanguage } from "../i18n";
import React from "react";
import { StyleSheet } from "react-native";
import type { RoomSnapshot } from "../../shared/online";
import {
  Avatar,
  GameIcon,
  Icon,
  Pressable,
  ScrollView,
  Text,
  View,
} from "./components";
import { GameButton, GameLogo } from "../components/GameArtwork";
import { LinearGradient } from "../components/LinearGradient";
import { ClaimedTicket, VerificationBoard } from "./AutoVerificationScreen";
import { gameFont } from "../gameTypography";

export function RoundResultScreen({
  snapshot: s,
  busy,
  onNext,
  onNumbers,
  onReplay,
  onHistory,
  onTickets,
  onCoins,
}: {
  snapshot: RoomSnapshot;
  busy: boolean;
  onNext: () => void;
  onNumbers: () => void;
  onReplay: (number: number) => void;
  onHistory: () => void;
  onTickets: () => void;
  onCoins: () => void;
}) {
  useLanguage();
  const winner = s.members[s.result?.winner ?? ""],
    won = !!s.result?.winner,
    me = s.members[s.viewerId]!,
    played = s.roster.includes(me.id);
  const reason = s.result?.reason;
  const refunded = [
    "host_ended",
    "not_enough_ready_players",
    "verification_error",
  ].includes(reason ?? "");
  const status =
    reason === "host_ended"
      ? tr("Ended by the captain")
      : reason === "not_enough_ready_players"
        ? tr("Not enough ready players")
        : reason === "verification_error"
          ? tr("Verification interrupted")
          : reason === "numbers_exhausted"
            ? tr("All numbers called")
            : tr("Round complete");
  const detail = refunded
    ? tr("Entry coins returned")
    : tr("{count} of 90 numbers called", { count: s.calls.length });
  const viewerWon = won && s.result?.winner === s.viewerId;
  const title = !won
    ? tr("Round ended")
    : viewerWon
      ? tr("You won!")
      : played
        ? tr("Better luck next time!")
        : tr("Full house!");
  // Keep the evidence frozen at the accepted claim, including after reconnecting.
  const winningClaim = won && s.claim?.by === s.result?.winner ? s.claim : null;
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.logo}>
        <GameLogo width={134} />
        <Text accessible={false} style={styles.starLeft}>
          ✦
        </Text>
        <Text accessible={false} style={styles.starRight}>
          ✦
        </Text>
      </View>
      <View accessibilityRole="header" style={styles.heading}>
        <Text
          adjustsFontSizeToFit
          numberOfLines={2}
          maxFontSizeMultiplier={1.2}
          style={styles.fullHouse}
        >
          {title}
        </Text>
        {viewerWon && (
          <Text style={styles.congratulations}>{tr("Congratulations!")}</Text>
        )}
      </View>
      <View style={styles.winner}>
        {won ? (
          <Avatar
            name={winner?.name ?? tr("Winner")}
            avatarId={winner?.avatarId}
            photo={winner?.avatarPhoto}
            size={52}
          />
        ) : (
          <GameIcon index={reason === "numbers_exhausted" ? 8 : 6} size={52} />
        )}
        <View style={styles.verifiedRow}>
          <Text numberOfLines={2} style={styles.winnerName}>
            {won
              ? tr("{name} won · Full house", {
                  name: winner?.name ?? tr("Winner"),
                })
              : status}
          </Text>
          {won && (
            <View style={styles.check}>
              <Icon name="check" color="#fff" size={18} />
            </View>
          )}
        </View>
      </View>
      <LinearGradient
        colors={
          won
            ? ["#50f152", "#09b837", "#008b2b"]
            : ["#ffe992", "#ffd14e", "#dca026"]
        }
        style={[
          styles.verified,
          !won && { borderColor: "#ffec97", borderBottomColor: "#ac7418" },
        ]}
      >
        <View
          style={[
            styles.largeCheck,
            !won && { backgroundColor: "#b87b17", borderColor: "#ffe99a" },
          ]}
        >
          <Icon
            name={won ? "check" : refunded ? "refresh" : "history"}
            size={25}
            color="#fff"
          />
        </View>
        <Text style={[styles.verifiedText, !won && { color: "#43230e" }]}>
          {won ? tr("15 of 15 numbers called") : detail}
        </Text>
      </LinearGradient>
      {winningClaim ? (
        <View style={{ gap: 4 }}>
          <Text style={styles.ticketTitle}>
            {viewerWon
              ? tr("Your winning ticket")
              : tr("{name}’s winning ticket", {
                  name: winner?.name ?? tr("Winner"),
                })}
          </Text>
          <ClaimedTicket
            claim={winningClaim}
            name={winner?.name ?? tr("Winner")}
            showHeading={false}
          />
        </View>
      ) : (
        !won && (
          <LinearGradient
            colors={["#592582", "#2c0d50"]}
            style={styles.summary}
          >
            <Text
              style={[styles.summaryText, { textAlign: "center", padding: 12 }]}
            >
              {s.name}
              {"\n"}
              {tr("Round")} {s.round} · {s.calls.length} {tr("called ·")}{" "}
              {90 - s.calls.length} {tr("left")}
            </Text>
            <Text style={styles.hint}>
              {reason === "host_ended"
                ? tr("The table stays open for your next round.")
                : reason === "not_enough_ready_players"
                  ? tr("Choose tickets and get ready to play again.")
                  : reason === "verification_error"
                    ? tr("Return to the lobby for a fresh round.")
                    : tr("No full house was claimed this round.")}
            </Text>
          </LinearGradient>
        )
      )}
      <VerificationBoard
        calls={winningClaim?.calls ?? s.calls}
        onReplay={onReplay}
        onHistory={onNumbers}
        compact
      />
      <LinearGradient colors={["#542480", "#29114c"]} style={styles.summary}>
        <SummaryRow
          icon={6}
          label={
            played
              ? tr("Your tickets · {v0} strip", {
                  v0: me.kind === "full" ? tr("Full") : tr("Half"),
                })
              : tr("You watched this round")
          }
          onPress={played ? onTickets : undefined}
        />
        <SummaryRow
          icon={8}
          label={tr("Round {v0} complete", { v0: s.round })}
          onPress={onHistory}
        />
        <SummaryRow
          icon={3}
          label={
            refunded && played
              ? tr("Entry returned · View coins")
              : tr("Entry · {v0} coins", {
                  v0: played ? (me.entryCoins ?? 0) : 0,
                })
          }
          onPress={onCoins}
        />
      </LinearGradient>
      <GameButton
        glyph="home"
        disabled={busy}
        onPress={onNext}
        style={styles.next}
      >
        {tr("Back to lobby")}
      </GameButton>
      <Text style={styles.hint}>{tr("The captain starts the next round")}</Text>
    </ScrollView>
  );
}

function SummaryRow({
  icon,
  label,
  onPress,
}: {
  icon: number;
  label: string;
  onPress?: () => void;
}) {
  useLanguage();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      disabled={!onPress}
      onPress={onPress}
      style={styles.summaryRow}
    >
      <GameIcon index={icon} size={39} />
      <Text numberOfLines={1} style={styles.summaryText}>
        {label}
      </Text>
      {onPress && <Icon name="chevron" color="#fff4e6" size={20} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 10, paddingBottom: 18, gap: 8 },
  logo: { height: 62, alignItems: "center", justifyContent: "center" },
  starLeft: {
    position: "absolute",
    left: 35,
    top: 14,
    fontSize: 24,
    color: "#ffde4d",
    textShadowColor: "#d78c09",
    textShadowRadius: 9,
  },
  starRight: {
    position: "absolute",
    right: 32,
    bottom: 10,
    fontSize: 20,
    color: "#ffde4d",
    textShadowColor: "#d78c09",
    textShadowRadius: 9,
  },
  heading: { alignItems: "center", gap: 2 },
  fullHouse: {
    textAlign: "center",
    fontSize: 30,
    fontFamily: gameFont.bold,
    color: "#ffe951",
    textShadowColor: "#5a2600",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },
  congratulations: {
    color: "#fff2cb",
    fontFamily: gameFont.medium,
    fontSize: 17,
  },
  winner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 10,
    minHeight: 54,
  },
  verifiedRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  winnerName: {
    flexShrink: 1,
    fontSize: 16,
    color: "#fff6ed",
    fontFamily: gameFont.medium,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 12,
    backgroundColor: "#0ac145",
    alignItems: "center",
    justifyContent: "center",
  },
  verified: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#8dff76",
    borderBottomWidth: 3,
    borderBottomColor: "#056e22",
    alignItems: "center",
  },
  largeCheck: {
    width: 25,
    height: 25,
    borderRadius: 18,
    backgroundColor: "#1aba37",
    borderWidth: 1.5,
    borderColor: "#adffa1",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: {
    flexShrink: 1,
    fontFamily: gameFont.medium,
    color: "#fffdee",
    fontSize: 14,
  },
  ticketTitle: {
    color: "#ffe796",
    fontFamily: gameFont.medium,
    fontSize: 14,
    paddingHorizontal: 3,
  },
  summary: {
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: "#752aa8",
    padding: 7,
    gap: 7,
  },
  summaryRow: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 7,
    borderRadius: 21,
    borderWidth: 0.8,
    borderColor: "#824cb1",
    backgroundColor: "#59248145",
  },
  summaryText: {
    flex: 1,
    alignSelf: "center",
    color: "#fff7ef",
    fontFamily: gameFont.medium,
    fontSize: 16,
  },
  next: { minHeight: 59, borderRadius: 32, marginTop: 2 },
  hint: {
    textAlign: "center",
    color: "#d5abe9",
    fontFamily: gameFont.medium,
    fontSize: 14,
    paddingBottom: 5,
  },
});
