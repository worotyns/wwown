import {
  Emoji,
  Max,
  Min,
  SlackChannelId,
  SlackChannelName,
  SlackUserId,
  SlackUserName,
  Percent,
  Total,
  TwoDigitHour,
} from "../../../domain/common/interfaces.ts";
import { Resources } from "../../../domain/resources.ts";
import {
  UserData, UserDataParams,
} from "../../../domain/stats/user/user_data.ts";
import {
  Activity,
  Given,
  HourPercentDistribution,
  LastChannels,
  Received,
  TopChannels,
} from "../../interfaces.ts";
import { generateDayRawRange } from "../../../domain/common/date_time.ts";
import { SerializableMap } from "../../../domain/common/serializable_map.ts";
import { BasicStats } from "../../../domain/stats/common/basic_stats.ts";
import {
  UserStats,
} from "../../../domain/stats/user/user_stats.ts";

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

  public resources: Array<
    [SlackChannelId | SlackUserId, SlackChannelName | SlackUserName]
  >;

  constructor(
    extendedStats: UserData,
    // A moze tutaj dorzucic parametry pobierania? np. lastItems: number, czy activityRange i dataRange - rozdziclic
    // Extended stats mozna zrobic class i dac jej metody z range - to by bylo najsensowniejsze ;D
    params: UserDataParams,
    resources: Resources,
  ) {
    this.resources = [
      ...resources.getChannels(),
      ...resources.getUsers(),
    ];

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
  }

  static normalizeValue(
    originalValue: number,
    minValue: number,
    maxValue: number,
    newMin: number,
    newMax: number,
  ) {
    return ((originalValue - minValue) / (maxValue - minValue)) *
        (newMax - newMin) + newMin;
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
          currentValue > 0
            ? `rgb(39, 90, ${
              Math.floor(
                UserViewDto.normalizeValue(
                  currentValue,
                  0,
                  max,
                  100,
                  255,
                ),
              )
            })`
            : "rgb(211, 211, 211)",
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

  static getReactionsAllTime(extendedStats: UserData) {
    const reactions: SerializableMap<string, [Emoji, Given, Received]> =
      new SerializableMap();

    for (
      let [emoji, value] of extendedStats.allTime.reactions.given.entries()
    ) {
      emoji = UserViewDto.normalizeEmoji(emoji);
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
      emoji = UserViewDto.normalizeEmoji(emoji);
      const item = reactions.getOrSet(
        emoji,
        () => [emoji, 0, 0],
      );
      item[2] += value.total;
      reactions.set(emoji, item);
    }

    return Array.from(reactions.values()).sort((a, b) => b[1] - a[1]);
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

  static normalizeEmoji(
    emoji: Emoji,
  ): Emoji {
    const skinToneRegex = /::skin-tone-[2-6]|::skin-tone-:d:[2-6]/g;
    return emoji.replace(skinToneRegex, "");
  }

  static getReactionsInRange(
    extendedStats: UserData,
    params: UserDataParams,
  ) {
    const reactions: SerializableMap<string, [Emoji, Given, Received]> =
      new SerializableMap();

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (let [emoji, value] of dayAggregate.reactions.given.entries()) {
        emoji = UserViewDto.normalizeEmoji(emoji);
        const item = reactions.getOrSet(
          emoji,
          () => [emoji, 0, 0],
        );
        item[1] += value.total;
        reactions.set(emoji, item);
      }

      for (let [emoji, value] of dayAggregate.reactions.received.entries()) {
        emoji = UserViewDto.normalizeEmoji(emoji);
        const item = reactions.getOrSet(
          emoji,
          () => [emoji, 0, 0],
        );
        item[2] += value.total;
        reactions.set(emoji, item);
      }
    }

    return Array.from(reactions.values()).sort((a, b) => b[1] - a[1]);
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
