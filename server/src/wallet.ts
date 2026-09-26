import type {
  CoinCatalog,
  CoinPlan,
  CoinWallet,
  CoinTransaction,
  CoinTransactionPage,
  WalletEffect,
} from "../../shared/online";
import { RoomError } from "./room-engine";

export const testCoinsEnabled = (env: Env) =>
  (env as Env & { TEST_COIN_PURCHASES?: string }).TEST_COIN_PURCHASES ===
  "true";
export async function coinCatalog(env: Env): Promise<CoinCatalog> {
  const rows = await env.DB.prepare(
    "SELECT id,label,coins,artwork,recommended FROM coin_plans WHERE active=1 ORDER BY sort_order,id",
  ).all<Omit<CoinPlan, "recommended"> & { recommended: number }>();
  return {
    plans: rows.results.map((p) => ({ ...p, recommended: !!p.recommended })),
    testMode: testCoinsEnabled(env),
  };
}
export async function ensureWallet(db: D1Database, playerId: string) {
  await db.batch([
    db
      .prepare("INSERT OR IGNORE INTO coin_wallets(player_id) VALUES(?)")
      .bind(playerId),
    db
      .prepare(
        "INSERT OR IGNORE INTO coin_ledger(id,player_id,kind,amount,at) VALUES(?,?,'welcome',1200,?)",
      )
      .bind("welcome:" + playerId, playerId, Date.now()),
  ]);
}
export async function wallet(env: Env, playerId: string): Promise<CoinWallet> {
  await ensureWallet(env.DB, playerId);
  const data = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare("SELECT balance FROM coin_wallets WHERE player_id=?").bind(
      playerId,
    ),
    env.DB.prepare(
      "SELECT COALESCE(SUM(amount),0) AS held FROM coin_holds WHERE player_id=? AND state='reserved'",
    ).bind(playerId),
    env.DB.prepare(
      "SELECT id,kind,amount,at FROM coin_ledger WHERE player_id=? ORDER BY at DESC,id DESC LIMIT 50",
    ).bind(playerId),
  ]);
  return {
    balance: Number(data[0]!.results[0]!.balance),
    held: Number(data[1]!.results[0]!.held),
    testMode: testCoinsEnabled(env),
    transactions: data[2]!.results as CoinWallet["transactions"],
  };
}
/** Personal balance movements. Consuming a reservation changes status, not balance. */
export async function walletTransactions(
  env: Env,
  playerId: string,
  params: URLSearchParams,
): Promise<CoinTransactionPage> {
  const filter = params.get("kind") ?? "all",
    cursor = params.get("cursor");
  const groups: Record<string, string> = {
    all: "l.kind!='consumed'",
    topups: "l.kind IN ('welcome','test_purchase')",
    entries: "l.kind='reserve'",
    refunds: "l.kind IN ('released','refunded')",
  };
  if (!Object.hasOwn(groups, filter))
    throw new RoomError(400, "Choose a valid transaction filter.");
  let after: [number, string] | null = null;
  if (cursor) {
    try {
      const value: unknown = JSON.parse(cursor);
      if (
        !Array.isArray(value) ||
        value.length !== 2 ||
        !Number.isSafeInteger(value[0]) ||
        value[0] < 0 ||
        typeof value[1] !== "string" ||
        value[1].length > 256 ||
        !value[1].length
      )
        throw new Error();
      after = value as [number, string];
    } catch {
      throw new RoomError(400, "Invalid transaction cursor.");
    }
  }
  // The only interpolated SQL comes from the allowlisted filters above.
  const sql = `SELECT l.id,l.kind,l.amount,l.at,h.state AS status,t.name AS tableName,h.round_id AS roundId
    FROM coin_ledger l
    LEFT JOIN coin_holds h ON h.player_id=l.player_id AND h.id=substr(l.id,1,length(l.id)-length(l.kind)-1)
    LEFT JOIN online_tables t ON t.id=h.table_id
    WHERE l.player_id=? AND ${groups[filter]} ${after ? "AND (l.at<? OR (l.at=? AND l.id<?))" : ""}
    ORDER BY l.at DESC,l.id DESC LIMIT 31`;
  const statement = env.DB.prepare(sql);
  const rows = await (
    after
      ? statement.bind(playerId, after[0], after[0], after[1])
      : statement.bind(playerId)
  ).all<
    Omit<CoinTransaction, "round" | "status"> & {
      status: CoinTransaction["status"] | null;
      roundId: string | null;
    }
  >();
  const visible = rows.results.slice(0, 30),
    last = visible.at(-1);
  return {
    transactions: visible.map(({ roundId, ...row }) => ({
      ...row,
      status: row.status ?? "added",
      round:
        roundId && /:[1-9]\d*$/.test(roundId)
          ? Number(roundId.split(":").at(-1))
          : null,
    })),
    nextCursor:
      rows.results.length > 30 && last
        ? JSON.stringify([last.at, last.id])
        : null,
  };
}
export async function testPurchase(
  env: Env,
  playerId: string,
  id: unknown,
  planId: unknown,
  legacyAmount?: unknown,
) {
  if (!testCoinsEnabled(env))
    throw new RoomError(403, "Test coin purchases are disabled.");
  if (
    typeof id !== "string" ||
    !/^[a-f0-9-]{36}$/.test(id) ||
    (planId !== undefined &&
      (typeof planId !== "string" || !/^[a-z0-9_-]{1,64}$/.test(planId)))
  )
    throw new RoomError(400, "Choose an available test coin pack.");
  const key = "test:" + playerId + ":" + id;
  type Receipt = { plan_id: string; coins: number };
  const existing = await env.DB.prepare(
    "SELECT plan_id,coins FROM coin_purchases WHERE id=? AND player_id=?",
  )
    .bind(key, playerId)
    .first<Receipt>();
  if (existing) {
    if (
      planId !== undefined
        ? existing.plan_id !== planId
        : existing.coins !== legacyAmount
    )
      throw new RoomError(
        409,
        "This purchase already belongs to another pack.",
      );
    return {
      wallet: await wallet(env, playerId),
      creditedCoins: existing.coins,
    };
  }
  // v1.2.0 sent an amount. Keep it working only when it identifies one active
  // catalog entry; the server still supplies the credited amount.
  if (planId === undefined) {
    if (!Number.isSafeInteger(legacyAmount) || Number(legacyAmount) <= 0)
      throw new RoomError(400, "Choose an available test coin pack.");
    const old = await env.DB.prepare(
      "SELECT amount FROM coin_ledger WHERE id=? AND player_id=? AND kind='test_purchase'",
    )
      .bind(key, playerId)
      .first<{ amount: number }>();
    if (old) {
      if (old.amount !== legacyAmount)
        throw new RoomError(
          409,
          "This purchase already belongs to another pack.",
        );
      return { wallet: await wallet(env, playerId), creditedCoins: old.amount };
    }
    const matches = await env.DB.prepare(
      "SELECT id FROM coin_plans WHERE active=1 AND coins=? LIMIT 2",
    )
      .bind(legacyAmount)
      .all<{ id: string }>();
    if (matches.results.length !== 1)
      throw new RoomError(
        400,
        "Refresh the coin shop to choose an available pack.",
      );
    planId = matches.results[0]!.id;
  }
  await ensureWallet(env.DB, playerId);
  // Resolve current availability and amount in the same atomic insert as the
  // ledger trigger. A stale client cannot choose or inject a coin amount.
  await env.DB.prepare(
    "INSERT OR IGNORE INTO coin_purchases(id,player_id,plan_id,coins,at) SELECT ?,?,id,coins,? FROM coin_plans WHERE id=? AND active=1",
  )
    .bind(key, playerId, Date.now(), planId)
    .run();
  const receipt = await env.DB.prepare(
    "SELECT plan_id,coins FROM coin_purchases WHERE id=? AND player_id=?",
  )
    .bind(key, playerId)
    .first<Receipt>();
  if (!receipt)
    throw new RoomError(
      400,
      "This pack is no longer available. Refresh the coin shop.",
    );
  if (receipt.plan_id !== planId)
    throw new RoomError(409, "This purchase already belongs to another pack.");
  return { wallet: await wallet(env, playerId), creditedCoins: receipt.coins };
}
/** D1 batch is transactional; every hold transition and ledger entry is idempotent. */
export async function applyWalletEffects(
  db: D1Database,
  effects: WalletEffect[],
  now: number,
) {
  if (!effects.length) return;
  const statements: D1PreparedStatement[] = [];
  for (const e of effects) {
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO coin_wallets(player_id) VALUES(?)")
        .bind(e.playerId),
    );
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO coin_ledger(id,player_id,kind,amount,at) VALUES(?,?,'welcome',1200,?)",
        )
        .bind("welcome:" + e.playerId, e.playerId, now),
    );
    if (e.type === "reserve")
      statements.push(
        db
          .prepare(
            "INSERT OR IGNORE INTO coin_holds(id,player_id,table_id,round_id,amount,state,at) VALUES(?,?,?,?,?,'reserved',?)",
          )
          .bind(e.id, e.playerId, e.tableId, e.roundId, e.amount, now),
      );
    else {
      const next = {
        consume: "consumed",
        release: "released",
        refund: "refunded",
      }[e.type];
      statements.push(
        db
          .prepare(
            "UPDATE coin_holds SET state=?,at=? WHERE id=? AND player_id=? AND state=?",
          )
          .bind(
            next,
            now,
            e.id,
            e.playerId,
            e.type === "refund" ? "consumed" : "reserved",
          ),
      );
    }
  }
  await db.batch(statements);
}
