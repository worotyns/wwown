import { createFakeLogger } from "./logger";
import { MigrationManager } from "./migration_manager";
import { Repository } from "./repository";

export async function createTestingRepository() {
    const repository = new Repository(null);
    await MigrationManager.initializeDb(repository, createFakeLogger());
    return repository;
}