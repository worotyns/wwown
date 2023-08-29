import { Logger } from "./logger";
import { Repository } from "./repository";
import { CollectorOptions, StatsCollector } from "./stats_collector";

export interface DayChannel {
    channel: string,
    user: string,
    type: string,
    day: Date,
}

export interface Mapping {
    resource: string,
    label: string;
}

export class StatsCollectorFactory {
    constructor(
        private readonly repository: Repository,
        private readonly logger: Logger,
    ) {
    }

    createMappingCollector(options: CollectorOptions) {
        return new StatsCollector<Mapping>(
            new Map([
                ['resource', [
                    (val) => val.toString(), 
                    (val) => val
                ]],
                ['label', [
                    (val) => val.toString(), 
                    (val) => val
                ]]
            ]), 
            async (state) => {
                for (const update of state) {
                    await this.repository.run(`
                        INSERT OR IGNORE INTO 
                            mapping (resource_id, label) 
                            VALUES (?, ?)
                        `, [
                        update.resource, update.label
                    ]);
                    
                    await this.repository.run(`
                        UPDATE mapping
                        SET label = ?
                        WHERE resource_id = ?
                    `, [
                        update.label,
                        update.resource
                    ]);
                }
            },
            this.logger,
            options,
        )
    }

    createChannelCollector(options: CollectorOptions) {
        return new StatsCollector<DayChannel>(
            new Map([
                ['channel', [
                    (val) => val.toString(), 
                    (val) => val
                ]],
                ['user', [
                    (val) => val.toString(), 
                    (val) => val
                ]],
                ['type', [
                    (val) => val.toString(), 
                    (val) => val
                ]],
                ['day', [
                    (val) => (val as Date).toISOString().split('T')[0], 
                    (val) => new Date(val),
                ]],
            ]), 
            async (state) => {
                for (const update of state) {
                    console.log(update);
                    await this.repository.run(`
                        INSERT OR IGNORE INTO 
                            stats (channel_id, user_id, day, type, value, last_activity_ts, first_activity_ts) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [
                        update.channel, update.user, update.day, update.type, 0, Date.now(), Date.now()
                    ]);

                    const existing = await this.repository.get(`
                        SELECT rowid as id, channel_id, user_id, day, type, value, last_activity_ts 
                        FROM stats
                        WHERE channel_id = ? AND user_id = ? AND day = ? AND type = ?
                    `, [
                        update.channel, 
                        update.user, 
                        update.day, 
                        update.type
                    ]);
                    
                    await this.repository.run(`
                        UPDATE stats
                        SET value = value + ?,
                            last_activity_ts = ?
                        WHERE channel_id = ? AND user_id = ? AND day = ? AND type = ?
                    `, [
                        update.value,
                        Date.now(),
                        existing.channel_id,
                        existing.user_id,
                        existing.day,
                        existing.type
                    ]);
                }
            },
            this.logger,
            options,
        )
    }
}