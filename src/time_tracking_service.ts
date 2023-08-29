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

    static extractTimeAndDescription(timeString: string, date = new Date()): TimeTrackItem {
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
    
        const endTime = date;

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
     * Channel settlement of timetracking
     * channel.html
     */
    async durationOfChannelInTimeByMonthAndUser(channelId: string, start: Date, end: Date) {
        return this.repository.all(`
            SELECT 
                strftime('%Y-%m', DATETIME(tt.start_time / 1000, 'unixepoch')) AS date,
                tt.start_time,
                tt.user_id,
                mu.label AS user_label,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mu ON tt.user_id = mu.resource_id
            WHERE tt.start_time BETWEEN ? AND ? AND tt.channel_id = ?
            GROUP BY date, user_id
            ORDER BY tt.start_time DESC, user_id;
        `, [start, end, channelId])
    }


    /**
     * Channel settlement of timetracking
     * user.html
     */
    async durationOfUserInTimeByMonthAndUser(userId: string, start: Date, end: Date) {
        return this.repository.all(`
            SELECT 
                strftime('%Y-%m', DATETIME(tt.start_time / 1000, 'unixepoch')) AS date,
                tt.start_time,
                tt.channel_id,
                mu.label AS channel_label,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mu ON tt.channel_id = mu.resource_id
            WHERE tt.start_time BETWEEN ? AND ? AND tt.user_id = ?
            GROUP BY date, channel_id
            ORDER BY tt.start_time DESC, channel_id;
        `, [start, end, userId])
    }

    /**
     * Aggregate duration of concrete channel, description in time range, ordered by channel_id, description,
     */
    async durationOfChannelAndDescriptionInTimeRange(channelId: string, start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                mt.label AS channel_label,
                tt.channel_id,
                tt.user_id,
                mu.label AS user_label,
                tt.description,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mt ON tt.channel_id = mt.resource_id
            JOIN mapping mu ON tt.user_id = mu.resource_id
            WHERE tt.start_time BETWEEN ? AND ? AND tt.channel_id = ?
            GROUP BY description, user_id
            ORDER BY tt.end_time DESC, description, user_id;
        `, [start, end, channelId])
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
     * Global sum of registered time
     * timematrix.html
     */
    async getTimeMatrixData(start: Date, end: Date) {
        const data = await this.repository.all(`
            SELECT 
                tt.channel_id,
                mc.label AS channel_label,
                tt.user_id,
                mu.label AS user_label,
                SUM(tt.duration_seconds) AS total_duration
            FROM time_tracking tt
            JOIN mapping mu ON tt.user_id = mu.resource_id
            JOIN mapping mc ON tt.channel_id = mc.resource_id
            WHERE tt.start_time BETWEEN ? AND ?
            GROUP BY channel_id, user_id
            ORDER BY total_duration DESC, user_id, channel_id;
        `, [start, end]);

        let users: Set<string> = new Set();
        let channels: Set<string> = new Set();
        let items: Record<string, any> = {};
        let labels: Record<string, string> = {};

        for (let item of data) {
            users.add(item.user_id);
            channels.add(item.channel_id);
            items[item.user_id + item.channel_id] = item.total_duration;
            labels[item.user_id] = item.user_label;
            labels[item.channel_id] = item.channel_label;
        }

        return {
            users: [...users], 
            channels: [...channels], 
            items,
            labels
        }
    }

}