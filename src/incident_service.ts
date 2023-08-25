import { Repository } from "./repository";
import { TimeTrackingService } from "./time_tracking_service";

/**
 * Siblings schema as time tracking so we can share methods of calculate
 * with TimeTracking static methods.. ;D 
 */
export class IncidentService {

    constructor(
        private readonly repository: Repository
    ) {

    }
    
    async registerIncidentItem(
        channelId: string,
        userId: string,
        startTime: Date,
        endTime: Date,
        description: string,
    ) {
        await this.repository.run(`
            INSERT INTO incidents (channel_id, user_id, start_time, end_time, duration_seconds, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [channelId, userId, startTime, endTime, TimeTrackingService.calculateDurationInSeconds(startTime, endTime), description]);
    }

    /**
     * Show last N channel, description of user, ordered by end_time
     */
    async getLastIncidents(limit: number) {
        return this.repository.all(`
            SELECT
                i.channel_id,
                i.description,
                mt.label AS channel_label,
                i.user_id,
                mu.label as user_label,
                i.start_time,
                i.end_time,
                i.duration_seconds AS total_duration
            FROM incidents i
            JOIN mapping mt ON i.channel_id = mt.resource_id
            JOIN mapping mu ON i.user_id = mu.resource_id
            ORDER BY i.end_time DESC
            LIMIT ?;
        `, [limit])
    }

}