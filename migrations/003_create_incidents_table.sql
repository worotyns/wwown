CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id VARCHAR(32),
    user_id VARCHAR(32),
    start_time DATETIME,
    end_time DATETIME,
    duration_seconds INTEGER,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_channel_user ON incidents (channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_start_time ON incidents (start_time);
CREATE INDEX IF NOT EXISTS idx_incidents_end_time ON incidents (end_time);