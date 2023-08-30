import { ActivityService } from "./activity_service";
import { Repository } from "./repository";

export class HourlyActivityService {
  constructor(
    private readonly repository: Repository,
  ) {
  }

  private aggregateToHours(data: any[], min: number, max: number) {
    const hourlyMap = new Map(
      new Array(24)
        .fill(null)
        .map((_, index) => [`${index}`.padStart(2, "0"), 0]),
    );

    for (let item of data) {
      const current = hourlyMap.get(item.hour) || 0;
      hourlyMap.set(item.hour, current + item.count);
    }

    return [...hourlyMap.keys()].map((hour) => {
      const current = hourlyMap.get(hour) || 0;
      const value = Math.round(
        Math.min(
          100,
          Math.max(
            0,
            ActivityService.normalizeValue(current, min, max, 0, 100),
          ),
        ),
      );

      return {
        hour,
        value,
      };
    });
  }

  async getGlobalActivityForTimeRange(start: Date, end: Date) {
    const [{ min, max }] = await this.repository.all(
      `
            SELECT MIN(count) as min, MAX(count) as max
            FROM (
                SELECT day, SUM(count) as count
                FROM hourly_activity
                WHERE day BETWEEN ? AND ?
                GROUP by day
            )
        `,
      [start.toISOString(), end.toISOString()],
    );

    const data = await this.repository.all(
      `
            SELECT
                s.day,
                strftime('%Y-%m-%d', s.day) as date,
                strftime('%H', s.day) hour,
                SUM(s.count) AS count
            FROM hourly_activity s
            WHERE day BETWEEN ? AND ?
            GROUP BY date, hour
            ORDER BY date DESC, hour DESC;
        `,
      [start.toISOString(), end.toISOString()],
    );

    return this.aggregateToHours(data, min, max);
  }

  async getHourlyActivityForUserInTimeRange(
    userId: string,
    start: Date,
    end: Date,
  ) {
    const [{ min, max }] = await this.repository.all(
      `
            SELECT MIN(count) as min, MAX(count) as max
            FROM (
                SELECT day, SUM(count) as count
                FROM hourly_activity
                WHERE day BETWEEN ? AND ? AND user_id = ?
                GROUP by day
            )
        `,
      [start.toISOString(), end.toISOString(), userId],
    );

    const data = await this.repository.all(
      `
              SELECT
                  s.day,
                  strftime('%Y-%m-%d', s.day) as date,
                  strftime('%H', s.day) hour,
                  SUM(s.count) AS count
              FROM hourly_activity s
              WHERE day BETWEEN ? AND ? AND user_id = ?
              GROUP BY date, hour
              ORDER BY date DESC, hour DESC;
          `,
      [start.toISOString(), end.toISOString(), userId],
    );

    return this.aggregateToHours(data, min, max);
  }

  async getHourlyActivityForChannelInTimeRange(
    channelId: string,
    start: Date,
    end: Date,
  ) {
    const [{ min, max }] = await this.repository.all(
      `
              SELECT MIN(count) as min, MAX(count) as max
              FROM (
                  SELECT day, SUM(count) as count
                  FROM hourly_activity
                  WHERE day BETWEEN ? AND ? AND channel_id = ?
                  GROUP by day
              )
          `,
      [start.toISOString(), end.toISOString(), channelId],
    );

    const data = await this.repository.all(
      `
                SELECT
                    s.day,
                    strftime('%Y-%m-%d', s.day) as date,
                    strftime('%H', s.day) hour,
                    SUM(s.count) AS count
                FROM hourly_activity s
                WHERE day BETWEEN ? AND ? AND channel_id = ?
                GROUP BY date, hour
                ORDER BY date DESC, hour DESC;
            `,
      [start.toISOString(), end.toISOString(), channelId],
    );

    return this.aggregateToHours(data, min, max);
  }
}
