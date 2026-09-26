ALTER TABLE online_players ADD COLUMN avatar_photo TEXT;
CREATE INDEX online_players_mobile_match ON online_players(substr(mobile,-10));
CREATE TABLE online_avatars (
  id TEXT PRIMARY KEY,
  device_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX online_avatars_owner ON online_avatars(device_hash);
CREATE TABLE online_invitations (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES online_tables(id),
  sender_id TEXT NOT NULL REFERENCES online_players(id),
  recipient_id TEXT NOT NULL REFERENCES online_players(id),
  invite_token TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','accepting','accepted','declined','expired')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(table_id,recipient_id)
);
CREATE INDEX online_invitations_inbox ON online_invitations(recipient_id,updated_at DESC);
