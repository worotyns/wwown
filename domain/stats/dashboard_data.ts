import { generateDayRawRange } from "../common/date_time.ts";
import { DateWithoutTimeRaw, LastActivityAt, SlackChannelId, SlackUserId } from "../common/interfaces.ts";
import { SerializableMap } from "../common/serializable_map.ts";
import { ChannelStats } from "./channel/channel_stats.ts";
import { DayAggregate } from "./day_aggregate.ts";
import { UserStats } from "./user/user_stats.ts";

export interface DashboardDataParams {
  lastItems: number;
  from: Date;
  to: Date;
}

export class DashboardData {
  constructor(
    public readonly channelUsers: SerializableMap<SlackChannelId, SerializableMap<SlackUserId, LastActivityAt>>,
    public readonly days: SerializableMap<DateWithoutTimeRaw, DayAggregate>,
  ) {}

  public getDayAggregatesForRange(
    params: DashboardDataParams,
  ): Array<DayAggregate> {
    const range = generateDayRawRange(params.from, params.to);

    return range.map((day) =>
      this.days.getOrMock(day, () => DayAggregate.createForDay(new Date(day)))
    );
  }
}
