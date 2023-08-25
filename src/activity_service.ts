import { Repository } from "./repository";

export class ActivityService {
    constructor(
        private readonly repository: Repository
    ) {

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
            GROUP BY s.channel_id
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