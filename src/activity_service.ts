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
                day, 
                SUM(value) as val,
                COUNT(user_id) as uu,
                COUNT(channel_id) as uc,
                ? as min,
                ? as max
            FROM stats 
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
                    title: `${currentDate.toISOString().slice(0, 10)}: ${item.val} interactions by ${item.uu} users on ${item.uc} channels`
                });
            } else {
                filledAndNormalizedData.push({
                    day: currentDay,
                    color: 'lightgrey',
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