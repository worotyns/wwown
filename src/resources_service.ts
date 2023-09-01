import { Repository } from "./repository";

export class ResourcesService {
    constructor(
        private readonly repository: Repository
    ) {

    }

    async renameResource(channelId: string, newName: string) {
        await this.repository.run(`
                UPDATE mapping
                SET label = ?
                WHERE resource_id = ?;
            `, 
            [newName, channelId]
        );
    }

    async getResources() {
        return this.repository.all(`
            SELECT 
                m.resource_id, 
                m.label,
                MAX(s.last_activity_ts) as last_activity_ts
            FROM mapping m
            LEFT JOIN stats s ON s.channel_id = m.resource_id OR s.user_id = m.resource_id
            GROUP BY m.resource_id, m.label
            ORDER BY s.last_activity_ts DESC, m.label
        `)
    }

    async removeResourceById(resourceId: string) {
        await this.repository.run(`
                DELETE FROM mapping WHERE resource_id = ?
            `, 
            [resourceId]
        );
    }
}