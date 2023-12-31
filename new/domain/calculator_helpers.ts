import {
  Activity,
  HourPercentDistribution,
  LastChannels,
} from "../application/interfaces.ts";
import {
  Max,
  Min,
  Percent,
  SlackChannelId,
  Total,
  TwoDigitHour,
} from "./common/interfaces.ts";
import { SerializableMap } from "./common/serializable_map.ts";
import { ConcreteResourceData, ConcreteResourceDataParams } from "./stats/concrete_resource_data.ts";
import { ResourceType } from "./stats/resource_stats.ts";

export class CalculationHelpers {

  static normalizeValue(originalValue: number, minValue: number, maxValue: number, newMin: number, newMax: number) {
    return ((originalValue - minValue) / (maxValue - minValue)) * (newMax - newMin) + newMin;
  }

  static getActivity(extendedStats: ConcreteResourceData): Array<Activity> {
    
    const activity: Array<Activity> = [];

    const [_min, max, _sum] = this
      .calculateMinMaxAndSumOfHourlyInteractionsDistributionAllTime(
        extendedStats
      );

    for (const [day, resource] of extendedStats.days.entries()) {
      const currentValue = Array.from(resource.messages.values()).reduce((a, b) => a + b.total, 0);
      activity.push(
        [
          day,
          (currentValue > 0 ? `rgb(0, ${Math.floor(CalculationHelpers.normalizeValue(currentValue, 0, max, 0, 155)) + 100}, 0)` : 'rgb(211, 211, 211)'),
          currentValue,
          extendedStats.resourceType === ResourceType.user ? 1 : resource.messages.size,
          extendedStats.resourceType === ResourceType.channel ? 1 : resource.messages.size,
          0 // there is no incidents yet, - TODO based on emoji, after full rewrite of wwown
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
        () => [channelId, total, lastTs.getTime()],
      );
      item[1] += total;
      item[2] = Math.min(item[2], lastTs.getTime());
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
          () => [channelId, total, lastTs.getTime()],
        );
        item[1] += total;
        item[2] = Math.min(item[2], lastTs.getTime());
        lastChannels.set(channelId, item);
      }
    }

    return Array.from(lastChannels.values()).sort((a, b) => b[1] - a[1]).slice(
      0,
      params.lastItems,
    );
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
        params
      );

    const distribution: SerializableMap<TwoDigitHour, Percent> =
      new SerializableMap();

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const [hour, value] of dayAggregate.hourly.entries()) {
        const current = distribution.get(hour) || 0;
        const percent = value.total / sum;
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

    for (const [hour, value] of extendedStats.allTime.hourly.entries()) {
      const current = distribution.get(hour) || 0;
      const percent = value.total / sum;
      distribution.set(hour, current + percent);
    }

    return distribution.toJSON();
  }
}
