-- Preserve existing guest/account settings when adding the offline voice selector.
UPDATE profiles
SET preferences = json_set(preferences, '$.voice', 'classic'), version = version + 1
WHERE json_extract(preferences, '$.voice') IS NULL;
