-- Banner dismissal, resumed transfers and shareable version links must identify
-- one immutable release, including when two operators register concurrently.
CREATE UNIQUE INDEX app_releases_id ON app_releases(json_extract(descriptor,'$.id'));
CREATE UNIQUE INDEX app_releases_version_name ON app_releases(package_id,json_extract(descriptor,'$.versionName'));
