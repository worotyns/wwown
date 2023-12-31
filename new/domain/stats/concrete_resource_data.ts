import { generateDayRawRange } from "../common/date_time.ts";
import {
  DateWithoutTimeRaw,
  SlackChannelId,
  SlackUserId,
} from "../common/interfaces.ts";
import { SerializableMap } from "../common/serializable_map.ts";
import { ResourceStats, ResourceType } from "./resource_stats.ts";

export interface ConcreteResourceDataParams {
  lastItems: number;
  from: Date;
  to: Date;
}

export class ConcreteResourceData {
  constructor(
    public readonly resourceType: ResourceType,
    public readonly resource: SlackChannelId | SlackUserId,
    public readonly allTime: ResourceStats,
    public readonly days: SerializableMap<DateWithoutTimeRaw, ResourceStats>,
  ) {}

  public getDayAggregatesForRange(
    params: ConcreteResourceDataParams,
  ): Array<ResourceStats> {
    const range = generateDayRawRange(params.from, params.to);

    return range.map((day) =>
      this.days.getOrSet(day, () => new ResourceStats(this.resourceType))
    );
  }
}
