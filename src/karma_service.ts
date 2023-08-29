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
}