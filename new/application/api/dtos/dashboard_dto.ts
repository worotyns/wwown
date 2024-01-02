import { generateDayRawRange } from "../../../domain/common/date_time.ts";
import {
  SlackChannelId,
  SlackChannelName,
  SlackUserId,
  SlackUserName,
} from "../../../domain/common/interfaces.ts";
import { SerializableMap } from "../../../domain/common/serializable_map.ts";
import { Resources } from "../../../domain/resources.ts";
import {
  DashboardData,
  DashboardDataParams,
} from "../../../domain/stats/dashboard_data.ts";
import { DayAggregate } from "../../../domain/stats/day_aggregate.ts";
import { Activity, ScoreOpacity } from "../../interfaces.ts";
import { normalizeValue } from "./utils.ts";

export class DashboardViewDto {
  /**
   * All time activity
   */
  public activityAllTime: Activity[];

  /**
   * Who works on what and where
   */
  public wwown: Array<[SlackChannelId, [SlackUserId, ScoreOpacity][]]>;

  constructor(
    days: DashboardData,
    params: DashboardDataParams,
  ) {
    this.activityAllTime = DashboardViewDto.getActivity(days);
    this.wwown = DashboardViewDto.getWwown(days, params);
  }

  static getWwown(
    extendedStats: DashboardData,
    params: DashboardDataParams,
  ): Array<[SlackChannelId, [SlackUserId, ScoreOpacity][]]> {
    const wwown: SerializableMap<
      SlackChannelId,
      SerializableMap<SlackUserId, ScoreOpacity>
    > = new SerializableMap();
    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const [channelId, channel] of dayAggregate.channels.entries()) {
        for (const [userId, user] of channel.messages.entries()) {
          const channelItem = wwown.getOrSet(
            channelId,
            () => new SerializableMap(),
          );
          
          const normalizeTs = (ts: Date) => normalizeValue(ts.getTime(), params.from.getTime(), params.to.getTime(), 0, 1);

          const lastTs = channelItem.getOrSet(
            userId,
            () => normalizeTs(user.lastTs)
          );

          const normalized = normalizeTs(user.lastTs);

          if (lastTs < normalized) {
            channelItem.set(userId, normalized);
          }

          wwown.set(channelId, channelItem)
        }
      }
    }

    return Array.from(wwown).map(([channelId, channel]) => [
      channelId,
      Array.from(channel).map(([userId, lastTs]) => [userId, lastTs]).sort(
        (a, b) => (b[1] as number) - (a[1] as number),
      ) as [SlackUserId, ScoreOpacity][],
    ]).sort((a: any, b: any) => b[1].reduce((sum: number, item: [SlackUserId, ScoreOpacity]) => sum+item[1], 0) - a[1].reduce((sum: number, item: [SlackUserId, ScoreOpacity]) => sum+item[1], 0)) as Array<[SlackChannelId, [SlackUserId, ScoreOpacity][]]>;
  }

  static getActivity(
    extendedStats: DashboardData,
  ): Array<Activity> {
    const activity: Array<Activity> = [];

    const daysToSubtract = (52 * 7) + (new Date().getUTCDay());
    const activityRangeFrom = new Date(
      new Date().getTime() - (daysToSubtract * 24 * 60 * 60 * 1000),
    );

    const params: DashboardDataParams = {
      from: activityRangeFrom,
      to: new Date(),
      lastItems: Infinity,
    };

    const daysMaxes: number[] = [];

    for (const dayAggregate of extendedStats.getDayAggregatesForRange(params)) {
      for (const [_, channel] of dayAggregate.channels.entries()) {
        const values: number[] = [];
        for (const [_, channelStats] of channel.messages.entries()) {
          values.push(channelStats.total);
        }
        daysMaxes.push(values.reduce((a, b) => a + b, 0));
      }
    }

    const max = Math.max(...daysMaxes);

    for (const day of generateDayRawRange(params.from, params.to)) {
      const uniqueUsers: Set<SlackUserId> = new Set();
      const uniqueChannels: Set<SlackChannelId> = new Set();

      const values: number[] = [];

      for (
        const [channelId, channel] of extendedStats.days.getOrSet(
          day,
          () => new DayAggregate(),
        ).channels.entries()
      ) {
        uniqueChannels.add(channelId);
        for (const [userId, user] of channel.messages.entries()) {
          uniqueUsers.add(userId);
          values.push(user.total);
        }
      }

      const sum = values.reduce((a, b) => a + b, 0);

      activity.push(
        [
          day,
          normalizeValue(
            sum,
            0,
            max,
            sum > 0 ? 0.15 : 0.05,
            1,
          ),
          sum,
          uniqueUsers.size, // n-users
          uniqueChannels.size, // in 1-channels
          0, // there is no incidents yet, - TODO based on emoji, after full rewrite of wwown
        ],
      );
    }

    return activity;
  }
}
