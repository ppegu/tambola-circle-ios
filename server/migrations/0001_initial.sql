CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('guest', 'user')),
  username TEXT UNIQUE COLLATE NOCASE,
  guest_hash TEXT UNIQUE,
  password_salt TEXT,
  password_hash TEXT,
  recovery_hash TEXT,
  preferences TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK ((kind = 'guest' AND guest_hash IS NOT NULL AND username IS NULL) OR
    (kind = 'user' AND username IS NOT NULL AND guest_hash IS NULL AND password_hash IS NOT NULL))
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_profile ON sessions(profile_id);
CREATE INDEX sessions_expiration ON sessions(expires_at);
