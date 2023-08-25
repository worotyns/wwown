CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT,
    applied_at DATETIME
);

CREATE UNIQUE INDEX IF NOT EXISTS migration_idx ON migrations(migration_name);
