CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id VARCHAR(32),
    thread_id VARCHAR(32),
    user_id VARCHAR(32),
    day DATE,
    value INT,
    first_activity_ts TIMESTAMP,
    last_activity_ts TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_fields
ON threads (day, thread_id, user_id, channel_id);