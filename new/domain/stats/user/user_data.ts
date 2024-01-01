import { generateDayRawRange } from "../../common/date_time.ts";
import { DateWithoutTimeRaw, SlackUserId } from "../../common/interfaces.ts";
import { SerializableMap } from "../../common/serializable_map.ts";
import { UserStats } from "./user_stats.ts";

export interface UserDataParams {
  lastItems: number;
  from: Date;
  to: Date;
}

export class UserData {
  constructor(
    public readonly userId: SlackUserId,
    public readonly allTime: UserStats,
    public readonly days: SerializableMap<DateWithoutTimeRaw, UserStats>,
  ) {}

  public getDayAggregatesForRange(
    params: UserDataParams,
  ): Array<UserStats> {
    const range = generateDayRawRange(params.from, params.to);

    return range.map((day) =>
      this.days.getOrSet(day, () => new UserStats(this.userId))
    );
  }
}
