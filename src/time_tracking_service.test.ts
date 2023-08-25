import assert from "assert";
import { Repository } from "./repository";
import { createTestingRepository } from "./test_utils";
import { TimeTrackingService } from "./time_tracking_service";

describe("time_tracking_service", function () {
  let repository!: Repository;
  let timeTrackingService!: TimeTrackingService;

  before(async () => {
    repository = await createTestingRepository();
    timeTrackingService = new TimeTrackingService(repository);

    await repository.run(
      `
            INSERT OR IGNORE INTO 
                mapping (resource_id, label) 
            VALUES (?, ?), (?, ?), (?, ?), (?, ?)
        `,
      [
        "channel_1",
        "channel1",
        "user_1",
        "user1",
        "channel_2",
        "channel2",
        "user_2",
        "user2",
      ],
    );

    const fakeData: Array<[string, string, Date, Date, string]> = [
      [
        "channel_1",
        "user_1",
        new Date("2023-01-01 10:00:00"),
        new Date("2023-01-01 12:00:00"),
        "ticket_xyz",
      ],
      [
        "channel_1",
        "user_2",
        new Date("2023-01-02 10:00:00"),
        new Date("2023-01-02 12:00:00"),
        "ticket_xyz",
      ],
      [
        "channel_1",
        "user_1",
        new Date("2023-01-03 10:00:00"),
        new Date("2023-01-03 12:00:00"),
        "ticket_xyz",
      ],
      [
        "channel_2",
        "user_2",
        new Date("2023-01-04 10:00:00"),
        new Date("2023-01-04 12:00:00"),
        "feature_xyz",
      ],
      [
        "channel_2",
        "user_1",
        new Date("2023-01-05 10:00:00"),
        new Date("2023-01-05 12:00:00"),
        "feature_xyz",
      ],
      [
        "channel_2",
        "user_2",
        new Date("2023-01-06 10:00:00"),
        new Date("2023-01-06 12:00:00"),
        "feature_xyz",
      ],
      [
        "channel_2",
        "user_1",
        new Date("2023-01-07 10:00:00"),
        new Date("2023-01-07 12:00:00"),
        "feature_xyz",
      ],
      [
        "channel_2",
        "user_2",
        new Date("2023-01-08 10:00:00"),
        new Date("2023-01-08 12:00:00"),
        "feature_xyz",
      ],
    ];

    for (const fake of fakeData) {
      const [channel, user, start, end, desc] = fake;
      await timeTrackingService.registerTimeTrackingItem(
        channel,
        user,
        start,
        end,
        desc,
      );
    }
  });

  it("extractTimeAndDescription", function () {
    const endDate = new Date("2020-01-04 10:20:00");
    assert.deepEqual(
      TimeTrackingService.extractTimeAndDescription(
        "5m example description",
        endDate,
      ),
      {
        durationInSeconds: 300,
        description: "example description",
        endTime: new Date("2020-01-04T09:20:00.000Z"),
        startTime: new Date("2020-01-04T09:15:00.000Z"),
      },
    );

    assert.deepEqual(
      TimeTrackingService.extractTimeAndDescription(
        "3h5m example description of task",
        endDate,
      ),
      {
        durationInSeconds: 11100,
        description: "example description of task",
        endTime: new Date("2020-01-04T09:20:00.000Z"),
        startTime: new Date("2020-01-04T06:15:00.000Z"),
      },
    );

    assert.deepEqual(
      TimeTrackingService.extractTimeAndDescription("5m", endDate),
      {
        durationInSeconds: 300,
        description: "",
        endTime: new Date("2020-01-04T09:20:00.000Z"),
        startTime: new Date("2020-01-04T09:15:00.000Z"),
      },
    );
  });

  it("durationOfChannelAndDescriptionInTimeRange", async function () {
    const results = await timeTrackingService
      .durationOfChannelAndDescriptionInTimeRange(
        'channel_2',
        new Date("2023-01-01"),
        new Date("2023-01-09"),
      );

    assert.deepEqual(results, [
      {
        channel_id: 'channel_2',
        channel_label: 'channel2',
        description: 'feature_xyz',
        total_duration: 14400,
        user_id: 'user_1',
        user_label: 'user1'
      },
      {
        channel_id: 'channel_2',
        channel_label: 'channel2',
        description: 'feature_xyz',
        total_duration: 21600,
        user_id: 'user_2',
        user_label: 'user2'
      }
    ]);
  });

  it("durationPerChannelAndUserAndDescriptionInTimeRange", async function () {
    const results = await timeTrackingService
      .durationPerChannelAndUserAndDescriptionInTimeRange(
        new Date("2023-01-01"),
        new Date("2023-01-03"),
      );

    assert.deepEqual(results, [
      {
        channel_id: "channel_1",
        channel_label: "channel1",
        description: "ticket_xyz",
        total_duration: 7200,
        user_id: "user_1",
        user_label: "user1",
      },
      {
        channel_id: "channel_1",
        channel_label: "channel1",
        description: "ticket_xyz",
        total_duration: 7200,
        user_id: "user_2",
        user_label: "user2",
      },
    ]);
  });

  it("getLastNChannelAndDescriptionOfUserInTimeRange", async function () {
    const results = await timeTrackingService
      .getLastNChannelAndDescriptionOfUser(
        "user_1",
        2,
      );

    assert.deepEqual(results, [
      {
        channel_id: "channel_2",
        channel_label: "channel2",
        description: "feature_xyz",
        total_duration: 14400,
        user_id: "user_1",
        user_label: "user1",
      },
      {
        channel_id: "channel_1",
        channel_label: "channel1",
        description: "ticket_xyz",
        total_duration: 14400,
        user_id: "user_1",
        user_label: "user1",
      },
    ]);
  });
});
