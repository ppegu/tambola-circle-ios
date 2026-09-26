import sqlite3
import unittest
from pathlib import Path

class CoinLedgerTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript("CREATE TABLE online_players(id TEXT PRIMARY KEY); INSERT INTO online_players VALUES('a'); INSERT INTO online_players VALUES('b');")
        self.db.executescript((Path(__file__).resolve().parents[2]/'server/migrations/0006_virtual_coins.sql').read_text(encoding='utf-8-sig'))
        self.db.executescript((Path(__file__).resolve().parents[2]/'server/migrations/0007_coin_catalog.sql').read_text(encoding='utf-8-sig'))
        for user in ['a','b']:
            self.db.execute('INSERT INTO coin_wallets VALUES(?,0)',(user,))
            self.db.execute("INSERT INTO coin_ledger VALUES(?,?,'welcome',1200,0)",('welcome:'+user,user))
        self.db.commit()
    def balance(self,user='a'):
        return self.db.execute('SELECT balance FROM coin_wallets WHERE player_id=?',(user,)).fetchone()[0]
    def reserve(self,ident='hold',amount=50,user='a'):
        self.db.execute("INSERT OR IGNORE INTO coin_holds VALUES(?,?, 'table','round',?,'reserved',1)",(ident,user,amount))
    def move(self,new,old,ident='hold'):
        self.db.execute('UPDATE coin_holds SET state=?,at=2 WHERE id=? AND state=?',(new,ident,old))
    def test_retries_never_double_charge_or_refund(self):
        self.reserve();self.reserve();self.assertEqual(self.balance(),1150)
        self.move('consumed','reserved');self.move('consumed','reserved');self.assertEqual(self.balance(),1150)
        self.move('refunded','consumed');self.move('refunded','consumed');self.assertEqual(self.balance(),1200)
    def test_insufficient_funds_roll_back_entire_transaction(self):
        with self.assertRaisesRegex(sqlite3.IntegrityError,'Insufficient coins'):
            with self.db:
                self.reserve('a',1100,'a');self.reserve('b',1300,'b')
        self.assertEqual(self.balance(),1200);self.assertEqual(self.balance('b'),1200)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM coin_holds').fetchone()[0],0)
    def test_different_tables_share_one_available_balance(self):
        self.reserve('first',1000);self.db.commit()
        with self.assertRaises(sqlite3.IntegrityError):self.reserve('second',500)
        self.assertEqual(self.balance(),200)
    def test_release_and_re_ready_use_new_holds(self):
        self.reserve();self.move('released','reserved');self.reserve('new',100);self.assertEqual(self.balance(),1100)
        self.move('released','reserved');self.assertEqual(self.balance(),1100)
    def test_invalid_transitions_and_ledger_edits_are_blocked(self):
        self.reserve();self.move('released','reserved')
        with self.assertRaisesRegex(sqlite3.IntegrityError,'Invalid coin transition'):self.move('consumed','released')
        with self.assertRaisesRegex(sqlite3.IntegrityError,'Immutable coin ledger'):self.db.execute('UPDATE coin_ledger SET amount=99999')
        with self.assertRaisesRegex(sqlite3.IntegrityError,'Immutable hold identity'):self.db.execute('UPDATE coin_holds SET amount=1')
    def test_test_purchase_replay_and_balance_reconciliation(self):
        for _ in range(2):self.db.execute("INSERT OR IGNORE INTO coin_ledger VALUES('test:a:uuid','a','test_purchase',500,2)")
        self.reserve();self.move('consumed','reserved');self.assertEqual(self.balance(),1650)
        total=self.db.execute("SELECT SUM(amount) FROM coin_ledger WHERE player_id='a'").fetchone()[0]
        self.assertEqual(total,self.balance())
    def buy(self,ident='test:a:catalog',plan='party'):
        self.db.execute("INSERT OR IGNORE INTO coin_purchases(id,player_id,plan_id,coins,at) SELECT ?,'a',id,coins,1 FROM coin_plans WHERE id=? AND active=1",(ident,plan))
    def test_catalog_change_uses_current_server_amount_and_retry_preserves_receipt(self):
        self.db.execute("UPDATE coin_plans SET coins=750 WHERE id='party'")
        self.buy();self.assertEqual(self.balance(),1950)
        self.db.execute("UPDATE coin_plans SET coins=900,active=0 WHERE id='party'")
        self.buy();self.assertEqual(self.balance(),1950)
        self.assertEqual(self.db.execute('SELECT coins FROM coin_purchases').fetchone()[0],750)
    def test_disabled_unknown_plans_and_duplicate_id_cannot_credit(self):
        self.db.execute("UPDATE coin_plans SET active=0 WHERE id='party'")
        self.buy();self.buy(plan='unknown');self.assertEqual(self.balance(),1200)
        self.buy(plan='pocket');self.buy(plan='celebration');self.assertEqual(self.balance(),1300)
    def test_receipt_and_ledger_are_atomic_immutable_and_reconcile(self):
        self.buy();self.buy();self.assertEqual(self.balance(),1700)
        with self.assertRaisesRegex(sqlite3.IntegrityError,'immutable'):
            self.db.execute('UPDATE coin_purchases SET coins=999')
        total=self.db.execute("SELECT SUM(amount) FROM coin_ledger WHERE player_id='a'").fetchone()[0]
        self.assertEqual(total,self.balance())
        self.db.rollback()
        self.assertEqual(self.balance(),1200)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM coin_purchases').fetchone()[0],0)
if __name__=='__main__':unittest.main()
