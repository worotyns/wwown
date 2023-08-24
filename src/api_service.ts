import { Repository } from "./repository";

export class ApiService {
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

    async getTopChannelUsers(userId: string, limit: number) {
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
        `, [userId, limit]);
    }

    async getLastActivityOfChannelAllTime(channel_id: string) {
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
            ORDER BY last_activity_at DESC;
        `, [channel_id])
    }
    

    async getLastActivityOfAllInLastNHours() {
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
            WHERE s.last_activity_ts >= strftime('%s', 'now', 'start of day')
            GROUP BY s.channel_id, s.user_id
            ORDER BY last_activity_at DESC;
        `)
    }
    
    async getTodayChannelUsers(channelId: string) {
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
            WHERE DATE(datetime(s.day / 1000, 'unixepoch')) = DATE('now', 'localtime')
                AND s.channel_id = ?
            GROUP BY s.user_id
            ORDER BY total_value DESC, last_activity_at DESC;
            `, [channelId])
        }

    async getTodayChannelsForUser(userId: string) {
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
                AND DATE(datetime(s.day / 1000, 'unixepoch')) = DATE('now', 'localtime')
            GROUP BY s.channel_id
            ORDER BY total_value DESC, last_activity_at DESC;
        `, [userId])
    }

    async getTopNUsersOfAllChannels(items: number = 5) {
        return this.repository.all(`
            WITH RankedUsers AS (
                SELECT
                    s.channel_id,
                    s.user_id,
                    SUM(s.value) AS total_value,
                    MAX(s.last_activity_ts) AS last_activity_at,
                    ROW_NUMBER() OVER(PARTITION BY s.channel_id ORDER BY SUM(s.value) DESC) AS user_rank
                FROM stats s
                GROUP BY s.channel_id, s.user_id
            )
            SELECT
                m_channel.label AS channel_label,
                m_user.label AS user_label,
                ru.channel_id,
                ru.user_id,
                ru.total_value,
                ru.last_activity_at
            FROM RankedUsers ru
            JOIN mapping m_channel ON ru.channel_id = m_channel.resource_id
            JOIN mapping m_user ON ru.user_id = m_user.resource_id
            WHERE ru.user_rank <= ?
            ORDER BY ru.channel_id, user_rank, ru.last_activity_at DESC;
        `, [items]);
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

    async getResources() {
        return this.repository.all(`
            SELECT resource_id, label FROM mapping;
        `)
    }

}