import {
  Emoji,
  Max,
  Min,
  Percent,
  SlackChannelId,
  SlackChannelName,
  SlackUserId,
  SlackUserName,
  Total,
  TwoDigitHour,
} from "../../../domain/common/interfaces.ts";
import { Resources } from "../../../domain/resources.ts";
import {
  UserData,
  UserDataParams,
} from "../../../domain/stats/user/user_data.ts";
import {
  Activity,
  Given,
  HourPercentDistribution,
  LastChannels,
  Received,
  SummaryDescription,
  TopChannels,
  UserSummaryLabel,
} from "../../interfaces.ts";
import { generateDayRawRange } from "../../../domain/common/date_time.ts";
import { SerializableMap } from "../../../domain/common/serializable_map.ts";
import { BasicStats } from "../../../domain/stats/common/basic_stats.ts";
import { UserStats } from "../../../domain/stats/user/user_stats.ts";
import { normalizeEmoji, normalizeValue } from "./utils.ts";

/**
 * Collected user information for user page
 * Calculated from all time data and range data
 * Some calculations are limited to n-parameters like top-n last-n
 */
export class UserViewDto {
  /**
   * All time activity
   */
  public activityAllTime: Activity[];

  /**
   * Distribution hourly interactions in range
   */
  public hourlyInRange: HourPercentDistribution[];

  /**
   * Distribution hourly interactions all-time range
   */
  public hourlyAllTime: HourPercentDistribution[];

  /**
   * Last channels interfactions sorted and limited to N items in range time
   */
  public lastChannelsInRange: LastChannels[];
  public lastChannelsInRangeMinMax: [Min, Max, Min, Max];

  /**
   * Top channels interactions sorted and limited to N items in all time
   */
  public topChannelsAllTime: TopChannels[];
  public topChannelsAllTimeMinMax: [Min, Max, Min, Max];

  /**
   * Reactions data (emoji) for range
   */
  public reactionsInRange: Array<[Emoji, Given, Received]>;
  public reactionsInRangeMinMax: [Min, Max];

  /**
   * Reactions data (emoji) for all time
   */
  public reactionsAllTime: Array<[Emoji, Given, Received]>;
  public reactionsAllTimeMinMax: [Min, Max];

  public summary: Array<[SummaryDescription, Total, Total]>;

  constructor(
    extendedStats: UserData,
    params: UserDataParams,
  ) {
    this.activityAllTime = UserViewDto.getUserActivity(
      extendedStats,
    );

    this.hourlyAllTime = UserViewDto
      .getHourlyInteractionsDistributionAllTime(extendedStats);

    this.hourlyInRange = UserViewDto
      .getHourlyInteractionsDistributionInRange(extendedStats, params);

    this.lastChannelsInRangeMinMax = UserViewDto
      .calculateMinMaxInteractionsInRangeChannels(
        extendedStats,
        params,
      );

    this.lastChannelsInRange = UserViewDto.getLastAllTimeNChannels(
      extendedStats,
      params,
    );

    this.topChannelsAllTime = UserViewDto.getTopAllTimeNChannels(
      extendedStats,
      params,
    );

    this.topChannelsAllTimeMinMax = UserViewDto
      .calculateMinMaxInteractionsInAllChannels(
        extendedStats,
      );

    this.reactionsAllTime = UserViewDto.getReactionsAllTime(
      extendedStats,
      params,
    );
    this.reactionsAllTimeMinMax = UserViewDto.getReactionsAllTimeMinMax(
      extendedStats,
    );

    this.reactionsInRange = UserViewDto.getReactionsInRange(
      extendedStats,
      params,
    );
    this.reactionsInRangeMinMax = UserViewDto.getReactionsInRangeMinMax(
      extendedStats,
      params,
    );

    this.summary = UserViewDto.getSummary(extendedStats, params);
  }

