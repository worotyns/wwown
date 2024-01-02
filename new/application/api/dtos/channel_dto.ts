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
  Activity,
  HourPercentDistribution,
  LastChannels,
  SummaryDescription,
  TopChannels,
} from "../../interfaces.ts";
import { generateDayRawRange } from "../../../domain/common/date_time.ts";
import { SerializableMap } from "../../../domain/common/serializable_map.ts";
import { BasicStats } from "../../../domain/stats/common/basic_stats.ts";
import { ChannelStats } from "../../../domain/stats/channel/channel_stats.ts";
import {
  ChannelData,
  ChannelDataParams,
} from "../../../domain/stats/channel/channel_data.ts";
import { normalizeEmoji, normalizeValue } from "./utils.ts";

type ChannelSummaryLabel =
  | "reactions" // How many reactions are you giving?
  | "threadCount" // How many threads are you participating in?
  | "threadMessages" // How many messages are you sending via threads?
  | "threadAvgMessages" // What is your average number of messages authored per thread?
  | "threadMaxMessages" // What is your maximum number of messages per thread?
  | "threadAvgMinutes" // What is your average thread duration?
  | "threadMaxMinutes" // What is your maximum thread duration?
  | "usersCount" // How many channels are you participating in?
  | "msgsInThreads" // How many messages are you sending via threads?
  | "msgsInChannels" // How many messages are you sending via channels?
  | "msgsCount" // How many messages are you sending?
  | "totalActivityHours" // How many hours are you active?
  | "avgActivityHoursPerDay"; // What is your average number of hours active per day?

/**
 * Collected user information for user page
 * Calculated from all time data and range data
 * Some calculations are limited to n-parameters like top-n last-n
 */
export class ChannelViewDto {
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
  public lastUsersInRange: LastChannels[];
  public lastUsersInRangeMinMax: [Min, Max, Min, Max];

  /**
   * Top channels interactions sorted and limited to N items in all time
   */
  public topUsersAllTime: TopChannels[];
  public topUsersAllTimeMinMax: [Min, Max, Min, Max];

  /**
   * Reactions data (emoji) for range
   */
  public reactionsInRange: Array<[Emoji, Total]>;
  public reactionsInRangeMinMax: [Min, Max];

  /**
   * Reactions data (emoji) for all time
   */
  public reactionsAllTime: Array<[Emoji, Total]>;
  public reactionsAllTimeMinMax: [Min, Max];

  public summary: Array<[SummaryDescription, Total, Total]>;

  constructor(
    extendedStats: ChannelData,
    params: ChannelDataParams,
  ) {
    this.activityAllTime = ChannelViewDto.getUserActivity(
      extendedStats,
    );

    this.hourlyAllTime = ChannelViewDto
      .getHourlyInteractionsDistributionAllTime(extendedStats);

    this.hourlyInRange = ChannelViewDto
      .getHourlyInteractionsDistributionInRange(extendedStats, params);

    this.lastUsersInRangeMinMax = ChannelViewDto
      .calculateMinMaxInteractionsInRangeChannels(
        extendedStats,
        params,
      );

    this.lastUsersInRange = ChannelViewDto.getLastAllTimeNChannels(
      extendedStats,
      params,
    );

    this.topUsersAllTime = ChannelViewDto.getTopAllTimeNChannels(
      extendedStats,
      params,
    );

    this.topUsersAllTimeMinMax = ChannelViewDto
      .calculateMinMaxInteractionsInAllChannels(
        extendedStats,
      );

    this.reactionsAllTime = ChannelViewDto.getReactionsAllTime(
      extendedStats,
      params,
    );
    this.reactionsAllTimeMinMax = ChannelViewDto.getReactionsAllTimeMinMax(
      extendedStats,
    );

    this.reactionsInRange = ChannelViewDto.getReactionsInRange(
      extendedStats,
      params,
    );
    this.reactionsInRangeMinMax = ChannelViewDto.getReactionsInRangeMinMax(
      extendedStats,
      params,
    );

    this.summary = ChannelViewDto.getSummary(extendedStats, params);
  }

