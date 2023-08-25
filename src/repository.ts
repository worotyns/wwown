import sqlite3 from "sqlite3";

export class Repository {
    private readonly db: sqlite3.Database;

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