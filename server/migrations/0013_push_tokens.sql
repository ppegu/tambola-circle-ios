CREATE TABLE online_push_tokens (
  token TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES online_players(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  updated_at INTEGER NOT NULL
);
CREATE INDEX online_push_tokens_player ON online_push_tokens(player_id);