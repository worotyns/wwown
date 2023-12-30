import {
  ExtendedResourceStats,
  HourPercentDistribution,
} from "../application/interfaces.ts";
import { Max, Min, Percent, Total, TwoDigitHour } from "./common/interfaces.ts";
import { SerializableMap } from "./common/serializable_map.ts";

export class CalculationHelpers {
  static calculateMinMaxAndSumOfHourlyInteractionsDistributionInRange(
    extended: ExtendedResourceStats,
  ): [Min, Max, Total] {
    const values = [];
    for (const dayAggregate of extended.range) {
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

  static calculateInteractionsDistribution(
    channelExtendedstats: ExtendedResourceStats,
  ): Array<HourPercentDistribution> {
    const [_min, _max, sum] = this
      .calculateMinMaxAndSumOfHourlyInteractionsDistributionInRange(
        channelExtendedstats,
      );

    const distribution: SerializableMap<TwoDigitHour, Percent> = new SerializableMap();

    for (const dayAggregate of channelExtendedstats.range) {
      for (const [hour, value] of dayAggregate.hourly.entries()) {
        const current = (distribution.get(hour) || 0)
        const percent = value.total / sum;
        distribution.set(hour, current + percent);
      }
    }

    return distribution.toJSON();
  }
}
