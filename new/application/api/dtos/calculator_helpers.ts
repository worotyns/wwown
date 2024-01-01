import {
  Activity,
  HourPercentDistribution,
  LastChannels,
} from "../../interfaces.ts";
import { generateDayRawRange } from "../../../domain/common/date_time.ts";
import {
  Max,
  Min,
  Percent,
  SlackChannelId,
  Total,
  TwoDigitHour,
} from "../../../domain/common/interfaces.ts";
import { SerializableMap } from "../../../domain/common/serializable_map.ts";
import { BasicStats } from "../../../domain/stats/basic_stats.ts";
import {
  ConcreteResourceData,
  ConcreteResourceDataParams,
} from "../../../domain/stats/concrete_resource_data.ts";
import { ResourceStats, ResourceType } from "../../../domain/stats/resource_stats.ts";

export class CalculationHelpers {

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

  static getActivity(
    extendedStats: ConcreteResourceData,
  ): Array<Activity> {

    const activity: Array<Activity> = [];

    const daysToSubtract = (52 * 7) + (new Date().getUTCDay());
    const activityRangeFrom = new Date(
      new Date().getTime() - (daysToSubtract * 24 * 60 * 60 * 1000),
    );

    const params: ConcreteResourceDataParams = {
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
        () => new ResourceStats(ResourceType.read),
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
                CalculationHelpers.normalizeValue(currentValue, 0, max, 100, 255),
              )
            })`
            : "rgb(211, 211, 211)",
          currentValue,
          extendedStats.resourceType === ResourceType.user
            ? 1
            : resource.messages.size,
          extendedStats.resourceType === ResourceType.channel
            ? 1
            : resource.messages.size,
          0, // there is no incidents yet, - TODO based on emoji, after full rewrite of wwown
        ],
      );
    }

    return activity;
  }

  static getTopAllTimeNChannels(
    extendedStats: ConcreteResourceData,
    params: ConcreteResourceDataParams,
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
    extendedStats: ConcreteResourceData,
    params: ConcreteResourceDataParams,
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
    extendedStats: ConcreteResourceData,
    params: ConcreteResourceDataParams,
  ): [Min, Max, Min, Max] {
    const values = [];
    const ts = [];

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const [_, value] of dayAggregate.messages.entries()) {
        values.push(value.total);
        ts.push(value.lastTs.getTime());
      }
    }

    return [Math.min(...values), Math.max(...values), Math.min(...ts), Math.max(...ts)];
  }

  static calculateMinMaxInteractionsInAllChannels(
    extendedStats: ConcreteResourceData,
  ): [Min, Max, Min, Max] {
    const values = [];
    const ts = [];

    for (const [_, value] of extendedStats.allTime.messages.entries()) {
      values.push(value.total);
      ts.push(value.lastTs.getTime());
    }

    return [Math.min(...values), Math.max(...values), Math.min(...ts), Math.max(...ts)];
  }

  static calculateMinMaxAndSumOfHourlyInteractionsDistributionInRange(
    extended: ConcreteResourceData,
    params: ConcreteResourceDataParams,
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
    extended: ConcreteResourceData,
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
    extendedStats: ConcreteResourceData,
    params: ConcreteResourceDataParams,
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
    extendedStats: ConcreteResourceData,
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
}
