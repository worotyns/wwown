import { generateDayRawRange } from "../../common/date_time.ts";
import { DateWithoutTimeRaw, SlackChannelId } from "../../common/interfaces.ts";
import { SerializableMap } from "../../common/serializable_map.ts";
import { ChannelStats } from "./channel_stats.ts";

export interface ChannelDataParams {
  lastItems: number;
  from: Date;
  to: Date;
}

export class ChannelData {
  constructor(
    public readonly channelId: SlackChannelId,
    public readonly allTime: ChannelStats,
    public readonly days: SerializableMap<DateWithoutTimeRaw, ChannelStats>,
  ) {}

  public getDayAggregatesForRange(
    params: ChannelDataParams,
  ): Array<ChannelStats> {
    const range = generateDayRawRange(params.from, params.to);

    return range.map((day) =>
      this.days.getOrMock(day, () => new ChannelStats(this.channelId))
    );
  }
}
