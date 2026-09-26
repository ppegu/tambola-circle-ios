CREATE TABLE coin_wallets (player_id TEXT PRIMARY KEY REFERENCES online_players(id), balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0));
CREATE TABLE coin_ledger (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES coin_wallets(player_id), kind TEXT NOT NULL, amount INTEGER NOT NULL, at INTEGER NOT NULL);
CREATE INDEX coin_ledger_player ON coin_ledger(player_id, at DESC);
CREATE TRIGGER coin_ledger_apply AFTER INSERT ON coin_ledger BEGIN
  UPDATE coin_wallets SET balance=balance+NEW.amount WHERE player_id=NEW.player_id;
END;
CREATE TRIGGER coin_ledger_immutable_update BEFORE UPDATE ON coin_ledger BEGIN SELECT RAISE(ABORT,'Immutable coin ledger'); END;
CREATE TRIGGER coin_ledger_immutable_delete BEFORE DELETE ON coin_ledger BEGIN SELECT RAISE(ABORT,'Immutable coin ledger'); END;
CREATE TABLE coin_holds (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES coin_wallets(player_id), table_id TEXT NOT NULL, round_id TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0), state TEXT NOT NULL CHECK(state IN ('reserved','consumed','released','refunded')), at INTEGER NOT NULL);
CREATE INDEX coin_holds_player ON coin_holds(player_id,state);
CREATE TRIGGER coin_hold_reserve AFTER INSERT ON coin_holds BEGIN
  SELECT RAISE(ABORT,'Invalid initial coin hold') WHERE NEW.state!='reserved';
  SELECT RAISE(ABORT,'Insufficient coins') WHERE (SELECT balance FROM coin_wallets WHERE player_id=NEW.player_id)<NEW.amount;
  INSERT INTO coin_ledger VALUES(NEW.id||':reserve',NEW.player_id,'reserve',-NEW.amount,NEW.at);
END;
CREATE TRIGGER coin_hold_validate BEFORE UPDATE ON coin_holds BEGIN
  SELECT RAISE(ABORT,'Immutable hold identity') WHERE NEW.id!=OLD.id OR NEW.player_id!=OLD.player_id OR NEW.table_id!=OLD.table_id OR NEW.round_id!=OLD.round_id OR NEW.amount!=OLD.amount;
  SELECT RAISE(ABORT,'Invalid coin transition') WHERE NOT ((OLD.state='reserved' AND NEW.state IN ('consumed','released')) OR (OLD.state='consumed' AND NEW.state='refunded'));
END;
CREATE TRIGGER coin_hold_transition AFTER UPDATE ON coin_holds BEGIN
  INSERT INTO coin_ledger VALUES(NEW.id||':'||NEW.state,NEW.player_id,NEW.state,NEW.amount * (NEW.state IN ('released','refunded')),NEW.at);
END;
CREATE TRIGGER coin_hold_immutable_delete BEFORE DELETE ON coin_holds BEGIN SELECT RAISE(ABORT,'Immutable coin hold'); END;
