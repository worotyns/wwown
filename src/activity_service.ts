import { Repository } from "./repository";

export class ActivityService {

    static normalizeValue(originalValue: number, minValue: number, maxValue: number, newMin: number, newMax: number) {
        return ((originalValue - minValue) / (maxValue - minValue)) * (newMax - newMin) + newMin;
    }

    static readableSeconds(seconds: number) {
        const SECONDS_IN_MINUTE = 60;
        const SECONDS_IN_HOUR = 3600;
        const SECONDS_IN_DAY = 86400;
        const SECONDS_IN_WEEK = 604800;
        const SECONDS_IN_MONTH = 2592000;
        const SECONDS_IN_YEAR = 31536000;

        const years = Math.floor(seconds / SECONDS_IN_YEAR);
        seconds %= SECONDS_IN_YEAR;
        const months = Math.floor(seconds / SECONDS_IN_MONTH);
        seconds %= SECONDS_IN_MONTH;
        const weeks = Math.floor(seconds / SECONDS_IN_WEEK);
        seconds %= SECONDS_IN_WEEK;
        const days = Math.floor(seconds / SECONDS_IN_DAY);
        seconds %= SECONDS_IN_DAY;
        const hours = Math.floor(seconds / SECONDS_IN_HOUR);
        seconds %= SECONDS_IN_HOUR;
        const minutes = Math.floor(seconds / SECONDS_IN_MINUTE);
        
        return [
            (years) ? `${years}y` : null,
            (months) ? `${months}m` : null,
            (weeks) ? `${weeks}w` : null,
            (days) ? `${days}d` : null,
            (hours) ? `${hours}h` : null,
            (minutes) ? `${minutes}min` : null
        ].filter(i => i).join("");
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
                date, 
                user_id, 
                user_label, 
                COUNT(channel_id) as channels_count, 
                SUM(threads_count) as threads_count, 
                SUM(thread_messages_count) as thread_messages_count, 
                SUM(thread_messages_avg) as thread_messages_avg, 
                SUM(channel_messages) as channel_messages, 
                SUM(channel_reactions) as channel_reactions, 
                ROUND(AVG(channel_messages), 2) as channel_messages_avg, 
                ROUND(AVG(channel_reactions), 2) as channel_reactions_avg, 
                ROUND((MAX(last_activity_ts) - MIN(first_activity_ts)) / 1000 / 3600, 2) as activity_hours,
                ROUND(AVG(last_activity_ts - first_activity_ts) / 1000 / 3600, 2) as activity_hours_avg
            FROM (
                SELECT
                    strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                    user_id,
                    channel_id,
                    mu.label as user_label,
                    COUNT(thread_id) as threads_count,
                    SUM(value) as thread_messages_count,
                    ROUND(AVG(value), 2) as thread_messages_avg,
                    0 as channel_messages,
                    0 as channel_reactions,
                    MIN(first_activity_ts) as first_activity_ts,
                    MAX(last_activity_ts) as last_activity_ts
                FROM threads t
                JOIN mapping mu ON mu.resource_id = t.user_id    
                WHERE day BETWEEN ? AND ?
                GROUP BY date, user_id
            
                UNION
            
                SELECT
                    strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                    user_id,
                    channel_id,
                    mu.label as user_label,
                    0 as threads_count,
                    0 as thread_messages_count,
                    0 as thread_messages_avg,
                    SUM(CASE WHEN type = 'message' THEN value ELSE 0 END) AS channel_messages,
                    SUM(CASE WHEN type = 'reaction_added' THEN value ELSE 0 END) AS channel_reactions,
                    MIN(first_activity_ts) as first_activity_ts,
                    MAX(last_activity_ts) as last_activity_ts
                FROM stats s
                JOIN mapping mu ON mu.resource_id = s.user_id    
                WHERE day BETWEEN ? AND ?
                GROUP BY date, user_id, channel_id
            ) 
            GROUP BY date, user_id, user_label
            ORDER BY date DESC, user_label;
        `, [start, end, start, end]
        )
    }

    async getDailyActivityForChannelsInTime(start: Date, end: Date) {
        return this.repository.all(`
            SELECT 
                date, 
                channel_id,
                channel_label, 
                COUNT(user_id) as users_count, 
                SUM(threads_count) as threads_count, 
                SUM(thread_messages_count) as thread_messages_count, 
                SUM(thread_messages_avg) as thread_messages_avg_per_user, 
                SUM(channel_messages) as channel_messages, 
                SUM(channel_reactions) as channel_reactions, 
                ROUND(AVG(channel_messages), 2) as channel_messages_avg_per_user, 
                ROUND(AVG(channel_reactions), 2) as channel_reactions_avg_per_user, 
                ROUND((MAX(last_activity_ts) - MIN(first_activity_ts)) / 1000 / 3600, 2) as activity_hours,
                ROUND(AVG(last_activity_ts - first_activity_ts) / 1000 / 3600, 2) as activity_hours_avg_per_user
            FROM (
                SELECT
                    strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                    user_id,
                    channel_id,
                    mu.label as channel_label,
                    COUNT(thread_id) as threads_count,
                    SUM(value) as thread_messages_count,
                    ROUND(AVG(value), 2) as thread_messages_avg,
                    0 as channel_messages,
                    0 as channel_reactions,
                    MIN(first_activity_ts) as first_activity_ts,
                    MAX(last_activity_ts) as last_activity_ts
                FROM threads t
                JOIN mapping mu ON mu.resource_id = t.channel_id    
                WHERE day BETWEEN ? AND ?
                GROUP BY date, user_id, channel_id
            
                UNION
            
                SELECT
                    strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                    user_id,
                    channel_id,
                    mu.label as channel_label,
                    0 as threads_count,
                    0 as thread_messages_count,
                    0 as thread_messages_avg,
                    SUM(CASE WHEN type = 'message' THEN value ELSE 0 END) AS channel_messages,
                    SUM(CASE WHEN type = 'reaction_added' THEN value ELSE 0 END) AS channel_reactions,
                    MIN(first_activity_ts) as first_activity_ts,
                    MAX(last_activity_ts) as last_activity_ts
                FROM stats s
                JOIN mapping mu ON mu.resource_id = s.channel_id    
                WHERE day BETWEEN ? AND ?
                GROUP BY date, user_id, channel_id
            ) 
            GROUP BY date, channel_id, channel_label
            ORDER BY date DESC, channel_label;
        `, [start, end, start, end]
        )
    }

    async getDailyActivityForChannelInTime(channelId: string, start: Date, end: Date) {
        return this.repository.all(`
            SELECT 
                date, 
                channel_label, 
                COUNT(user_id) as users_count, 
                SUM(threads_count) as threads_count, 
                SUM(thread_messages_count) as thread_messages_count, 
                SUM(thread_messages_avg) as thread_messages_avg_per_user, 
                SUM(channel_messages) as channel_messages, 
                SUM(channel_reactions) as channel_reactions, 
                ROUND(AVG(channel_messages), 2) as channel_messages_avg_per_user, 
                ROUND(AVG(channel_reactions), 2) as channel_reactions_avg_per_user, 
                ROUND((MAX(last_activity_ts) - MIN(first_activity_ts)) / 1000 / 3600, 2) as activity_hours,
                ROUND(AVG(last_activity_ts - first_activity_ts) / 1000 / 3600, 2) as activity_hours_avg_per_user
            FROM (
                SELECT
                    strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                    user_id,
                    channel_id,
                    mu.label as channel_label,
                    COUNT(thread_id) as threads_count,
                    SUM(value) as thread_messages_count,
                    ROUND(AVG(value), 2) as thread_messages_avg,
                    0 as channel_messages,
                    0 as channel_reactions,
                    MIN(first_activity_ts) as first_activity_ts,
                    MAX(last_activity_ts) as last_activity_ts
                FROM threads t
                JOIN mapping mu ON mu.resource_id = t.channel_id    
                WHERE day BETWEEN ? AND ? AND channel_id = ?
                GROUP BY date, user_id, channel_id
            
                UNION
            
                SELECT
                    strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                    user_id,
                    channel_id,
                    mu.label as channel_label,
                    0 as threads_count,
                    0 as thread_messages_count,
                    0 as thread_messages_avg,
                    SUM(CASE WHEN type = 'message' THEN value ELSE 0 END) AS channel_messages,
                    SUM(CASE WHEN type = 'reaction_added' THEN value ELSE 0 END) AS channel_reactions,
                    MIN(first_activity_ts) as first_activity_ts,
                    MAX(last_activity_ts) as last_activity_ts
                FROM stats s
                JOIN mapping mu ON mu.resource_id = s.channel_id    
                WHERE day BETWEEN ? AND ? AND channel_id = ?
                GROUP BY date, user_id, channel_id
            ) 
            GROUP BY date, channel_id, channel_label
            ORDER by date DESC, channel_label;
        `, [start, end, channelId, start, end, channelId]);
    }

    async getDailyActivityForUserInTime(userId: string, start: Date, end: Date) {
        return this.repository.all(`
            SELECT 
                date, 
                user_id, 
                user_label, 
                COUNT(channel_id) as channels_count, 
                SUM(threads_count) as threads_count, 
                SUM(thread_messages_count) as thread_messages_count, 
                SUM(thread_messages_avg) as thread_messages_avg, 
                SUM(channel_messages) as channel_messages, 
                SUM(channel_reactions) as channel_reactions, 
                ROUND(AVG(channel_messages), 2) as channel_messages_avg, 
                ROUND(AVG(channel_reactions), 2) as channel_reactions_avg, 
                ROUND((MAX(last_activity_ts) - MIN(first_activity_ts)) / 1000 / 3600, 2) as activity_hours,
                ROUND(AVG(last_activity_ts - first_activity_ts) / 1000 / 3600, 2) as activity_hours_avg
            FROM (
                SELECT
                    strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                    user_id,
                    channel_id,
                    mu.label as user_label,
                    COUNT(thread_id) as threads_count,
                    SUM(value) as thread_messages_count,
                    ROUND(AVG(value), 2) as thread_messages_avg,
                    0 as channel_messages,
                    0 as channel_reactions,
                    MIN(first_activity_ts) as first_activity_ts,
                    MAX(last_activity_ts) as last_activity_ts
                FROM threads t
                JOIN mapping mu ON mu.resource_id = t.user_id    
                WHERE day BETWEEN ? AND ? AND user_id = ?
                GROUP BY date, user_id
            
                UNION
            
                SELECT
                    strftime('%Y-%m-%d', DATE(day / 1000, 'unixepoch')) as date,
                    user_id,
                    channel_id,
                    mu.label as user_label,
                    0 as threads_count,
                    0 as thread_messages_count,
                    0 as thread_messages_avg,
                    SUM(CASE WHEN type = 'message' THEN value ELSE 0 END) AS channel_messages,
                    SUM(CASE WHEN type = 'reaction_added' THEN value ELSE 0 END) AS channel_reactions,
                    MIN(first_activity_ts) as first_activity_ts,
                    MAX(last_activity_ts) as last_activity_ts
                FROM stats s
                JOIN mapping mu ON mu.resource_id = s.user_id    
                WHERE day BETWEEN ? AND ? AND user_id = ?
                GROUP BY date, user_id, channel_id
            ) 
            GROUP BY date, user_id, user_label
            ORDER by date DESC, user_label;
        `, [start, end, userId, start, end, userId]
        )
    }

    async getActivityChartDataForUser(userId: string, start: Date, end: Date) {
        const [{max}] = await this.repository.all(`
            SELECT MIN(value) as min, MAX(value) as max
            FROM (
                SELECT day, SUM(value) as value
                FROM stats
                WHERE day BETWEEN ? AND ? AND user_id = ?
                GROUP by day
            )
        `, [start, end, userId]);

        const data = await this.repository.all(`
            WITH RECURSIVE date_ranges AS (
                SELECT DATE(?) AS date, 0 AS days_passed
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
                COALESCE(SUM(tt.duration_seconds), 0) as tt, 
                COALESCE(COUNT(tt.duration_seconds), 0) as ttc
            FROM date_ranges d
            LEFT JOIN time_tracking tt 
                ON d.date = strftime('%Y-%m-%d', DATETIME(tt.start_time / 1000, 'unixepoch'))
            LEFT JOIN (
                    SELECT
                        strftime('%Y-%m-%d', DATETIME(day / 1000, 'unixepoch')) as day,
                        COUNT(DISTINCT user_id) as uu,
                        COUNT(DISTINCT channel_id) as uc,
                        SUM(value) as val
                    FROM stats
                    WHERE day BETWEEN ? AND ? AND user_id = ?
                    GROUP BY day
                ) s
                ON d.date = s.day
            GROUP BY d.date
            ORDER BY d.date ASC
        `, [
            end.toISOString().split('T')[0], 
            ActivityService.dateDiffInDays(start, end), 
            start, 
            end,
            userId,
        ]);
        
        return this.asDtoChart(data, max);
    }


    async getActivityChartDataForChannel(channelId: string, start: Date, end: Date) {
        const [{max}] = await this.repository.all(`
            SELECT MIN(value) as min, MAX(value) as max
            FROM (
                SELECT day, SUM(value) as value
                FROM stats
                WHERE day BETWEEN ? AND ? AND channel_id = ?
                GROUP by day
            )
        `, [start, end, channelId]);

        const data = await this.repository.all(`
            WITH RECURSIVE date_ranges AS (
                SELECT DATE(?) AS date, 0 AS days_passed
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
                COALESCE(SUM(tt.duration_seconds), 0) as tt, 
                COALESCE(COUNT(tt.duration_seconds), 0) as ttc
            FROM date_ranges d
            LEFT JOIN time_tracking tt 
                ON d.date = strftime('%Y-%m-%d', DATETIME(tt.start_time / 1000, 'unixepoch'))
            LEFT JOIN (
                    SELECT
                        strftime('%Y-%m-%d', DATETIME(day / 1000, 'unixepoch')) as day,
                        COUNT(DISTINCT user_id) as uu,
                        COUNT(DISTINCT channel_id) as uc,
                        SUM(value) as val
                    FROM stats
                    WHERE day BETWEEN ? AND ? AND channel_id = ?
                    GROUP BY day
                ) s
                ON d.date = s.day
            GROUP BY d.date
            ORDER BY d.date ASC
        `, [
            end.toISOString().split('T')[0], 
            ActivityService.dateDiffInDays(start, end), 
            start, 
            end,
            channelId,
        ]);
        
        return this.asDtoChart(data, max);
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
                SELECT DATE(?) AS date, 0 AS days_passed
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
                COALESCE(SUM(i.duration_seconds), 0) as it, 
                COALESCE(COUNT(i.duration_seconds), 0) as itc,
                COALESCE(SUM(tt.duration_seconds), 0) as tt, 
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
        `, [
            end.toISOString().split('T')[0], 
            ActivityService.dateDiffInDays(start, end), 
            start, 
            end
        ]);
        
        return this.asDtoChart(data, max);
    }

    private asDtoChart(data: any[], max: number) {
        return data.map(dayItem => ({
            day: dayItem.day,
            color: (dayItem.val > 0 ? `rgb(0, ${Math.floor(ActivityService.normalizeValue(dayItem.val, 0, max, 0, 155)) + 100}, 0)` : 'rgb(211, 211, 211)'),
            incident: dayItem.it > 0,
            title: [
                `${dayItem.day}: ${dayItem.val} interactions by ${dayItem.uu} users on ${dayItem.uc} channels`,
                dayItem.itc ? `${dayItem.itc} incidents for ${ActivityService.readableSeconds(dayItem.it)}` : null,
                dayItem.ttc ? `and ${dayItem.ttc} time tracks for ${ActivityService.readableSeconds(dayItem.tt)}` : null,
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

    async getLastActivityOfAllSinceDate(startDate: Date, endDate: Date) {
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
            WHERE s.last_activity_ts BETWEEN ? AND ?
            GROUP BY s.channel_id, m_channel.label
            ORDER BY last_activity_at DESC
        `, [startDate, endDate])
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