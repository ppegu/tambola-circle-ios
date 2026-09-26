import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GameBackground } from "../src/components/GameArtwork";
import { HomeScreen } from "../src/components/HomeScreen";
import { OnlineEntry } from "../src/online/OnlineEntry";
import { TableScreen } from "../src/online/TableScreen";
import { GamePreferencesSheet } from "../src/online/Extras";
import { CallerScreen } from "../src/components/CallerScreen";
import {
  applyRoomCommand,
  createRoom,
  joinRoom,
} from "../server/src/room-engine";
import {
  DEFAULT_TABLE_CONFIG,
  type RoomCommand,
  type RoomSnapshot,
  type RoomState,
} from "../shared/online";
import { PendingMarks } from "../src/online/pendingMarks";
import type { OnlineModel } from "../src/online/useOnline";
const phoneWidth = Math.min(window.innerWidth, 576),
  phoneHeight = window.innerHeight,
  insetTop = Number(new URLSearchParams(location.search).get("top") ?? 24),
  insetBottom = Number(
    new URLSearchParams(location.search).get("bottom") ?? 24,
  );
const previewPlans = [
  {
    id: "pocket",
    label: "Pocket of fun",
    coins: 100,
    artwork: 0,
    recommended: false,
  },
  {
    id: "party",
    label: "Party pack",
    coins: 500,
    artwork: 1,
    recommended: true,
  },
  {
    id: "celebration",
    label: "Celebration",
    coins: 1200,
    artwork: 2,
    recommended: false,
  },
];
const now = Date.now(),
  names = ["Priya", "Arjun", "Meera", "Nani", "Ravi", "Ramesh"];
