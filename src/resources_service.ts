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
            SELECT resource_id, label FROM mapping ORDER BY label;
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