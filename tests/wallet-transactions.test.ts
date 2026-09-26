import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { walletTransactions } from "../server/src/wallet";

describe("personal wallet history against SQLite ledger", () => {
  let db: DatabaseSync, env: Parameters<typeof walletTransactions>[0];
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(
      "CREATE TABLE online_players(id TEXT PRIMARY KEY); CREATE TABLE online_tables(id TEXT PRIMARY KEY,name TEXT); INSERT INTO online_players VALUES('a'),('b'); INSERT INTO online_tables VALUES('table','Friday circle');",
    );
    db.exec(readFileSync("server/migrations/0006_virtual_coins.sql", "utf8"));
    for (const id of ["a", "b"]) {
      db.prepare("INSERT INTO coin_wallets VALUES(?,0)").run(id);
      db.prepare("INSERT INTO coin_ledger VALUES(?,?,'welcome',1200,1)").run(
        "welcome:" + id,
        id,
      );
    }
    // Exercise the production SQL and parameters with SQLite, the D1 dialect.
    env = {
      DB: {
        prepare(sql: string) {
          return {
            bind(...params: (string | number)[]) {
              return {
                async all() {
                  return { results: db.prepare(sql).all(...params) };
                },
              };
            },
          };
        },
      },
    } as unknown as typeof env;
  });
  afterEach(() => db.close());
  const params = (kind = "all", cursor?: string) =>
    new URLSearchParams({ kind, ...(cursor ? { cursor } : {}) });
  it("has no duplicate debit when reserved coins become played, and records refunds", async () => {
    db.exec(
      "INSERT INTO coin_holds VALUES('hold','a','table','table:4',60,'reserved',2)",
    );
    expect(
      (await walletTransactions(env, "a", params("entries"))).transactions[0],
    ).toMatchObject({
      amount: -60,
      status: "reserved",
      tableName: "Friday circle",
      round: 4,
    });
    db.exec("UPDATE coin_holds SET state='consumed',at=3 WHERE id='hold'");
    let rows = (await walletTransactions(env, "a", params())).transactions;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ amount: -60, status: "consumed" });
    expect(rows.reduce((sum, t) => sum + t.amount, 0)).toBe(1140);
    db.exec("UPDATE coin_holds SET state='refunded',at=4 WHERE id='hold'");
    rows = (await walletTransactions(env, "a", params())).transactions;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      amount: 60,
      kind: "refunded",
      tableName: "Friday circle",
    });
    expect(rows.reduce((sum, t) => sum + t.amount, 0)).toBe(1200);
  });
  it("paginates equal timestamps without losing or repeating movements and isolates players", async () => {
    for (let i = 0; i < 65; i++)
      db.prepare(
        "INSERT INTO coin_ledger VALUES(?,'a','test_purchase',1,10)",
      ).run(`purchase:${i.toString().padStart(3, "0")}`);
    const first = await walletTransactions(env, "a", params());
    expect(first.transactions).toHaveLength(30);
    const second = await walletTransactions(
      env,
      "a",
      params("all", first.nextCursor!),
    );
    const last = await walletTransactions(
      env,
      "a",
      params("all", second.nextCursor!),
    );
    expect(last.nextCursor).toBeNull();
    const rows = [
      ...first.transactions,
      ...second.transactions,
      ...last.transactions,
    ];
    expect(rows).toHaveLength(66);
    expect(new Set(rows.map((t) => t.id)).size).toBe(66);
    expect(
      (await walletTransactions(env, "b", params())).transactions.map(
        (t) => t.id,
      ),
    ).toEqual(["welcome:b"]);
  });
  it("filters refunds and entries, and rejects untrusted filters/cursors", async () => {
    db.exec(
      "INSERT INTO coin_holds VALUES('hold','a','table','table:2',50,'reserved',2); UPDATE coin_holds SET state='released',at=3 WHERE id='hold';",
    );
    expect(
      (await walletTransactions(env, "a", params("refunds"))).transactions.map(
        (t) => t.kind,
      ),
    ).toEqual(["released"]);
    expect(
      (await walletTransactions(env, "a", params("topups"))).transactions.map(
        (t) => t.kind,
      ),
    ).toEqual(["welcome"]);
    for (const p of [
      params("bad"),
      params("__proto__"),
      params("all", "null"),
      params("all", "[1]"),
      params("all", '[-1,"x"]'),
    ])
      await expect(walletTransactions(env, "a", p)).rejects.toThrow();
  });
});