const profile = (i: number) => ({
  id: "p" + i,
  name: names[i]!,
  mobile: "+91987654321" + i,
  mobileSource: "device_selected" as const,
  verificationStatus: "unverified" as const,
});
let seed = 17;
const random = (max: number) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % max;
};
function fixture() {
  let s = createRoom(
    "preview",
    "Family fun",
    "482916",
    "a".repeat(64),
    profile(0),
    DEFAULT_TABLE_CONFIG,
    now,
  ).state;
  for (let i = 1; i < 6; i++) s = joinRoom(s, profile(i), now).state;
  for (let i = 1; i < 5; i++) {
    s = run(s, "p" + i, "SELECT", { kind: i === 1 ? "full" : "half" });
    s = run(s, "p" + i, "CONFIRM_STRIP", { stripVersion: 1 });
    s = run(s, "p" + i, "READY", { ready: true });
  }
  return s;
}
function run(
  s: RoomState,
  id: string,
  type: RoomCommand["type"],
  payload: Record<string, unknown> = {},
) {
  return applyRoomCommand(
    s,
    id,
    {
      id: crypto.randomUUID(),
      type,
      payload,
      roundId: s.roundId,
      authorityEpoch: s.authorityEpoch,
    },
    Date.now(),
    random,
  ).state;
}
function App() {
  const query = new URLSearchParams(location.search),
    screen = query.get("screen") ?? "home",
    isLive = ["live", "hostlive", "verify", "winner"].includes(screen);
  const [state, setState] = useState(() => {
    let s = fixture();
    if (screen === "scheduled") s.scheduledAt = Date.now() + 120000;
    if (isLive) {
      s = run(s, "p0", "START");
      s.calls = [
        1, 6, 12, 15, 22, 25, 27, 29, 31, 34, 43, 46, 55, 59, 61, 64, 65, 72,
        75, 83, 4, 18, 33, 54, 69, 81, 23, 86,
      ];
      for (const m of Object.values(s.members))
        m.panels.forEach((p, i) =>
          p.flat().forEach((n, c) => {
            if (n && s.calls.includes(n)) m.marks[`${i}:${c}`] = true;
          }),
        );
      if (screen === "verify" || screen === "winner") {
        s.calls = s.members
          .p1!.panels[0]!.flat()
          .filter((n): n is number => n !== null);
        s = run(s, "p1", "CLAIM", { panel: 0 });
        s.claim!.checked = 12;
        if (screen === "winner") {
          s.phase = "finished";
          s.result = {
            winner: "p1",
            panelIndex: 0,
            reason: "full_house_verified",
            at: now,
          };
        }
      }
    }
    return s;
  });
  const viewer =
      query.get("viewer") ?? (isLive && screen !== "hostlive" ? "p1" : "p0"),
    [prefs, setPrefs] = useState(screen === "preferences"),
    [page, setPage] = useState(screen),
    [error, setError] = useState(""),
    [historyOpen, setHistoryOpen] = useState(false);
  const [pendingMarks] = useState(() => new PendingMarks());
  const snapshot = {
    ...state,
    serverNow: now,
    viewerId: viewer,
  } as RoomSnapshot;
  const [wallet, setWallet] = useState({
    balance: query.has("balance") ? Number(query.get("balance")) : 1200,
    held: 0,
    testMode: true,
    transactions: [{ id: "welcome", kind: "welcome", amount: 1200, at: now }],
  });
  const model = {
    loaded: true,
    identity:
      page === "register"
        ? { key: "preview", deviceUuid: "11111111-1111-4111-8111-111111111111" }
        : {
            key: "preview",
            deviceUuid: "11111111-1111-4111-8111-111111111111",
            profile: profile(Number(viewer.slice(1))),
          },
    error,
    setError,
    snapshot,
    tables: [
      {
        id: "preview",
        name: "Family fun",
        round: 1,
        phase: "lobby",
        ownerId: "p0",
        updatedAt: now,
      },
    ],
    wallet,
    catalog: { plans: previewPlans, testMode: true },
    catalogLoading: false,
    catalogError: "",
    refreshCatalog: async () => {},
    tablesLoading: false,
    tablesError: "",
    refreshWallet: async () => {},
    buyCoins: async (id: string) => {
      const amount = previewPlans.find((p) => p.id === id)!.coins;
      setWallet((w) => ({ ...w, balance: w.balance + amount }));
      return amount;
    },
    pendingMarks,
    mark: (panel: number, cell: number, marked?: boolean) =>
      setState((s) =>
        run(s, viewer, "MARK", {
          panel,
          cell,
          marked: marked ?? !s.members[viewer]?.marks[panel + ":" + cell],
          version: s.members[viewer]?.markVersions[`${panel}:${cell}`] ?? 0,
        }),
      ),
    connected: true,
    busy: false,
    register: async () => true,
    create: async () => {
      setPage("lobby");
      return true;
    },
    join: async () => true,
    rejoin: async () => {
      setPage("lobby");
      return true;
    },
    command: async (type: RoomCommand["type"], payload = {}) => {
      try {
        setState((s) => run(s, viewer, type, payload));
        return true;
      } catch (e) {
        setError(String(e));
        return undefined;
      }
    },
    refresh: async () => {},
    refreshTables: async () => {},
    exitTableView: () => setPage("hub"),
  } as unknown as OnlineModel;
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: phoneWidth, height: phoneHeight },
        insets: { top: insetTop, bottom: insetBottom, left: 0, right: 0 },
      }}
    >
      <GameBackground
        style={{ paddingTop: insetTop, paddingBottom: insetBottom }}
      >
        {page === "home" ? (
          <HomeScreen
            width={phoneWidth}
            height={phoneHeight - insetTop - insetBottom}
            username="Priya"
            balance={wallet.balance}
            hasGame={false}
            onStart={() => setPage("offline")}
            onOnline={() => setPage("hub")}
            onTables={() => setPage("history")}
            onSettings={() => setPrefs(true)}
            onAccount={() => setPage("profile")}
            onCoins={() => setPage("coins")}
            onShare={() => {}}
          />
        ) : page === "offline" ? (
          <CallerScreen
            width={phoneWidth}
            height={phoneHeight - insetTop - insetBottom}
            preferences={{
              auto: false,
              speed: 4,
              sound: true,
              voice: "female",
              callPause: 1,
            }}
            history={[43, 69, 23]}
            running={false}
            historyOpen={historyOpen}
            audioError=""
            onPreferences={() => {}}
            onMenu={() => setPage("home")}
            onHistory={() => setHistoryOpen(!historyOpen)}
            onPlay={() => {}}
            onNext={() => {}}
            onRepeat={() => {}}
            onReplay={() => {}}
          />
        ) : [
            "lobby",
            "scheduled",
            "live",
            "hostlive",
            "verify",
            "winner",
          ].includes(page) ? (
          <TableScreen
            model={model}
            onCall={() => {}}
            onStop={() => {}}
            onGameplay={() => {}}
          />
        ) : (
          <OnlineEntry
            key={page}
            model={model}
            invite={null}
            onInviteUsed={() => {}}
            onOffline={() => setPage("offline")}
            onHome={() => setPage("home")}
            initialMode={
              (["history", "profile", "coins"].includes(page)
                ? page
                : "home") as "home"
            }
            phoneEntryMode="manual"
          />
        )}
        {prefs && (
          <GamePreferencesSheet
            onClose={() => setPrefs(false)}
            sound
            onSound={() => {}}
            onPreview={() => {}}
          />
        )}
      </GameBackground>
    </SafeAreaProvider>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
