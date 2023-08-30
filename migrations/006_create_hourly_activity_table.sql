CREATE TABLE IF NOT EXISTS hourly_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day DATETIME,
    channel_id VARCHAR(32),
    user_id VARCHAR(32),
    count INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_fields
ON stats (day, user_id, channel_id);