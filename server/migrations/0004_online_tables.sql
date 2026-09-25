CREATE TABLE online_players (
  id TEXT PRIMARY KEY,
  device_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  mobile_source TEXT NOT NULL DEFAULT 'device_selected',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  consent_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE online_tables (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  phase TEXT NOT NULL DEFAULT 'lobby',
  seq INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE online_memberships (
  table_id TEXT NOT NULL REFERENCES online_tables(id),
  player_id TEXT NOT NULL REFERENCES online_players(id),
  removed INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (table_id, player_id)
);
CREATE INDEX online_members_player ON online_memberships(player_id, removed);
CREATE TABLE online_socket_tickets (
  token_hash TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX online_socket_expiry ON online_socket_tickets(expires_at);
CREATE TABLE online_events (
  table_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  round INTEGER NOT NULL,
  at INTEGER NOT NULL,
  actor TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY(table_id, seq)
);
CREATE INDEX online_events_round ON online_events(table_id, round, seq);
CREATE TABLE online_rounds (
  table_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  state TEXT NOT NULL,
  PRIMARY KEY(table_id, round)
);
