import { ActivityService } from "./activity_service";
import { Repository } from "./repository";

export class HourlyActivityService {
  constructor(
    private readonly repository: Repository,
  ) {
  }

  private aggregateToHours(data: any[], min: number = 0, max: number = 100) {
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

  async getGlobalActivityForTimeRange(start: Date, end: Date, offset: number) {
    const [{ max }] = await this.repository.all(
      `
            SELECT MIN(count) as min, MAX(count) as max
            FROM (
                SELECT day, SUM(count) as count
                FROM hourly_activity
                WHERE day BETWEEN ? AND ?
                GROUP by day
            )
        `,
      [start, end],
    );

    const data = await this.repository.all(
      `
            SELECT
                s.day,
                strftime('%Y-%m-%d', DATETIME(s.day / 1000, 'unixepoch')) as date,
                strftime('%H', DATETIME((s.day + ? * 60 * 1000) / 1000, 'unixepoch')) AS hour,
                SUM(s.count) AS count
            FROM hourly_activity s
            WHERE day BETWEEN ? AND ?
            GROUP BY date, hour
            ORDER BY date DESC, hour DESC;
        `,
      [offset, start, end],
    );

    return this.aggregateToHours(data, 0, max);
  }

  async getHourlyActivityForUserInTimeRange(
    userId: string,
    start: Date,
    end: Date,
    offset: number,
  ) {
    const [{ max }] = await this.repository.all(
      `
            SELECT MIN(count) as min, MAX(count) as max
            FROM (
                SELECT day, SUM(count) as count
                FROM hourly_activity
                WHERE day BETWEEN ? AND ? AND user_id = ?
                GROUP by day
            )
        `,
      [start, end, userId],
    );

    const data = await this.repository.all(
      `
              SELECT
                  s.day,
                  strftime('%Y-%m-%d', DATETIME(s.day / 1000, 'unixepoch')) as date,
                  strftime('%H', DATETIME((s.day + ? * 60 * 1000) / 1000, 'unixepoch')) AS hour,
                  SUM(s.count) AS count
              FROM hourly_activity s
              WHERE day BETWEEN ? AND ? AND user_id = ?
              GROUP BY date, hour
              ORDER BY date DESC, hour DESC;
          `,
      [offset, start, end, userId],
    );

    return this.aggregateToHours(data, 0, max);
  }

  async getHourlyActivityForChannelInTimeRange(
    channelId: string,
    start: Date,
    end: Date,
    offset: number,
  ) {
    const [{ max }] = await this.repository.all(
      `
              SELECT MIN(count) as min, MAX(count) as max
              FROM (
                  SELECT day, SUM(count) as count
                  FROM hourly_activity
                  WHERE day BETWEEN ? AND ? AND channel_id = ?
                  GROUP by day
              )
          `,
      [start, end, channelId],
    );

    const data = await this.repository.all(
      `
                SELECT
                    s.day,
                    strftime('%Y-%m-%d', DATETIME(s.day / 1000, 'unixepoch')) as date,
                    strftime('%H', DATETIME((s.day + ? * 60 * 1000) / 1000, 'unixepoch')) AS hour,
                    SUM(s.count) AS count
                FROM hourly_activity s
                WHERE day BETWEEN ? AND ? AND channel_id = ?
                GROUP BY date, hour
                ORDER BY date DESC, hour DESC;
            `,
      [offset, start, end, channelId],
    );

    return this.aggregateToHours(data, 0, max);
  }
}
