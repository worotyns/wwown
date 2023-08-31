import { Repository } from "./repository";

export class ActivityService {

    static normalizeValue(originalValue: number, minValue: number, maxValue: number, newMin: number, newMax: number) {
        return ((originalValue - minValue) / (maxValue - minValue)) * (newMax - newMin) + newMin;
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
        const [{max}] = await this.repository.all(`
            SELECT MIN(value) as min, MAX(value) as max
            FROM (
                SELECT day, SUM(value) as value
                FROM stats
                WHERE day BETWEEN ? AND ?
                GROUP by day
            )
        `, [start, end]);

        const data = await this.repository.all(`
            WITH RECURSIVE date_ranges AS (
                SELECT DATE('now') AS date, 0 AS days_passed
                UNION ALL
                SELECT DATE(date, '-1 day'), days_passed + 1
                FROM date_ranges
                WHERE days_passed < ?
            )
            
            SELECT 
                d.date as day, 
                COALESCE(s.uc, 0) as uc,
                COALESCE(s.uu, 0) as uu,
                COALESCE(s.val, 0) as val,
                COALESCE(SUM(i.duration_seconds / 60), 0) as it, 
                COALESCE(COUNT(i.duration_seconds), 0) as itc,
                COALESCE(SUM(tt.duration_seconds / 60), 0) as tt, 
                COALESCE(COUNT(tt.duration_seconds), 0) as ttc
            FROM date_ranges d
            LEFT JOIN incidents i 
                ON d.date = strftime('%Y-%m-%d', DATETIME(i.start_time / 1000, 'unixepoch'))
            LEFT JOIN time_tracking tt 
                ON d.date = strftime('%Y-%m-%d', DATETIME(tt.start_time / 1000, 'unixepoch'))
            LEFT JOIN (
                    SELECT
                        strftime('%Y-%m-%d', DATETIME(day / 1000, 'unixepoch')) as day,
                        COUNT(DISTINCT user_id) as uu,
                        COUNT(DISTINCT channel_id) as uc,
                        SUM(value) as val
                    FROM stats
                    WHERE day BETWEEN ? AND ?
                    GROUP BY day
                ) s
                ON d.date = s.day
            GROUP BY d.date
            ORDER BY d.date ASC
            LIMIT ?
        `, [ActivityService.dateDiffInDays(start, end), start, end, ActivityService.dateDiffInDays(start, end)]);
        
        return data.map(dayItem => ({
            day: dayItem.day,
            color: (dayItem.val > 0 ? `rgb(0, ${255 - Math.floor(ActivityService.normalizeValue(dayItem.val, 0, max, 100, 155))}, 0)` : 'lightgray'),
            incident: dayItem.it > 0,
            title: [
                `${dayItem.day}: ${dayItem.val} interactions by ${dayItem.uu} users on ${dayItem.uc} channels`,
                dayItem.itc ? `${dayItem.itc} incidents with duration of ${dayItem.it}min` : null,
                dayItem.ttc ? `and ${dayItem.ttc} time tracks with ${dayItem.tt}min duration` : null,
            ].filter(i => i).join(', ')
        }))
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
            SELECT
                s.channel_id,
                m_channel.label AS channel_label,
                GROUP_CONCAT(DISTINCT m_user.label || '|' || s.user_id) AS users,
                SUM(s.value) AS total_value,
                MAX(s.last_activity_ts) AS last_activity_at
            FROM stats s
            JOIN mapping m_channel ON s.channel_id = m_channel.resource_id
            JOIN mapping m_user ON s.user_id = m_user.resource_id
            WHERE s.last_activity_ts >= ?
            GROUP BY s.channel_id, m_channel.label
            ORDER BY last_activity_at DESC
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