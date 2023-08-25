CREATE TABLE IF NOT EXISTS time_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id VARCHAR(32),
    user_id VARCHAR(32),
    start_time DATETIME,
    end_time DATETIME,
    duration_seconds INTEGER,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_channel_user ON time_tracking (channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_start_time ON time_tracking (start_time);
CREATE INDEX IF NOT EXISTS idx_end_time ON time_tracking (end_time);