-- Device identity exists before registration. A UUID is an identifier, not a login credential.
CREATE TABLE online_devices (
  device_uuid TEXT PRIMARY KEY,
  device_hash TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  info_json TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  player_id TEXT REFERENCES online_players(id)
);
CREATE INDEX online_devices_player ON online_devices(player_id);