  static getSummary(extendedStats: ChannelData, params: ChannelDataParams) {
    const summary: SerializableMap<
      ChannelSummaryLabel,
      [SummaryDescription, Total, Total]
    > = new SerializableMap();

    const days = extendedStats.getDayAggregatesForRange(params);
    const allTimeMessages = extendedStats.allTime.messages;
    const allTimeThreads = extendedStats.allTime.threads;
    const allTimeReactions = extendedStats.allTime.reactions;

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
      "Total messages in channel",
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
    summary.set("usersCount", [
      "Unique users participating in conversations",
      channelsCountInRange,
      channelsCountAllTime,
    ]);

    const threadCountAllTime = allTimeThreads.size;
    const threadCountInRange = days.reduce((a, b) => a + b.threads.size, 0);
    summary.set("threadCount", [
      "Total threads",
      threadCountInRange,
      threadCountAllTime,
    ]);

    const threadMessagesAllTime = Array.from(allTimeThreads.values()).reduce(
      (a, b) => a + b.total,
      0,
    );
    const threadMessagesInRange = days.reduce(
      (a, b) =>
        a + Array.from(b.threads.values()).reduce((a, b) => a + b.total, 0),
      0,
    );
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

    const threadMaxMessagesAllTime = Array.from(allTimeThreads.values()).reduce(
      (a, b) => Math.max(a, b.total),
      0,
    );
    const threadMaxMessagesInRange = days.reduce(
      (a, b) =>
        Math.max(
          a,
          Array.from(b.threads.values()).reduce(
            (a, b) => Math.max(a, b.total),
            0,
          ),
        ),
      0,
    );

    summary.set("threadMaxMessages", [
      "Maximum messages per thread",
      threadMaxMessagesInRange,
      threadMaxMessagesAllTime,
    ]);

    const threadAvgMinutesAllTime = Array.from(allTimeThreads.values()).reduce(
      (a, b) =>
        a + Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
      0,
    ) / threadCountAllTime;
    const threadAvgMinutesInRange = days.reduce(
      (a, b) =>
        a + Array.from(b.threads.values()).reduce(
          (a, b) =>
            a +
            Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
          0,
        ),
      0,
    ) / threadCountInRange;
    summary.set("threadAvgMinutes", [
      "Average thread duration",
      threadAvgMinutesInRange,
      threadAvgMinutesAllTime,
    ]);

    const threadMaxMinutesAllTime = Array.from(allTimeThreads.values()).reduce(
      (a, b) =>
        Math.max(
          a,
          Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
        ),
      0,
    );
    const threadMaxMinutesInRange = days.reduce(
      (a, b) =>
        Math.max(
          a,
          Array.from(b.threads.values()).reduce((a, b) =>
            Math.max(
              a,
              Math.ceil((b.firstTs.getTime() - b.lastTs.getTime()) / 3_600_000),
            ), 0),
        ),
      0,
    );
    summary.set("threadMaxMinutes", [
      "Maximum thread duration",
      threadMaxMinutesInRange,
      threadMaxMinutesAllTime,
    ]);

    const reactionsAllTime = Array.from(allTimeReactions.values()).reduce(
      (a, b) => a + b.total,
      0,
    );
    const reactionsInRange = days.reduce(
      (a, b) =>
        a + Array.from(b.reactions.values()).reduce((a, b) => a + b.total, 0),
      0,
    );

    summary.set("reactions", [
      "Total reactions",
      reactionsInRange,
      reactionsAllTime,
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
    extendedStats: ChannelData,
  ): Array<Activity> {
    const activity: Array<Activity> = [];

    const daysToSubtract = (52 * 7) + (new Date().getUTCDay());
    const activityRangeFrom = new Date(
      new Date().getTime() - (daysToSubtract * 24 * 60 * 60 * 1000),
    );

    const params: ChannelDataParams = {
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
        () => new ChannelStats(extendedStats.channelId),
      );

      const currentValue = [
        Array.from(resource.messages.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
        Array.from(resource.reactions.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
        Array.from(resource.threads.values()).reduce(
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
          resource.messages.size, // n-users
          1, // in 1-channels
          0, // there is no incidents yet, - TODO based on emoji, after full rewrite of wwown
        ],
      );
    }

    return activity;
  }

  static getTopAllTimeNChannels(
    extendedStats: ChannelData,
    params: ChannelDataParams,
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
    extendedStats: ChannelData,
    params: ChannelDataParams,
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
    extendedStats: ChannelData,
    params: ChannelDataParams,
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
    extendedStats: ChannelData,
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
    extended: ChannelData,
    params: ChannelDataParams,
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
    extended: ChannelData,
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
    extendedStats: ChannelData,
    params: ChannelDataParams,
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
    extendedStats: ChannelData,
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

  static getReactionsAllTime(
    extendedStats: ChannelData,
    params: ChannelDataParams,
  ) {
    const reactions: SerializableMap<string, [Emoji, Total]> =
      new SerializableMap();

    for (
      let [emoji, value] of extendedStats.allTime.reactions.entries()
    ) {
      emoji = normalizeEmoji(emoji);
      const item = reactions.getOrSet(
        emoji,
        () => [emoji, 0],
      );
      item[1] += value.total;
      reactions.set(emoji, item);
    }

    return Array.from(reactions.values()).sort((a, b) => b[1] - a[1]).slice(
      0,
      params.lastItems,
    );
  }

  static getReactionsAllTimeMinMax(
    extendedStats: ChannelData,
  ): [Min, Max] {
    const values = [];

    for (const [_, value] of extendedStats.allTime.reactions.entries()) {
      values.push(value.total);
    }

    return [
      Math.min(...values),
      Math.max(...values),
    ];
  }

  static getReactionsInRange(
    extendedStats: ChannelData,
    params: ChannelDataParams,
  ) {
    const reactions: SerializableMap<string, [Emoji, Total]> =
      new SerializableMap();

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (let [emoji, value] of dayAggregate.reactions.entries()) {
        emoji = normalizeEmoji(emoji);
        const item = reactions.getOrSet(
          emoji,
          () => [emoji, 0],
        );
        item[1] += value.total;
        reactions.set(emoji, item);
      }
    }

    return Array.from(reactions.values()).sort((a, b) => b[1] - a[1]).slice(
      0,
      params.lastItems,
    );
  }

  static getReactionsInRangeMinMax(
    extendedStats: ChannelData,
    params: ChannelDataParams,
  ): [Min, Max] {
    const values: number[] = [];

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const [_, emojiStas] of dayAggregate.reactions) {
        values.push(emojiStas.total);
      }
    }

    return [
      Math.min(...values),
      Math.max(...values),
    ];
  }
}
