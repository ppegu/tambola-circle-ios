// Local peers for physical-phone QA. Never points to the production backend.
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const stateFile = new URL("../.tools/android-qa-peers.json", import.meta.url);
const state = existsSync(stateFile)
  ? JSON.parse(readFileSync(stateFile, "utf8"))
  : { peers: [] };
async function api(path, peer, body) {
  const response = await fetch("http://127.0.0.1:8791" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(peer ? { Authorization: "Bearer " + peer.key } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.error}`);
  return data;
}
const save = () => writeFileSync(stateFile, JSON.stringify(state, null, 2));
async function snapshot(peer = state.peers[0]) {
  return (await api("/v2/tables/" + state.tableId, peer)).snapshot;
}
async function command(peer, type, payload = {}) {
  const s = await snapshot(peer);
  return api(`/v2/tables/${s.id}/commands`, peer, {
    id: randomUUID(),
    type,
    payload,
    roundId: s.roundId,
    authorityEpoch: s.authorityEpoch,
  });
}
const action = process.argv[2];
if (action === "init") {
  if (!state.peers.length)
    for (const [index, name] of ["QA Arjun", "QA Meera"].entries()) {
      const key = "d_" + randomBytes(32).toString("hex");
      const { profile } = await api("/v2/device", null, {
        deviceKey: key,
        name,
        mobile: "+1555000110" + index,
        source: "device_selected",
        consent: true,
      });
      state.peers.push({ ...profile, key });
    }
  save();
  console.log("Local peers ready:", state.peers.map((p) => p.name).join(", "));
} else if (action === "join") {
  for (const peer of state.peers) {
    const { snapshot: s } = await api("/v2/join", peer, {
      code: process.argv[3],
    });
    state.tableId = s.id;
    save();
  }
  console.log("Both local peers joined.");
} else if (action === "ready") {
  for (const peer of state.peers) {
    let s = await snapshot(peer);
    if (s.members[peer.id].ready) continue;
    await command(peer, "SELECT", { kind: "half" });
    s = await snapshot(peer);
    await command(peer, "CONFIRM_STRIP", {
      stripVersion: s.members[peer.id].stripVersion,
    });
    await command(peer, "READY", { ready: true });
  }
  console.log("Both local peers chose Half tickets and reserved coins.");
} else if (action === "snapshot") {
  const s = await snapshot();
  console.log(
    JSON.stringify(
      {
        id: s.id,
        phase: s.phase,
        calls: s.calls,
        host: s.members[s.hostId]?.name,
        members: Object.values(s.members).map((m) => ({
          id: m.id,
          name: m.name,
          ready: m.ready,
          spectator: m.spectator,
          tickets: m.panels,
          marks: m.marks,
        })),
        result: s.result,
        verification: s.claim && {
          checked: s.claim.checked,
          missing: s.claim.missing,
        },
      },
      null,
      2,
    ),
  );
} else if (action === "claim") {
  const peer = state.peers[Number(process.argv[3] ?? 0)];
  console.log(
    await command(peer, "CLAIM", { panel: Number(process.argv[4] ?? 0) }).then(
      () => "Claim sent.",
    ),
  );
} else if (action === "command") {
  const peer = state.peers[Number(process.argv[3])];
  await command(peer, process.argv[4], JSON.parse(process.argv[5] ?? "{}"));
  console.log("Local peer command completed: " + process.argv[4]);
} else if (action === "mark-called") {
  const peer = state.peers[Number(process.argv[3] ?? 0)];
  const s = await snapshot(peer),
    member = s.members[peer.id];
  let marked = 0;
  for (const [panel, ticket] of member.panels.entries())
    for (const [cell, number] of ticket.flat().entries()) {
      if (!s.calls.includes(number) || member.marks[`${panel}:${cell}`])
        continue;
      await command(peer, "MARK", {
        panel,
        cell,
        marked: true,
        version: member.markVersions[`${panel}:${cell}`] ?? 0,
      });
      marked++;
    }
  console.log(`Test peer marked ${marked} called numbers.`);
} else if (action === "monitor-round") {
  const sockets = [],
    timers = [],
    started = Date.now();
  let claimed = false,
    verified = false,
    last = "",
    expectedWinner;
  for (const peer of state.peers) {
    const { ticket } = await api(
      `/v2/tables/${state.tableId}/socket`,
      peer,
      {},
    );
    const socket = new WebSocket(
      `ws://127.0.0.1:8791/v2/tables/${state.tableId}/ws?ticket=${ticket}`,
    );
    sockets.push(socket);
    timers.push(
      setInterval(() => {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify({ type: "ping" }));
      }, 5000),
    );
  }
  try {
    while (Date.now() - started < 420000) {
      const s = await snapshot(),
        peer = state.peers[0],
        member = s.members[peer.id];
      const key = `${s.roundId}:${s.phase}:${s.calls.length}:${s.hostId}`;
      if (last !== key) {
        console.log(
          JSON.stringify({
            phase: s.phase,
            calls: s.calls.length,
            host: s.members[s.hostId]?.name,
            checked: s.claim?.checked,
          }),
        );
        last = key;
      }
      if (s.phase === "live") {
        for (const [panel, ticket] of member.panels.entries())
          for (const [cell, n] of ticket.flat().entries()) {
            if (n && s.calls.includes(n) && !member.marks[`${panel}:${cell}`])
              await command(peer, "MARK", {
                panel,
                cell,
                marked: true,
                version: member.markVersions[`${panel}:${cell}`] ?? 0,
              });
          }
        const full = member.panels.findIndex((p) =>
          p.flat().every((n) => n === null || s.calls.includes(n)),
        );
        if (!claimed && full >= 0) {
          await command(peer, "CLAIM", { panel: full });
          claimed = true;
          expectedWinner = peer.id;
          console.log("Submitted a complete QA peer ticket.");
        }
      }
      if (s.phase === "finished" && claimed) {
        if (
          s.result?.winner !== expectedWinner ||
          s.result?.reason !== "full_house_verified"
        )
          throw new Error("Expected a verified QA winner.");
        writeFileSync(
          new URL(
            "../artifacts/android-qa/verified-round.json",
            import.meta.url,
          ),
          JSON.stringify(
            {
              round: s.round,
              calls: s.calls.length,
              result: s.result,
              marksSynced: Object.values(s.members).map((m) => ({
                name: m.name,
                marked: Object.values(m.marks).filter(Boolean).length,
              })),
            },
            null,
            2,
          ),
        );
        verified = true;
        console.log(
          "PASS: peer marks synced and full house verified for every client.",
        );
        break;
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    if (!verified)
      throw new Error("QA round did not produce a verified winner in time.");
  } finally {
    timers.forEach(clearInterval);
    sockets.forEach((s) => s.close());
  }
} else if (action === "listen") {
  for (const peer of state.peers) {
    const { ticket } = await api(
      `/v2/tables/${state.tableId}/socket`,
      peer,
      {},
    );
    const socket = new WebSocket(
      `ws://127.0.0.1:8791/v2/tables/${state.tableId}/ws?ticket=${ticket}`,
    );
    socket.addEventListener("open", () =>
      console.log(peer.name + " connected"),
    );
    socket.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);
      if (data.type !== "snapshot") return;
      const s = data.snapshot,
        key = `${s.roundId}:${s.phase}:${s.calls.length}:${s.hostId}`;
      if (peer.last !== key) {
        peer.last = key;
        console.log(
          `${peer.name}: ${s.phase}, ${s.calls.length} calls, host ${s.members[s.hostId]?.name}`,
        );
      }
    });
    setInterval(() => {
      if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: "ping" }));
    }, 5000);
  }
} else
  throw new Error(
    "Use init, join CODE, ready, snapshot, claim, command, mark-called or listen.",
  );
