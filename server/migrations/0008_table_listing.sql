-- A small read model; no tickets, phone numbers or invite credentials.
ALTER TABLE online_tables ADD COLUMN listing TEXT NOT NULL DEFAULT '{}';
