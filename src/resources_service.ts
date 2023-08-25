import { Repository } from "./repository";

export class ResourcesService {
    constructor(
        private readonly repository: Repository
    ) {

    }

    async getResources() {
        return this.repository.all(`
            SELECT resource_id, label FROM mapping;
        `)
    }

}