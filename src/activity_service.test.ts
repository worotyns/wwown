import { ActivityService } from "./activity_service";
import { createFakeLogger } from "./logger";
import { MigrationManager } from "./migration_manager";
import { Repository } from "./repository";
import assert from "assert";

describe("activity_service", function () {

    it('return activity chart data', async function() {
      const repo = new Repository(null);
      await MigrationManager.initializeDb(repo, createFakeLogger());
      const as = new ActivityService(repo);

      await repo.run(`
        INSERT INTO 
            stats (channel_id, user_id, day, type, value, last_activity_ts) 
        VALUES 
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?)
      `, [
        'ch1', 'u1', new Date('2023-07-01'), 'interaction', 22, new Date('2023-07-01'),
        'ch1', 'u1', new Date('2023-07-02'), 'interaction', 62, new Date('2023-07-02'),
        'ch1', 'u1', new Date('2023-07-03'), 'interaction', 22, new Date('2023-07-03'),
        'ch1', 'u1', new Date('2023-07-07'), 'interaction', 52, new Date('2023-07-07'),
        'ch2', 'u2', new Date('2023-07-07'), 'interaction', 42, new Date('2023-07-06'),
        'ch1', 'u1', new Date('2023-07-08'), 'interaction', 32, new Date('2023-07-08'),
        'ch1', 'u2', new Date('2023-08-02'), 'interaction', 102, new Date('2023-08-01')
      ])

        assert.deepEqual(
            await as.getActivityChartData(new Date('2023-07-01'), new Date('2023-07-10')),
            [
              {
                "color": "rgb(0, 100, 0)",
                "day": "2023-07-01",
                "title": "2023-07-01: 22 interactions by 1 users on 1 channels"
              },
              {
                "color": "rgb(0, 186, 0)",
                "day": "2023-07-02",
                "title": "2023-07-02: 62 interactions by 1 users on 1 channels"
              },
              {
                "color": "rgb(0, 100, 0)",
                "day": "2023-07-03",
                "title": "2023-07-03: 22 interactions by 1 users on 1 channels"
              },
              {
                "color": "lightgrey",
                "day": "2023-07-04",
                "title": "2023-07-04"
              },
              {
                "color": "lightgrey",
                "day": "2023-07-05",
                "title": "2023-07-05"
              },
              {
                "color": "lightgrey",
                "day": "2023-07-06",
                "title": "2023-07-06"
              },
              {
                "color": "rgb(0, 255, 0)",
                "day": "2023-07-07",
                "title": "2023-07-07: 94 interactions by 2 users on 2 channels"
              },
              {
                "color": "rgb(0, 121, 0)",
                "day": "2023-07-08",
                "title": "2023-07-08: 32 interactions by 1 users on 1 channels"
              },
              {
                "color": "lightgrey",
                "day": "2023-07-09",
                "title": "2023-07-09"
              },
              {
                "color": "lightgrey",
                "day": "2023-07-10",
                "title": "2023-07-10"
              }
            ]
        )
    });
});