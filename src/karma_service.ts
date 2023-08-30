import { Repository } from "./repository";

export class KarmaService {
    constructor(
        private readonly repository: Repository
    ) {

    }

    async registerReaction(channel: string, reactingUser: string, user: string, emoji: string) {
        await this.repository.run(`
            INSERT INTO karma (channel_id, reacting_user_id, user_id, timestamp, reaction)
            VALUES (?, ?, ?, ?, ?)
        `, [
            channel,
            reactingUser,
            user,
            Date.now(),
            emoji
        ])
    }

    /**
     * Details view, 
     * not used for now
     */
    async detailedData(start: Date, end: Date) {
        return this.repository.all(`
            SELECT 
                channel_id,
                user_id,
                reacting_user_id,
                mc.label as channel_label,
                mu.label as user_label,
                mru.label as reacting_user_label,
                reaction,
                timestamp as date,
                COUNT(reaction) as total
            FROM karma
            JOIN mapping mu ON mu.resource_id = user_id
            JOIN mapping mru ON mru.resource_id = reacting_user_id
            JOIN mapping mc ON mc.resource_id = channel_id
            WHERE timestamp BETWEEN ? AND ?
            ORDER BY channel_id, user_id, reacting_user_id;
        `,
        [start, end])
    }

    /**
     * Returns top of all recived emoji in range and limit
     * dashboard.html
     */
    async getGlobalReceiversInRangeAndLimit(start: Date, end: Date, limit: number) {
        return this.repository.all(`
            SELECT 
                channel_id,
                user_id,
                mc.label as channel_label,
                mu.label as user_label,
                reaction,
                COUNT(reaction) as total
            FROM karma
            JOIN mapping mu ON mu.resource_id = user_id
            JOIN mapping mc ON mc.resource_id = channel_id
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY channel_id, user_id, channel_label, user_label, reaction
            ORDER BY total, reaction, channel_id, user_id
            LIMIT ?;
        `,
        [start, end, limit])
    }

    /**
     * Returns top of all givers emoji in range and limit
     * dashboard.html
     */
    async getGlobalGiversInRangeAndLimit(start: Date, end: Date, limit: number) {
        return this.repository.all(`
            SELECT 
                channel_id,
                reacting_user_id,
                mc.label as channel_label,
                mru.label as reacting_user_label,
                reaction,
                COUNT(reaction) as total
            FROM karma
            JOIN mapping mru ON mru.resource_id = reacting_user_id
            JOIN mapping mc ON mc.resource_id = channel_id
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY channel_id, reacting_user_id, reaction
            ORDER BY channel_id, reacting_user_id
            LIMIT ?;
        `,
        [start, end, limit])
    }    

    /**
     * Returns for channel, user, emoji and "counts" ranking
     * channel.html
     */
    async getForChannelReceiversInRangeAndLimit(channel: string, start: Date, end: Date, limit: number) {
        return this.repository.all(`
            SELECT 
                channel_id,
                user_id,
                mc.label as channel_label,
                mu.label as user_label,
                reaction,
                COUNT(reaction) as total
            FROM karma
            JOIN mapping mu ON mu.resource_id = user_id
            JOIN mapping mc ON mc.resource_id = channel_id
            WHERE timestamp BETWEEN ? AND ? AND channel_id = ?
            GROUP BY channel_id, user_id, reaction
            ORDER BY total, user_id
            LIMIT ?
        `, [start, end, channel, limit])
    }

    /**
     * Returns for channel, user, emoji and "counts" ranking
     * channel.html
     */
    async getForChannelGiversInRangeAndLimit(channel: string, start: Date, end: Date, limit: number) {
        return this.repository.all(`
            SELECT 
                channel_id,
                reacting_user_id,
                mc.label as channel_label,
                mru.label as reacting_user_label,
                reaction,
                COUNT(reaction) as total
            FROM karma
            JOIN mapping mru ON mru.resource_id = user_id
            JOIN mapping mc ON mc.resource_id = channel_id
            WHERE timestamp BETWEEN ? AND ? AND channel_id = ?
            GROUP BY channel_id, reacting_user_id, reaction
            ORDER BY total, reacting_user_id
            LIMIT ?
        `, [start, end, channel, limit])
    }
    
    /**
     * Returns for user, channel, emoji, and counts ranking
     * user.html
     */
    async getForUserInRangeAndLimit(user: string, start: Date, end: Date, limit: number) {
        return this.repository.all(`
            SELECT 
                channel_id,
                reacting_user_id,
                mc.label as channel_label,
                mru.label as reacting_user_label,
                reaction,
                COUNT(reaction) as total
            FROM karma
            JOIN mapping mru ON mru.resource_id = reacting_user_id
            JOIN mapping mc ON mc.resource_id = channel_id
            WHERE timestamp BETWEEN ? AND ? AND user_id = ?
            GROUP BY channel_id, reacting_user_id, reaction
            ORDER BY total, reacting_user_id
            LIMIT ?
        `, [start, end, user, limit])
    }

    /**
     * For user who got what reactions ranking in time
     * user.html
     */
    async getForGivingUserInRangeAndLimit(user: string, start: Date, end: Date, limit: number) {
        return this.repository.all(`
            SELECT 
                channel_id,
                user_id,
                mc.label as channel_label,
                mu.label as user_label,
                reaction,
                COUNT(reaction) as total
            FROM karma
            JOIN mapping mu ON mu.resource_id = user_id
            JOIN mapping mc ON mc.resource_id = channel_id
            WHERE timestamp BETWEEN ? AND ? AND reacting_user_id = ?
            GROUP BY channel_id, user_id, reaction
            ORDER BY total, user_id
            LIMIT ?
        `, [start, end, user, limit])
    }
}