import { Percent, SlackChannelId, SlackUserId, TwoDigitHour } from "../domain/common/interfaces.ts";
import { ResourceStats } from "../domain/stats/resource_stats.ts";

export interface ExtendedResourceStats {
  resource: SlackChannelId | SlackUserId;
  allTime: ResourceStats;
  range: Array<ResourceStats>;
}

export type HourPercentDistribution = [TwoDigitHour, Percent];
