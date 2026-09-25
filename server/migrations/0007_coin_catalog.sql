-- The catalog is data. A future admin panel can edit or disable these rows.
CREATE TABLE coin_plans (
  id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 64),
  label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 40),
  coins INTEGER NOT NULL CHECK(typeof(coins)='integer' AND coins BETWEEN 1 AND 1000000),
  artwork INTEGER NOT NULL DEFAULT 0 CHECK(artwork BETWEEN 0 AND 2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  recommended INTEGER NOT NULL DEFAULT 0 CHECK(recommended IN (0,1))
);
INSERT INTO coin_plans(id,label,coins,artwork,sort_order,recommended) VALUES
  ('pocket','Pocket of fun',100,0,10,0),
  ('party','Party pack',500,1,20,1),
  ('celebration','Celebration',1200,2,30,0);

CREATE TABLE coin_purchases (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES coin_wallets(player_id),
  plan_id TEXT NOT NULL REFERENCES coin_plans(id),
  coins INTEGER NOT NULL CHECK(typeof(coins)='integer' AND coins > 0),
  at INTEGER NOT NULL
);
-- Receipt and credit commit together, even if the network loses the response.
CREATE TRIGGER coin_purchase_credit AFTER INSERT ON coin_purchases BEGIN
  INSERT INTO coin_ledger(id,player_id,kind,amount,at)
    VALUES(NEW.id,NEW.player_id,'test_purchase',NEW.coins,NEW.at);
END;
CREATE TRIGGER coin_purchase_no_update BEFORE UPDATE ON coin_purchases BEGIN
  SELECT RAISE(ABORT,'Purchase receipts are immutable');
END;
CREATE TRIGGER coin_purchase_no_delete BEFORE DELETE ON coin_purchases BEGIN
  SELECT RAISE(ABORT,'Purchase receipts are immutable');
END;
