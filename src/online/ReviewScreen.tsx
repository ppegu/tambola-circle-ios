import { t as tr, useLanguage } from "../i18n";
import React from "react";
import { type RoomSnapshot } from "../../shared/online";
import {
  Action,
  Countdown,
  GameIcon,
  Notice,
  ScrollView,
  Text,
  TicketPanel,
  View,
  ui,
} from "./components";
import { GameCard } from "../components/GameArtwork";
import { VerificationBoard } from "./AutoVerificationScreen";
export function ReviewScreen({
  snapshot: s,
  host,
  busy,
  onNext,
  onControls,
  onReplay,
}: {
  snapshot: RoomSnapshot;
  host: boolean;
  busy: boolean;
  onNext: () => void;
  onControls: () => void;
  onReplay: (number: number) => void;
}) {
  useLanguage();
  const c = s.claim,
    winner = s.result?.winner,
    person = s.members[c?.by ?? winner ?? ""];
  return (
    <ScrollView
      contentContainerStyle={{ padding: 8, gap: 10, paddingBottom: 20 }}
    >
      <GameCard>
        <View style={ui.row}>
          <GameIcon index={winner ? 8 : 6} size={68} />
          <View style={{ flex: 1 }}>
            <Text style={ui.heading}>
              {s.phase === "claim"
                ? tr("Checking full house…")
                : winner
                  ? tr("Full house verified!")
                  : tr("Round ended")}
            </Text>
            <Text style={ui.text}>{person?.name ?? s.name}</Text>
          </View>
        </View>
        {s.phase === "claim" ? (
          <>
            <Text accessibilityLiveRegion="polite" style={ui.ticketTitle}>
              {c?.checked ?? 0} {tr("/ 15 numbers checked")}
            </Text>
            <View
              style={{
                height: 15,
                backgroundColor: "#d3bfe0",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 15,
                  width: `${((c?.checked ?? 0) / 15) * 100}%`,
                  backgroundColor: "#8836c6",
                  borderRadius: 8,
                }}
              />
            </View>
            <Countdown
              compact
              deadline={c!.deadline}
              serverNow={s.serverNow}
              label={tr("Verification finishes")}
            />
            <Text style={ui.muted}>
              {tr(
                "Number calls are paused. Everyone sees the same ticket and called numbers.",
              )}
            </Text>
          </>
        ) : winner ? (
          <Notice tone="green">
            {tr("All 15 numbers were called. Well played!")}
          </Notice>
        ) : (
          <Notice tone="gold">
            {s.result?.reason === "not_enough_ready_players"
              ? tr(
                  "Not enough ready players. Reserved coins have been returned.",
                )
              : s.result?.reason === "numbers_exhausted"
                ? tr("All 90 numbers have been called.")
                : tr(
                    "The round has ended. Eligible entry coins have been returned.",
                  )}
          </Notice>
        )}
      </GameCard>
      {c && (
        <TicketPanel
          panel={c.panel}
          index={c.panelIndex}
          count={s.members[c.by]?.panels.length ?? 1}
          marks={c.marks}
          title={tr("{v0} · Ticket {v1}", {
            v0: person?.name,
            v1: c.panelIndex + 1,
          })}
        />
      )}
      <GameCard style={{ padding: 8 }}>
        <View style={ui.row}>
          <Text style={ui.ticketTitle}>{tr("Called number board")}</Text>
          <Text style={ui.muted}>{(c?.calls ?? s.calls).length} / 90</Text>
        </View>
        <VerificationBoard
          compact
          calls={c?.calls ?? s.calls}
          onReplay={onReplay}
        />
        <Text style={ui.muted}>
          {tr("Recent:")}{" "}
          {(c?.calls ?? s.calls).slice(-8).reverse().join(" · ") ||
            tr("No numbers yet")}
        </Text>
      </GameCard>
      {s.phase === "finished" && (
        <Action disabled={busy} onPress={onNext}>
          {tr("Back to lobby · Next round")}
        </Action>
      )}
      <Action secondary small onPress={onControls}>
        {host ? tr("Captain controls") : tr("Table & history")}
      </Action>
    </ScrollView>
  );
}
