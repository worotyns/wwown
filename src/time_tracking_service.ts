import { Repository } from "./repository";

export class TimeTrackingService {
    constructor(
        private readonly repository: Repository
    ) {

    }
   
    async registerTimeTrackingItem(
        channelId: string,
        userId: string,
        startTime: Date,
        endTime: Date,
        duration: number,
        description: string,
    ) {
        await this.repository.run(`
            INSERT INTO time_tracking (channel_id, user_id, start_time, end_time, duration_seconds, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [channelId, userId, startTime, endTime, duration, description]);
    }

    /**
     * Aggregate duration per channel, user in time range ordered by channel, user, duration,
     */
    async durationPerChannelAndUserInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                mt.channel_label AS channel,
                mu.user_label AS user,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            JOIN mapping mu ON tt.user_id = mu.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY channel, user
            ORDER BY channel, user, total_duration;
        `, [start, end])
    }

    /**
     * Aggregate duration per channel, description in time range, ordered by channel, description,
     */
    async durationPerChannelAndDescriptionInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                mt.channel_label AS channel,
                tt.description,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY channel, description
            ORDER BY channel, description, total_duration;
        `, [start, end])
    }
    /**
     * Aggregate duration per channel in time range,
     */
    async durationPerChannelInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                mt.channel_label AS channel,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY channel
            ORDER BY channel;
        `, [start, end])
    }
    /**
     * Aggregate duration per user in time range,
     */
    async durationPerUserInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                mu.user_label AS user,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mu ON tt.user_id = mu.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY user
            ORDER BY user;
        `, [start, end])
    }
    /**
     * Show last N channel, description of user, ordered by end_time
     */
    async getLastNChannelAndDescriptionOfUserInTimeRange(userId: string, limit: number) {
        return this.repository.all(`
            SELECT
                tt.end_time,
                tt.description,
                mt.channel_label AS channel
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            JOIN mapping mu ON tt.user_id = mu.resource_id
            WHERE tt.user_id = ?
            ORDER BY tt.end_time DESC
            LIMIT ?;
        `, [userId, limit])
    }
    /**
     * Aggregated TOP N channels of given user in given time, ordered by channel, user,
     */
    async topNChannelOfUserInTimeRange(start: Date, end: Date, limit: number) {
        return this.repository.all(`
            WITH ChannelUserDurations AS (
                SELECT
                    mu.user_label AS user,
                    mt.channel_label AS channel,
                    SUM(tt.duration_seconds) AS total_duration,
                    RANK() OVER(PARTITION BY mt.channel_label ORDER BY SUM(tt.duration_seconds) DESC) AS user_rank
                FROM time_tracking tt
                JOIN mapping mt ON tt.channel_id = mt.resource_id
                JOIN mapping mu ON tt.user_id = mu.resource_id
                WHERE tt.start_time BETWEEN ? AND ?
                GROUP BY channel, user
            )
            SELECT
                channel,
                user || ', ' || CAST(total_duration AS TEXT) AS user_top_value
            FROM ChannelUserDurations
            WHERE user_rank <= ?
            ORDER BY channel, user_rank;        
        `, [start, end, limit])
    }
}