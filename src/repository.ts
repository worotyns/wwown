import sqlite3 from "sqlite3";
import fs from "fs";

export class Repository {
    private readonly db: sqlite3.Database;

    static async runMigrations(repository: Repository) {
        const path = `${__dirname}/../migrations`;
        const dir = fs.readdirSync(path);

        for (const file of dir) {
            console.log(`Running... ${file}`);
            const query = fs.readFileSync(`${path}/${file}`);
            await repository.exec(query.toString('utf8'));
        }
    }

    static async firstInitializeDBIfNotInitializedBefore(repository: Repository) {
        let shouldInitialize = false;
        try {
            await repository.run(`SELECT * FROM stats`);
        } catch(error) {
            shouldInitialize = true;
            console.log(" ERROR ", error);
        } finally {
            if (shouldInitialize) {
                console.log("Running migrations");
                Repository.runMigrations(repository);
            }
        }
    } 

    constructor(
        filename: string | null
    ) {
        this.db = new sqlite3.Database(filename || ":memory:");
    }

    async exec(query: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.exec(query, (err: Error | null) => {
                if (err) reject(err);
                return resolve();
            });
        });
    }

    async run(query: string, params: any[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, (err?: Error, res?: any) => {
                if (err) reject(err);
                return resolve(res);
            });
        });
    }

    async get<T = any>(query: string, params: any[] = []): Promise<T> {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err?: Error, res?: any) => {
                if (err) reject(err);
                return resolve(res);
            });
        });
    }

    async all<T = any>(query: string, params: any[] = []): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err?: Error, res?: any) => {
                if (err) reject(err);
                return resolve(res);
            });
        });
    }

    async stop() {
        return new Promise((resolve, reject) => {
            this.db.close((err: Error | null) => {
                if (err) reject(err);
                return resolve(null);
            });
        });
    }
}