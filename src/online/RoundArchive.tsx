import { t as tr, useLanguage } from "../i18n";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import type { Phase } from "../../shared/online";
import type { Panel } from "../../shared/tickets";
import { GameCard } from "../components/GameArtwork";
import { LinearGradient } from "../components/LinearGradient";
import { gameFont } from "../gameTypography";
import {
  Avatar,
  Icon,
  Pill,
  Pressable,
  Text,
  TicketPanel,
  View,
} from "./components";
import { roundStatus } from "./roundStatus";

export function RoundArchive({
  round,
  phase,
  calls,
  reason,
  winner,
  at,
  tickets,
}: {
  round: number;
  phase: Phase;
  calls: number[];
  reason?: string;
  winner?: string | null;
  at?: number;
  tickets: {
    id: string;
    name: string;
    avatarId?: number;
    avatarPhoto?: string;
    panels: Panel[];
    marks: Record<string, boolean>;
  }[];
}) {
  useLanguage();
  const status = roundStatus(phase, calls.length, reason, winner);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <GameCard gold>
        <View style={styles.row}>
          <Text style={styles.title}>
            {tr("Round")} {round}
          </Text>
          <Pill tone={status.tone}>
            {phase === "finished" ? tr("Final result") : tr("Current round")}
          </Pill>
        </View>
        <Text accessibilityRole="header" style={styles.result}>
          {status.title}
        </Text>
        <Text style={styles.detail}>{status.detail}</Text>
        {!!at && (
          <Text style={styles.meta}>{new Date(at).toLocaleString()}</Text>
        )}
      </GameCard>
      <CalledNumberBoard calls={calls} />
      {!!tickets.length && (
        <Text style={styles.section}>{tr("Players’ tickets")}</Text>
      )}
      {tickets.map((player) => (
        <View key={player.id} style={{ gap: 3 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Tickets: {v0}", { v0: player.name })}
            accessibilityState={{ expanded: open === player.id }}
            onPress={() => setOpen(open === player.id ? null : player.id)}
          >
            <GameCard style={styles.row}>
              <Avatar
                name={player.name}
                avatarId={player.avatarId}
                photo={player.avatarPhoto}
                size={34}
              />
              <Text style={[styles.title, { flex: 1 }]}>{player.name}</Text>
              <Text style={styles.meta}>
                {player.panels.length} {tr("tickets")}
              </Text>
              <Icon
                name={open === player.id ? "minus" : "plus"}
                color="#572271"
                size={20}
              />
            </GameCard>
          </Pressable>
          {open === player.id &&
            player.panels.map((panel, index) => (
              <TicketPanel
                compact
                key={index}
                panel={panel}
                index={index}
                count={player.panels.length}
                marks={player.marks}
              />
            ))}
        </View>
      ))}
    </>
  );
}
export const CalledNumberBoard = React.memo(function CalledNumberBoard({
  calls,
}: {
  calls: number[];
}) {
  useLanguage();
  const called = new Set(calls),
    latest = calls.at(-1);
  return (
    <LinearGradient colors={["#662b99", "#32105b"]} style={styles.board}>
      <View style={styles.row}>
        <Text style={styles.section}>{tr("Called numbers")}</Text>
        <Text style={styles.total}>
          {calls.length} {tr("called ·")} {90 - calls.length} {tr("left")}
        </Text>
      </View>
      <View
        accessibilityLabel={tr("{v0} numbers called, {v1} remaining", {
          v0: calls.length,
          v1: 90 - calls.length,
        })}
        style={styles.grid}
      >
        {Array.from({ length: 9 }, (_, row) => (
          <View key={row} style={styles.rowGrid}>
            {Array.from({ length: 10 }, (_, column) => {
              const n = row * 10 + column + 1,
                marked = called.has(n);
              return (
                <View
                  key={n}
                  accessible
                  accessibilityLabel={`${n}, ${marked ? tr("called") : tr("not called")}`}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.face,
                      marked && styles.called,
                      n === latest && styles.latest,
                    ]}
                  >
                    <Text
                      maxFontSizeMultiplier={1.15}
                      style={[styles.number, marked && styles.marked]}
                    >
                      {n}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {!calls.length ? (
        <Text style={styles.hint}>{tr("No numbers were called.")}</Text>
      ) : (
        <Text style={styles.hint}>
          {tr("Last called:")} {latest} {tr("· Previous:")}{" "}
          {calls.at(-2) ?? "—"}
        </Text>
      )}
    </LinearGradient>
  );
});
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
  },
  title: { fontFamily: gameFont.medium, fontSize: 16, color: "#36134d" },
  result: { fontFamily: gameFont.bold, fontSize: 24, color: "#36134d" },
  detail: { color: "#4e3356", fontFamily: gameFont.medium, fontSize: 14 },
  meta: { color: "#735c75", fontSize: 12 },
  section: { fontFamily: gameFont.medium, fontSize: 17, color: "#fff4e3" },
  total: { fontFamily: gameFont.medium, fontSize: 12, color: "#ffe375" },
  board: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#c48cea",
    padding: 9,
    gap: 9,
  },
  grid: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#efc377",
    backgroundColor: "#fff0d4",
    padding: 3,
  },
  rowGrid: { flexDirection: "row" },
  cell: {
    flex: 1,
    minWidth: 0,
    height: 31,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.4,
    borderColor: "#d4b78c",
  },
  face: {
    width: "94%",
    maxWidth: 28,
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  called: { backgroundColor: "#ec2843", borderColor: "#ffdfaa" },
  latest: { borderColor: "#ffb600", borderWidth: 2 },
  number: { fontFamily: gameFont.medium, fontSize: 14, color: "#3e2536" },
  marked: { color: "#fff" },
  hint: { fontSize: 12, color: "#ebd1fb", textAlign: "center" },
});
