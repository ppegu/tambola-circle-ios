-- Existing accounts keep their previous default until they choose an avatar.
ALTER TABLE online_players ADD COLUMN avatar_id INTEGER CHECK (avatar_id IS NULL OR (avatar_id >= 0 AND avatar_id < 15));