  static getSummary(extendedStats: UserData, params: UserDataParams) {
    const summary: SerializableMap<
      UserSummaryLabel,
      [SummaryDescription, Total, Total]
    > = new SerializableMap();

    const days = extendedStats.getDayAggregatesForRange(params);
    const allTimeMessages = extendedStats.allTime.messages;
    const allTimeThreadsAuthored = extendedStats.allTime.threads.authored;
    const allTimeThreadsContributed = extendedStats.allTime.threads.contributed;
    const allTimeReactionsGiven = extendedStats.allTime.reactions.given;
    const allTimeReactionsReceived = extendedStats.allTime.reactions.received;

    const msgsTotalAllTime = Array.from(allTimeMessages.values()).reduce(
      (a, b) => a + b.total,
      0,
    );
    const msgsTotalInRange = days.reduce(
      (a, b) =>
        a + Array.from(b.messages.values()).reduce((a, b) => a + b.total, 0),
      0,
    );
    summary.set("msgsCount", [
      "Total messages are you sent",
      msgsTotalInRange,
      msgsTotalAllTime,
    ]);

    const channelsCountAllTime =
      Array.from(allTimeMessages.keys()).filter((key) => key.startsWith("C"))
        .length;
    const channelsCountInRange = days.reduce(
      (a, b) =>
        a +
        Array.from(b.messages.keys()).filter((key) => key.startsWith("C"))
          .length,
      0,
    );
    summary.set("channelsCount", [
      "Unique channels are you participating",
      channelsCountInRange,
      channelsCountAllTime,
    ]);

    const threadCountAuthoredAllTime = allTimeThreadsAuthored.size;
    const threadCountContributedAllTime = allTimeThreadsContributed.size;
    const threadCountAllTime = threadCountAuthoredAllTime +
      threadCountContributedAllTime;
    const threadCountAuthoredInRange = days.reduce(
      (a, b) => a + b.threads.authored.size,
      0,
    );
    const threadCountContributedInRange = days.reduce(
      (a, b) => a + b.threads.contributed.size,
      0,
    );
    const threadCountInRange = threadCountAuthoredInRange +
      threadCountContributedInRange;
    summary.set("threadCount", [
      "Total threads",
      threadCountInRange,
      threadCountAllTime,
    ]);
    summary.set("threadAuthoredCount", [
      "Total messages in threads authored by you",
      threadCountAuthoredInRange,
      threadCountAuthoredAllTime,
    ]);
    summary.set("threadContributedCount", [
      "Total messages in other threads",
      threadCountAuthoredInRange,
      threadCountAuthoredAllTime,
    ]);

    const threadMessagesAuthoredAllTime = Array.from(
      allTimeThreadsAuthored.values(),
    ).reduce((a, b) => a + b.total, 0);
    const threadMessagesContributedAllTime = Array.from(
      allTimeThreadsContributed.values(),
    ).reduce((a, b) => a + b.total, 0);
    const threadMessagesAuthoredInRange = days.reduce(
      (a, b) =>
        a +
        Array.from(b.threads.authored.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
      0,
    );
    const threadMessagesContributedInRange = days.reduce(
      (a, b) =>
        a +
        Array.from(b.threads.contributed.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
      0,
    );
    const threadMessagesAllTime = threadMessagesAuthoredAllTime +
      threadMessagesContributedAllTime;
    const threadMessagesInRange = threadMessagesAuthoredInRange +
      threadMessagesContributedInRange;
    const threadAvgMessagesAuthoredAllTime = threadMessagesAuthoredAllTime /
      threadCountAuthoredAllTime;
    const threadAvgMessagesContributedAllTime =
      threadMessagesContributedAllTime / threadCountContributedAllTime;
    const threadAvgMessagesAuthoredInRange = threadMessagesAuthoredInRange /
      threadCountAuthoredInRange;
    const threadAvgMessagesContributedInRange =
      threadMessagesContributedInRange / threadCountContributedInRange;
    const threadAvgMessagesAllTime = threadMessagesAllTime / threadCountAllTime;
    const threadAvgMessagesInRange = threadMessagesInRange / threadCountInRange;

    summary.set("threadMessages", [
      "Total messages sent in threads",
      threadMessagesInRange,
      threadMessagesAllTime,
    ]);
    summary.set("threadAvgMessages", [
      "Average messages per thread",
      threadAvgMessagesInRange,
      threadAvgMessagesAllTime,
    ]);
    summary.set("threadAvgMessagesAuthored", [
      "Average messages per thread authored by you",
      threadAvgMessagesAuthoredInRange,
      threadAvgMessagesAuthoredAllTime,
    ]);
    summary.set("threadAvgMessagesContributed", [
      "Average messages per thread contributed by you",
      threadAvgMessagesContributedInRange,
      threadAvgMessagesContributedAllTime,
    ]);

    const threadMaxMessagesAuthoredAllTime = Array.from(
      allTimeThreadsAuthored.values(),
    ).reduce((a, b) => Math.max(a, b.total), 0);
    const threadMaxMessagesContributedAllTime = Array.from(
      allTimeThreadsContributed.values(),
    ).reduce((a, b) => Math.max(a, b.total), 0);
    const threadMaxMessagesAuthoredInRange = days.reduce(
      (a, b) =>
        Math.max(
          a,
          Array.from(b.threads.authored.values()).reduce(
            (a, b) => Math.max(a, b.total),
            0,
          ),
        ),
      0,
    );
    const threadMaxMessagesContributedInRange = days.reduce(
      (a, b) =>
        Math.max(
          a,
          Array.from(b.threads.contributed.values()).reduce(
            (a, b) => Math.max(a, b.total),
            0,
          ),
        ),
      0,
    );
    const threadMaxMessagesAllTime = Math.max(
      threadMaxMessagesAuthoredAllTime,
      threadMaxMessagesContributedAllTime,
    );
    const threadMaxMessagesInRange = Math.max(
      threadMaxMessagesAuthoredInRange,
      threadMaxMessagesContributedInRange,
    );

    summary.set("threadMaxMessages", [
      "Maximum messages per thread",
      threadMaxMessagesInRange,
      threadMaxMessagesAllTime,
    ]);
    summary.set("threadAuthoredMaxMessages", [
      "Maximum messages per thread authored by you",
      threadMaxMessagesAuthoredInRange,
      threadMaxMessagesAuthoredAllTime,
    ]);
    summary.set("threadContributedMaxMessages", [
      "Maximum messages per thread contributed by you",
      threadMaxMessagesContributedInRange,
      threadMaxMessagesContributedAllTime,
    ]);

    const threadAvgMinutesAuthoredAllTime =
      Array.from(allTimeThreadsAuthored.values()).reduce(
        (a, b) =>
          a + Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
        0,
      ) / threadCountAuthoredAllTime;
    const threadAvgMinutesContributedAllTime =
      Array.from(allTimeThreadsContributed.values()).reduce(
        (a, b) =>
          a + Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
        0,
      ) / threadCountContributedAllTime;
    const threadAvgMinutesAuthoredInRange = days.reduce(
      (a, b) =>
        a + Array.from(b.threads.authored.values()).reduce(
          (a, b) =>
            a +
            Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
          0,
        ),
      0,
    ) / threadCountAuthoredInRange;
    const threadAvgMinutesContributedInRange = days.reduce(
      (a, b) =>
        a + Array.from(b.threads.contributed.values()).reduce(
          (a, b) =>
            a +
            Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
          0,
        ),
      0,
    ) / threadCountContributedInRange;
    const threadAvgMinutesAllTime =
      (threadAvgMinutesAuthoredAllTime + threadAvgMinutesContributedAllTime) /
      2;
    const threadAvgMinutesInRange =
      (threadAvgMinutesAuthoredInRange + threadAvgMinutesContributedInRange) /
      2;
    summary.set("threadAvgMinutes", [
      "Average thread duration",
      threadAvgMinutesInRange,
      threadAvgMinutesAllTime,
    ]);
    summary.set("threadAuthoredAvgMinutes", [
      "Average thread duration authored by you",
      threadAvgMinutesAuthoredInRange,
      threadAvgMinutesAuthoredAllTime,
    ]);
    summary.set("threadContributedAvgMinutes", [
      "Average thread duration contributed by you",
      threadAvgMinutesContributedInRange,
      threadAvgMinutesContributedAllTime,
    ]);

    const threadMaxMinutesAuthoredAllTime = Array.from(
      allTimeThreadsAuthored.values(),
    ).reduce(
      (a, b) =>
        Math.max(
          a,
          Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
        ),
      0,
    );
    const threadMaxMinutesContributedAllTime = Array.from(
      allTimeThreadsContributed.values(),
    ).reduce(
      (a, b) =>
        Math.max(
          a,
          Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
        ),
      0,
    );
    const threadMaxMinutesAuthoredInRange = days.reduce(
      (a, b) =>
        Math.max(
          a,
          Array.from(b.threads.authored.values()).reduce((a, b) =>
            Math.max(
              a,
              Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
            ), 0),
        ),
      0,
    );
    const threadMaxMinutesContributedInRange = days.reduce(
      (a, b) =>
        Math.max(
          a,
          Array.from(b.threads.contributed.values()).reduce((a, b) =>
            Math.max(
              a,
              Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
            ), 0),
        ),
      0,
    );
    const threadMaxMinutesAllTime = Math.max(
      threadMaxMinutesAuthoredAllTime,
      threadMaxMinutesContributedAllTime,
    );
    const threadMaxMinutesInRange = Math.max(
      threadMaxMinutesAuthoredInRange,
      threadMaxMinutesContributedInRange,
    );
    summary.set("threadMaxMinutes", [
      "Maximum thread duration",
      threadMaxMinutesInRange,
      threadMaxMinutesAllTime,
    ]);
    summary.set("threadAuthoredMaxMinutes", [
      "Maximum thread duration authored by you",
      threadMaxMinutesAuthoredInRange,
      threadMaxMinutesAuthoredAllTime,
    ]);
    summary.set("threadContributedMaxMinutes", [
      "Maximum thread duration contributed by you",
      threadMaxMinutesContributedInRange,
      threadMaxMinutesContributedAllTime,
    ]);

    const reactionsGivenAllTime = Array.from(allTimeReactionsGiven.values())
      .reduce((a, b) => a + b.total, 0);
    const reactionsReceivedAllTime = Array.from(
      allTimeReactionsReceived.values(),
    ).reduce((a, b) => a + b.total, 0);
    const reactionsReceivedInRange = days.reduce(
      (a, b) =>
        a +
        Array.from(b.reactions.received.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
      0,
    );
    const reactionsGivenInRange = days.reduce(
      (a, b) =>
        a +
        Array.from(b.reactions.given.values()).reduce((a, b) => a + b.total, 0),
      0,
    );

    summary.set("reactionsReceived", [
      "Total reactions are you received",
      reactionsReceivedInRange,
      reactionsReceivedAllTime,
    ]);
    summary.set("reactionsGiven", [
      "Total reactions are you given",
      reactionsGivenInRange,
      reactionsGivenAllTime,
    ]);

    const totalActivityHoursAllTime = Math.ceil(
      (extendedStats.allTime.lastAt.getTime() -
        extendedStats.allTime.firstAt.getTime()) / 3_600_000,
    );
    const totalActivityHoursInRange = days.reduce(
      (a, b) =>
        a + Math.ceil((b.lastAt.getTime() - b.firstAt.getTime()) / 3_600_000),
      0,
    );
    const averageActivityHoursPerDayAllTime = totalActivityHoursAllTime /
      extendedStats.days.size;
    const averageActivityHoursPerDayInRange = totalActivityHoursInRange /
      days.length;

    summary.set("totalActivityHours", [
      "Total hours are you active",
      totalActivityHoursInRange,
      totalActivityHoursAllTime,
    ]);
    summary.set("avgActivityHoursPerDay", [
      "Average hours active per day",
      averageActivityHoursPerDayInRange,
      averageActivityHoursPerDayAllTime,
    ]);

    return Array.from(summary.values());
  }

  static getUserActivity(
    extendedStats: UserData,
  ): Array<Activity> {
    const activity: Array<Activity> = [];

    const daysToSubtract = (52 * 7) + (new Date().getUTCDay());
    const activityRangeFrom = new Date(
      new Date().getTime() - (daysToSubtract * 24 * 60 * 60 * 1000),
    );

    const params: UserDataParams = {
      from: activityRangeFrom,
      to: new Date(),
      lastItems: Infinity,
    };

    const values: number[] = [];

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const [_, value] of dayAggregate.messages.entries()) {
        values.push(value.total);
      }
    }

    const max = Math.max(...values);

    for (const day of generateDayRawRange(params.from, params.to)) {
      const resource = extendedStats.days.getOrSet(
        day,
        () => new UserStats(extendedStats.userId),
      );

      const currentValue = [
        Array.from(resource.messages.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
        Array.from(resource.reactions.given.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
        Array.from(resource.threads.contributed.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
        Array.from(resource.threads.authored.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
      ].reduce((a, b) => a + b, 0);

      activity.push(
        [
          day,
          normalizeValue(
            currentValue,
            0,
            max,
            currentValue > 0 ? 0.15 : 0.05,
            1,
          ),
          currentValue,
          1, // one user
          resource.messages.size, // in n-channels
          0, // there is no incidents yet, - TODO based on emoji, after full rewrite of wwown
        ],
      );
    }

    return activity;
  }

  static getTopAllTimeNChannels(
    extendedStats: UserData,
    params: UserDataParams,
  ): Array<LastChannels> {
    const lastChannels: SerializableMap<SlackChannelId, LastChannels> =
      new SerializableMap();

    for (const [channelId, channelStats] of extendedStats.allTime.messages) {
      const { total, lastTs } = channelStats;
      const item = lastChannels.getOrSet(
        channelId,
        () => [channelId, 0, 0],
      );
      item[1] += total;
      item[2] = Math.max(item[2], lastTs.getTime());
      lastChannels.set(channelId, item);
    }

    return Array.from(lastChannels.values()).sort((a, b) => b[1] - a[1]).slice(
      0,
      params.lastItems,
    );
  }

  static getLastAllTimeNChannels(
    extendedStats: UserData,
    params: UserDataParams,
  ): Array<LastChannels> {
    const lastChannels: SerializableMap<SlackChannelId, LastChannels> =
      new SerializableMap();

    for (const dayStats of extendedStats.getDayAggregatesForRange(params)) {
      for (const [channelId, channelStats] of dayStats.messages) {
        const { total, lastTs } = channelStats;
        const item = lastChannels.getOrSet(
          channelId,
          () => [channelId, 0, 0],
        );
        item[1] += total;
        item[2] = Math.max(item[2], lastTs.getTime());
        lastChannels.set(channelId, item);
      }
    }

    return Array.from(lastChannels.values()).sort((a, b) => b[2] - a[2]).slice(
      0,
      params.lastItems,
    );
  }

  static calculateMinMaxInteractionsInRangeChannels(
    extendedStats: UserData,
    params: UserDataParams,
  ): [Min, Max, Min, Max] {
    const values = [];
    const ts = [];

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const [_, value] of dayAggregate.messages.entries()) {
        values.push(value.total);
        ts.push(value.lastTs.getTime());
      }
    }

    return [
      Math.min(...values),
      Math.max(...values),
      Math.min(...ts),
      Math.max(...ts),
    ];
  }

  static calculateMinMaxInteractionsInAllChannels(
    extendedStats: UserData,
  ): [Min, Max, Min, Max] {
    const values = [];
    const ts = [];

    for (const [_, value] of extendedStats.allTime.messages.entries()) {
      values.push(value.total);
      ts.push(value.lastTs.getTime());
    }

    return [
      Math.min(...values),
      Math.max(...values),
      Math.min(...ts),
      Math.max(...ts),
    ];
  }

  static calculateMinMaxAndSumOfHourlyInteractionsDistributionInRange(
    extended: UserData,
    params: UserDataParams,
  ): [Min, Max, Total] {
    const values = [];

    for (const dayAggregate of extended.getDayAggregatesForRange(params)) {
      for (const [_, value] of dayAggregate.hourly.entries()) {
        values.push(value.total);
      }
    }

    return [
      Math.min(...values),
      Math.max(...values),
      values.reduce((a, b) => a + b, 0),
    ];
  }

  static calculateMinMaxAndSumOfHourlyInteractionsDistributionAllTime(
    extended: UserData,
  ): [Min, Max, Total] {
    const values = [];

    for (const [_, value] of extended.allTime.hourly.entries()) {
      values.push(value.total);
    }

    return [
      Math.min(...values),
      Math.max(...values),
      values.reduce((a, b) => a + b, 0),
    ];
  }

  static getHourlyInteractionsDistributionInRange(
    extendedStats: UserData,
    params: UserDataParams,
  ): Array<HourPercentDistribution> {
    const [_min, _max, sum] = this
      .calculateMinMaxAndSumOfHourlyInteractionsDistributionInRange(
        extendedStats,
        params,
      );

    const distribution: SerializableMap<TwoDigitHour, Percent> =
      new SerializableMap();

    const hoursRange = new Array(24).fill(0).map((_, i) =>
      i.toString().padStart(2, "0")
    );

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const hour of hoursRange) {
        const value = dayAggregate.hourly.getOrSet(
          hour,
          () => new BasicStats(),
        );
        const current = distribution.get(hour) || 0;
        const percent = value.total ? value.total / sum : 0;
        distribution.set(hour, current + percent);
      }
    }

    return distribution.toJSON();
  }

  static getHourlyInteractionsDistributionAllTime(
    extendedStats: UserData,
  ): Array<HourPercentDistribution> {
    const [_min, _max, sum] = this
      .calculateMinMaxAndSumOfHourlyInteractionsDistributionAllTime(
        extendedStats,
      );

    const distribution: SerializableMap<TwoDigitHour, Percent> =
      new SerializableMap();

    const hoursRange = new Array(24).fill(0).map((_, i) =>
      i.toString().padStart(2, "0")
    );

    for (const hour of hoursRange) {
      const value = extendedStats.allTime.hourly.getOrSet(
        hour,
        () => new BasicStats(),
      );
      const current = distribution.get(hour) || 0;
      const percent = value.total ? value.total / sum : 0;
      distribution.set(hour, current + percent);
    }

    return distribution.toJSON();
  }

  static getReactionsAllTime(extendedStats: UserData, params: UserDataParams) {
    const reactions: SerializableMap<string, [Emoji, Given, Received]> =
      new SerializableMap();

    for (
      let [emoji, value] of extendedStats.allTime.reactions.given.entries()
    ) {
      emoji = normalizeEmoji(emoji);
      const item = reactions.getOrSet(
        emoji,
        () => [emoji, 0, 0],
      );
      item[1] += value.total;
      reactions.set(emoji, item);
    }

    for (
      let [emoji, value] of extendedStats.allTime.reactions.received.entries()
    ) {
      emoji = normalizeEmoji(emoji);
      const item = reactions.getOrSet(
        emoji,
        () => [emoji, 0, 0],
      );
      item[2] += value.total;
      reactions.set(emoji, item);
    }

    return Array.from(reactions.values()).sort((a, b) => b[1] - a[1]).slice(
      0,
      params.lastItems,
    );
  }

  static getReactionsAllTimeMinMax(
    extendedStats: UserData,
  ): [Min, Max] {
    const values = [];

    for (const [_, value] of extendedStats.allTime.reactions.given.entries()) {
      values.push(value.total);
    }

    for (
      const [_, value] of extendedStats.allTime.reactions.received.entries()
    ) {
      values.push(value.total);
    }

    return [
      Math.min(...values),
      Math.max(...values),
    ];
  }

  static getReactionsInRange(
    extendedStats: UserData,
    params: UserDataParams,
  ) {
    const reactions: SerializableMap<string, [Emoji, Given, Received]> =
      new SerializableMap();

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (let [emoji, value] of dayAggregate.reactions.given.entries()) {
        emoji = normalizeEmoji(emoji);
        const item = reactions.getOrSet(
          emoji,
          () => [emoji, 0, 0],
        );
        item[1] += value.total;
        reactions.set(emoji, item);
      }

      for (let [emoji, value] of dayAggregate.reactions.received.entries()) {
        emoji = normalizeEmoji(emoji);
        const item = reactions.getOrSet(
          emoji,
          () => [emoji, 0, 0],
        );
        item[2] += value.total;
        reactions.set(emoji, item);
      }
    }

    return Array.from(reactions.values()).sort((a, b) => b[1] - a[1]).slice(
      0,
      params.lastItems,
    );
  }

  static getReactionsInRangeMinMax(
    extendedStats: UserData,
    params: UserDataParams,
  ): [Min, Max] {
    const values: number[] = [];

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const [_, emojiStas] of dayAggregate.reactions.given) {
        values.push(emojiStas.total);
      }

      for (const [_, emojiStas] of dayAggregate.reactions.received) {
        values.push(emojiStas.total);
      }
    }

    return [
      Math.min(...values),
      Math.max(...values),
    ];
  }
}
