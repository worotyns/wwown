import { Repository } from "./repository";

interface TimeTrackItem {
    startTime: Date, endTime: Date, durationInSeconds: number, description: string
}

export class TimeTrackingService {

    static startOfDay(date: Date) {
        const startOfDay = new Date(date);

        startOfDay.setHours(0);
        startOfDay.setMinutes(0);
        startOfDay.setSeconds(0);
        startOfDay.setMilliseconds(0);

        return startOfDay;
    }

    static extractTimeAndDescription(timeString: string): TimeTrackItem {
        const timeRegex = /(\d+d)?(\d+h)?(\d+m)?\s*(.*)/;
        const matches = timeString.match(timeRegex);
    
        if (!matches) {
            throw new Error('Cannot parse time, write please in format eg. 3d20m sample task');
        }
    
        const days = parseInt(matches[1] || '0', 10);
        const hours = parseInt(matches[2] || '0', 10);
        const minutes = parseInt(matches[3] || '0', 10);
        const description = matches[4] || '';
    
        const totalMinutes = days * 24 * 60 + hours * 60 + minutes;
        const durationInSeconds = totalMinutes * 60;
    
        const endTime = new Date();

        return {
            startTime: new Date(endTime.getTime() - (durationInSeconds * 1000)), 
            endTime: endTime,
            durationInSeconds,
            description: description.trim()
        };
    }

    static calculateDurationInSeconds(startTime: Date, endTime: Date): number {
        const durationMilliseconds = endTime.getTime() - startTime.getTime();
        return Math.floor(durationMilliseconds / 1000);
    }

    constructor(
        private readonly repository: Repository
    ) {

    }
    
    async registerTimeTrackingItem(
        channelId: string,
        userId: string,
        startTime: Date,
        endTime: Date,
        description: string,
    ) {
        await this.repository.run(`
            INSERT INTO time_tracking (channel_id, user_id, start_time, end_time, duration_seconds, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [channelId, userId, startTime, endTime, TimeTrackingService.calculateDurationInSeconds(startTime, endTime), description]);
    }

    /**
     * Aggregate duration per channel, user in time range ordered by channel_id, user, duration,
     */
    async durationPerChannelAndUserInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                m_channel.label AS channel_label,
                tt.channel_id,
                tt.user_id,
                m_user.label as user_label,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping m_channel ON tt.channel_id = m_channel.resource_id
            JOIN mapping m_user ON tt.user_id = m_user.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY channel_id, user_id
            ORDER BY channel_id, user_id, total_duration;
        `, [start, end])
    }

    /**
     * Aggregate duration per channel, user, description in time range, ordered by channel_id, description,
     */
    async durationPerChannelAndUserAndDescriptionInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                mt.label AS channel_label,
                mu.label as user_label,
                tt.user_id,
                tt.channel_id,
                tt.description,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            JOIN mapping mu ON tt.user_id = mu.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY channel_id, user_id, description
            ORDER BY channel_id, user_id, description, total_duration;
        `, [start, end])
    }

    /**
     * Aggregate duration per channel, description in time range, ordered by channel_id, description,
     */
    async durationPerChannelAndDescriptionInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                mt.label AS channel_label,
                tt.channel_id,
                tt.description,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY channel_id, description
            ORDER BY channel_id, description, total_duration;
        `, [start, end])
    }
    /**
     * Aggregate duration per channel in time range,
     */
    async durationPerChannelInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                mt.label AS channel_label,
                tt.channel_id,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY channel_id
            ORDER BY channel_id;
        `, [start, end])
    }
    /**
     * Aggregate duration per user in time range,
     */
    async durationPerUserInTimeRange(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                tt.user_id,
                mu.label as user_label,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mu ON tt.user_id = mu.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY user_id
            ORDER BY user_id;
        `, [start, end])
    }
    /**
     * Show last N channel, description of user, ordered by end_time
     */
    async getLastNChannelAndDescriptionOfUser(userId: string, limit: number) {
        return this.repository.all(`
            SELECT
                tt.channel_id,
                tt.description,
                mt.label AS channel_label,
                tt.user_id,
                mu.label as user_label,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            JOIN mapping mu ON tt.user_id = mu.resource_id
            WHERE tt.user_id = ?
            GROUP BY channel_id, description
            ORDER BY tt.end_time DESC
            LIMIT ?;
        `, [userId, limit])
    }
    /**
     * Aggregated TOP N channels of given user in given time, ordered by channel_id, user,
     */
    async topNChannelOfUserInTimeRange(start: Date, end: Date, limit: number) {
        return this.repository.all(`
        WITH UserChannelDurations AS (
            SELECT
                mu.label AS user_label,
                mt.label AS channel_label,
                tt.user_id,
                tt.channel_id,
                SUM(tt.duration_seconds) AS total_duration,
                RANK() OVER(PARTITION BY mu.label, mt.label ORDER BY SUM(tt.duration_seconds) DESC) AS user_channel_rank
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            JOIN mapping mu ON tt.user_id = mu.resource_id
            GROUP BY user_id, channel_id
        )
        SELECT user_id, channel_id, total_duration, user_channel_rank
        FROM UserChannelDurations
        WHERE user_channel_rank <= ?
        ORDER BY user_id, user_channel_rank
        `, [limit])
    }
}