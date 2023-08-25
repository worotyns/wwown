import { Repository } from "./repository";
import fs from "fs";

export class MigrationManager {

    static async initializeDb(repository: Repository) {
        const mm = new MigrationManager(repository);
        return mm.run();
    }

    constructor(
        private readonly repository: Repository,
        private readonly migrations: string = `${__dirname}/../migrations`
    ) {

    }

    async run() {
        if (await this.isNotInitialized()) {
            await this.firstInitializeDBIfNotInitializedBefore();
        }

        const migrations = await this.listMigrationFiles();

        for (const migration of migrations) {
            if (await this.wasRunBefore(migration)) {
                console.log(`Omit migration: ${migration}`)
                continue;
            }

            await this.runMigration(migration);
            await this.markAsRun(migration);
        }

        console.log('InitializeDB Finished');
    }

    async wasRunBefore(file: string) {
        const response = await this.repository.get(`
            SELECT * FROM migrations WHERE migration_name = ?
        `, [file])

        if (!response) {
            return false;
        }

        return !!response.applied_at
    }

    async markAsRun(file: string) {
        await this.repository.run(`
            INSERT INTO migrations (migration_name, applied_at) 
            VALUES (?, ?)
        `, [file, new Date()])
    }

    async listMigrationFiles(): Promise<string[]> {
        const dir = fs.readdirSync(this.migrations);
        return dir.sort();
    }

    async runMigration(file: string) {
        console.log(`Try to run migration: ${file}`);
        const query = fs.readFileSync(`${this.migrations}/${file}`);
        await this.repository.exec(query.toString('utf8'));
        console.log('Migration finished')
    }

    async isNotInitialized(): Promise<boolean> {
        let shouldInitialize = false;
        try {
            await this.repository.run(`SELECT * FROM migrations`);
        } catch(error: any) {
            if (!`${error}`.includes('no such table: migrations')) {
                throw error;
            }
            shouldInitialize = true;
        } finally {
            return shouldInitialize
        }
    }

    async firstInitializeDBIfNotInitializedBefore() {
        console.log('Initialize DB');
        await this.runMigration('000_migrations.sql');
        console.log('DB Initialized');
    } 

}