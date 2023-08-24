-- DROP TABLE IF EXISTS stats;

CREATE TABLE stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id VARCHAR(32),
    user_id VARCHAR(32),
    type VARCHAR(32),
    day DATE,
    value INT,
    last_activity_ts TIMESTAMP
);

CREATE UNIQUE INDEX idx_unique_fields
ON stats (day, user_id, channel_id, type);

-- DROP TABLE IF EXISTS mapping;

CREATE TABLE mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id VARCHAR(32),
    label VARCHAR(255)
);

CREATE UNIQUE INDEX idx_unique
ON mapping (resource_id);
