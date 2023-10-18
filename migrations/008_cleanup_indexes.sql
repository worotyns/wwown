DROP INDEX IF EXISTS idx_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mapping_unique ON mapping (resource_id);

DROP INDEX IF EXISTS idx_unique_fields;
CREATE UNIQUE INDEX  IF NOT EXISTS idx_stats_unique_fields ON stats (day, user_id, channel_id, type);

DROP INDEX IF EXISTS idx_channel_user;
CREATE INDEX IF NOT EXISTS idx_tt_channel_user ON time_tracking (channel_id, user_id);
DROP INDEX IF EXISTS idx_start_time;
CREATE INDEX IF NOT EXISTS idx_tt_start_time ON time_tracking (start_time);
DROP INDEX IF EXISTS idx_end_time;
CREATE INDEX IF NOT EXISTS idx_tt_end_time ON time_tracking (end_time);

CREATE INDEX IF NOT EXISTS idx_incidents_channel_user ON incidents (channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_start_time ON incidents (start_time);
CREATE INDEX IF NOT EXISTS idx_incidents_end_time ON incidents (end_time);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_fields_threads
ON threads (day, thread_id, user_id, channel_id);

-- Step 1: Drop table temporary if exists
DROP TABLE IF EXISTS temp_hourly_activity;
-- Step 2: Create a temporary table without duplicates
CREATE TABLE temp_hourly_activity AS
    SELECT day, channel_id, user_id, SUM(count) as count
    FROM hourly_activity
    GROUP BY day, channel_id, user_id;

-- Step 3: Drop actual table
ALTER TABLE hourly_activity RENAME TO hourly_activity_old;

-- Step 4: Rename the temporary table to the original table name
ALTER TABLE temp_hourly_activity RENAME TO hourly_activity;

-- Step 5: Create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_fields_activity
ON hourly_activity (day, user_id, channel_id);

-- Step 6: Cleanup
DROP TABLE hourly_activity_old;