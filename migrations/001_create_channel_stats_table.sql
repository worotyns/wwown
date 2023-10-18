CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id VARCHAR(32),
    user_id VARCHAR(32),
    type VARCHAR(32),
    day DATE,
    value INT,
    first_activity_ts TIMESTAMP,
    last_activity_ts TIMESTAMP
);

CREATE UNIQUE INDEX  IF NOT EXISTS idx_stats_unique_fields
ON stats (day, user_id, channel_id, type);

CREATE TABLE IF NOT EXISTS mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id VARCHAR(32),
    label VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mapping_unique
ON mapping (resource_id);
