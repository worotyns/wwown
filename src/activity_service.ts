import { Repository } from "./repository";

export class ActivityService {

    static normalizeValue(originalValue: number, minValue: number, maxValue: number, newMin: number, newMax: number) {
        return ((originalValue - minValue) / (maxValue - minValue)) * (newMax - newMin) + newMin;
    }

    static getKeyFromDay(day: number): string {
        return new Date(day).toISOString().slice(0, 10)
    }

    static dateDiffInDays(date1: Date, date2: Date): number {
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        return daysDiff;
    }

    constructor(
        private readonly repository: Repository
    ) {

    }

    async getDailyActivityForUsersInTime(start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                user_id,
                mu.label as user_label,
                ROUND(AVG(CASE WHEN type = 'message' THEN value ELSE 0 END), 1) AS avg_messages,
                ROUND(AVG(CASE WHEN type = 'reaction_added' THEN value ELSE 0 END), 1) AS avg_reactions,
                ROUND(AVG(last_activity_ts - first_activity_ts) / 1000 / 3600, 1) as avg_hours
            FROM stats s
            JOIN mapping mu ON mu.resource_id = s.user_id    
            WHERE day BETWEEN ? AND ? 
            GROUP BY date, user_id
            ORDER BY date DESC, user_label;
        `, [start, end]
        )
    }

    async getDailyActivityForChannelInTime(channelId: string, start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                channel_id,
                mc.label as channel_label,
                ROUND(AVG(CASE WHEN type = 'message' THEN value ELSE 0 END), 1) AS avg_messages,
                ROUND(AVG(CASE WHEN type = 'reaction_added' THEN value ELSE 0 END), 1) AS avg_reactions,
                ROUND(AVG(last_activity_ts - first_activity_ts) / 1000 / 3600, 1) as avg_hours
            FROM stats s
            JOIN mapping mc ON mc.resource_id = s.channel_id    
            WHERE day BETWEEN ? AND ? AND channel_id = ?
            GROUP BY date, channel_id
            ORDER BY date DESC;
        `, [start, end, channelId]);
    }

    async getDailyActivityForUserInTime(userId: string, start: Date, end: Date) {
        return this.repository.all(`
            SELECT
                strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                user_id,
                mu.label as user_label,
                ROUND(AVG(CASE WHEN type = 'message' THEN value ELSE 0 END), 1) AS avg_messages,
                ROUND(AVG(CASE WHEN type = 'reaction_added' THEN value ELSE 0 END), 1) AS avg_reactions,
                ROUND(AVG(last_activity_ts - first_activity_ts) / 1000 / 3600, 1) as avg_hours
            FROM stats s
            JOIN mapping mu ON mu.resource_id = s.user_id    
            WHERE day BETWEEN ? AND ? AND user_id = ?
            GROUP BY date, user_id
            ORDER BY date DESC;
        `, [start, end, userId]
        )
    }

    async getActivityChartData(start: Date, end: Date) {
        const [{min, max}] = await this.repository.all(`
            SELECT MIN(value) as min, MAX(value) as max
            FROM (
                SELECT day, SUM(value) as value
                FROM stats
                WHERE day BETWEEN ? AND ?
                GROUP by day
            )
        `, [start, end]);

        const data = await this.repository.all(`
            SELECT 
                s.day, 
                SUM(s.value) as val,
                COUNT(s.user_id) as uu,
                COUNT(s.channel_id) as uc,
                SUM(i.duration_seconds) / 60 as it,
                SUM(tt.duration_seconds) / 60 as tt,
                ? as min,
                ? as max
            FROM stats s
            LEFT JOIN time_tracking tt ON s.channel_id = tt.channel_id AND DATE(s.day / 1000, 'unixepoch') = DATE(tt.start_time / 1000, 'unixepoch')
            LEFT JOIN incidents i ON s.channel_id = i.channel_id AND DATE(s.day / 1000, 'unixepoch') = DATE(i.start_time / 1000, 'unixepoch')
            WHERE day BETWEEN ? AND ?
            GROUP BY day
            ORDER BY day DESC
            LIMIT ?
        `, [min, max, start, end, ActivityService.dateDiffInDays(start, end)]);
            
    
        const dataMap = new Map(data.map(item => [ActivityService.getKeyFromDay(item.day), item]));
        const filledAndNormalizedData = [];
        const currentDate = new Date(start)

        while (currentDate <= end) {
            const currentDay = ActivityService.getKeyFromDay(currentDate.getTime());
            if (dataMap.has(currentDay)) {
                const item = dataMap.get(currentDay);
                const normalizedValue = Math.floor(ActivityService.normalizeValue(item.val, min, max, 100, 155));

                const color = `rgb(0, ${255 - normalizedValue}, 0)`;

                filledAndNormalizedData.push({
                    day: currentDay,
                    color: color,
                    incident: item.it > 0,
                    title: [
                        `${currentDate.toISOString().slice(0, 10)}: ${item.val} interactions by ${item.uu} users on ${item.uc} channels`,
                        item.it ? `incidents duration ${item.it}min` : null,
                        item.tt ? `and ${item.tt}min time records` : null,
                    ].filter(i => i).join(', ')
                });
            } else {
                filledAndNormalizedData.push({
                    day: currentDay,
                    color: 'lightgrey',
                    incident: false,
                    title: `${currentDate.toISOString().slice(0, 10)}`
                });
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return filledAndNormalizedData; // Reverse the array to match your requirement
    }

    async getLastChannelUsers(channelId: string, limit: number) {
        return this.repository.all(`
            SELECT m_channel.label AS channel_label,
                m_user.label AS user_label,
                s.channel_id,
                s.user_id,
                SUM(s.value) AS total_value,
                MAX(s.last_activity_ts) AS last_activity_at
            FROM stats s
            JOIN mapping m_channel ON s.channel_id = m_channel.resource_id
            JOIN mapping m_user ON s.user_id = m_user.resource_id
            WHERE s.channel_id = ?
            GROUP BY s.channel_id, s.user_id
            ORDER BY last_activity_at DESC
            LIMIT ?
        `, [channelId, limit]);
    }

    async getTopChannelsForUser(userId: string, limit: number) {
        return this.repository.all(`
            SELECT m_channel.label AS channel_label,
                m_user.label AS user_label,
                s.user_id,
                s.channel_id,
                SUM(s.value) AS total_value,
                MAX(s.last_activity_ts) AS last_activity_at
            FROM stats s
            JOIN mapping m_channel ON s.channel_id = m_channel.resource_id
            JOIN mapping m_user ON s.user_id = m_user.resource_id
            WHERE s.user_id = ?
            GROUP BY s.channel_id
            ORDER BY total_value DESC
            LIMIT ?
        `, [userId, limit]);
    }

    async getTopChannelUsers(channelId: string, limit: number) {
        return this.repository.all(`
            SELECT m_user.label AS user_label,
                m_channel.label AS channel_label,
                s.user_id,
                SUM(s.value) AS total_value,
                MAX(s.last_activity_ts) AS last_activity_at
            FROM stats s
            JOIN mapping m_channel ON s.channel_id = m_channel.resource_id
            JOIN mapping m_user ON s.user_id = m_user.resource_id
            WHERE s.channel_id = ?
            GROUP BY s.user_id
            ORDER BY total_value DESC
            LIMIT ?
        `, [channelId, limit]);
    }

    async getLastActivityOfAllSinceDate(dateTime: Date) {
        return this.repository.all(`
            SELECT m_channel.label AS channel_label,
                m_user.label AS user_label,
                s.channel_id,
                s.user_id,
                SUM(s.value) AS total_value,
                MAX(s.last_activity_ts) AS last_activity_at
            FROM stats s
            JOIN mapping m_channel ON s.channel_id = m_channel.resource_id
            JOIN mapping m_user ON s.user_id = m_user.resource_id
            WHERE s.last_activity_ts >= ?
            GROUP BY s.channel_id, s.user_id
            ORDER BY last_activity_at DESC;
        `, [dateTime])
    }
    
    async getChannelUsersInTimeRange(channelId: string, startDate: Date, endDate: Date) {
        return this.repository.all(`
            SELECT s.user_id,
                s.channel_id,
                m_user.label AS user_label,
                m_channel.label as channel_label,
                SUM(s.value) AS total_value,
                MAX(s.last_activity_ts) AS last_activity_at
            FROM stats s
            JOIN mapping m_channel ON s.channel_id = m_channel.resource_id
            JOIN mapping m_user ON s.user_id = m_user.resource_id
            WHERE s.day BETWEEN ? AND ?
                AND s.channel_id = ?
            GROUP BY s.user_id
            ORDER BY total_value DESC, last_activity_at DESC;
            `, [startDate, endDate, channelId])
        }

    async getLastChannelsForUser(userId: string, items: number = 5) {
        return this.repository.all(`
            SELECT m_channel.label AS channel_label,
                s.channel_id,
                s.user_id,
                m_user.label AS user_label,
                SUM(s.value) AS total_value,
                MAX(s.last_activity_ts) AS last_activity_at
            FROM stats s
            JOIN mapping m_channel ON s.channel_id = m_channel.resource_id
            JOIN mapping m_user ON s.user_id = m_user.resource_id
            WHERE s.user_id = ?
            GROUP BY s.channel_id
            ORDER BY last_activity_at DESC, total_value DESC
            LIMIT ?;
            `, [userId, items])
    }

}