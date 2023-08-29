CREATE TABLE IF NOT EXISTS karma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id VARCHAR(32),
    reacting_user_id VARCHAR(32),
    user_id VARCHAR(32),
    timestamp TIMESTAMP,
    reaction TEXT
);