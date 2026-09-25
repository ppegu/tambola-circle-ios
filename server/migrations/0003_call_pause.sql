UPDATE profiles
SET preferences = json_set(preferences, '$.callPause', 1), version = version + 1
WHERE json_extract(preferences, '$.callPause') IS NULL;
