CREATE TABLE app_releases (
  package_id TEXT NOT NULL, version_code INTEGER NOT NULL, descriptor TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK(status IN ('draft','active','deprecated','archived','revoked')),
  effective_at INTEGER NOT NULL DEFAULT 0, verified_at INTEGER, created_at INTEGER NOT NULL,
  PRIMARY KEY(package_id, version_code)
);
CREATE TABLE app_policy (
  package_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 1, latest_build INTEGER,
  minimum_build INTEGER NOT NULL DEFAULT 1, locked INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '', offline_hours INTEGER NOT NULL DEFAULT 24,
  require_metadata INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
);
INSERT INTO app_policy(package_id, updated_at) VALUES('com.ppegu.tambola', 0);
CREATE TABLE device_restrictions (
  id TEXT PRIMARY KEY, target_kind TEXT NOT NULL CHECK(target_kind IN ('device','player','scoped_id')),
  target TEXT NOT NULL, reason TEXT NOT NULL, support_reference TEXT NOT NULL,
  created_at INTEGER NOT NULL, expires_at INTEGER, revoked_at INTEGER,
  actor TEXT NOT NULL
);
CREATE INDEX device_restrictions_target ON device_restrictions(target_kind,target,revoked_at,expires_at);
CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL,
  before_json TEXT, after_json TEXT, created_at INTEGER NOT NULL
);
ALTER TABLE online_devices ADD COLUMN scoped_id_hash TEXT;
ALTER TABLE online_devices ADD COLUMN access_capability INTEGER NOT NULL DEFAULT 0;
CREATE INDEX online_devices_scoped ON online_devices(scoped_id_hash);
ALTER TABLE online_socket_tickets ADD COLUMN device_uuid TEXT;
ALTER TABLE online_socket_tickets ADD COLUMN installed_build INTEGER;
