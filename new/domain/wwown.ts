import { Atom, PropertiesOnly } from "@worotyns/atoms";
import { Resources } from "./resources.ts";
import {
  DateWithoutTimeRaw,
  Events,
  SlackChannelId,
  SlackUserId,
} from "./common/interfaces.ts";
import { DayAggregate } from "./stats/day_aggregate.ts";
import { SerializableMap } from "./common/serializable_map.ts";
import { DayRaw, generateDayRawRange } from "./common/date_time.ts";
import { ResourceStats } from "./stats/resource_stats.ts";
import { ExtendedResourceStats } from "../application/interfaces.ts";

/**
 * Main entry point for the application.
 */
export class WhoWorksOnWhatNow extends Atom<WhoWorksOnWhatNow> {
  /**
   * Identity determine file name on disk
   * and is used to identify the application state.
   */
  public readonly identity = "wwown_production";

  public register(event: Events) {
    switch (event.type) {
      case "thread":
      case "reaction":
      case "message":
        this.getDayAggregate(event.meta.timestamp).register(event);
        this.channels.getOrSet(
          event.meta.channelId,
          () => new ResourceStats(event.meta.channelId),
        ).register(event);
        this.users.getOrSet(
          event.meta.userId,
          () => new ResourceStats(event.meta.userId),
        ).register(event);
        break;
      case "user":
      case "channel":
        this.resources.register(event);
        break;
    }
  }

  protected getDayAggregatesForRange(
    from: Date,
    to: Date,
  ): Array<DayAggregate> {
    const range = generateDayRawRange(from, to);
    return range.map((day) =>
      this.days.getOrSet(day, () => DayAggregate.createForDay(new Date(day)))
    );
  }

  public getChannelDataForRange(
    channelId: SlackChannelId,
    from: Date,
    to: Date,
  ): ExtendedResourceStats {
    const dayAggregates = this.getDayAggregatesForRange(from, to);
    const range = dayAggregates.map((dayAggregate) =>
      dayAggregate.channels.getOrSet(
        channelId,
        () => new ResourceStats(channelId),
      )
    );
    return {
      resource: channelId,
      allTime: this.channels.getOrSet(
        channelId,
        () => new ResourceStats(channelId),
      ),
      range,
    };
  }

  public getUserDataForRange(
    userId: SlackUserId,
    from: Date,
    to: Date,
  ): ExtendedResourceStats {
    const dayAggregates = this.getDayAggregatesForRange(from, to);
    const range = dayAggregates.map((dayAggregate) =>
      dayAggregate.users.getOrSet(userId, () => new ResourceStats(userId))
    );
    return {
      resource: userId,
      allTime: this.users.getOrSet(userId, () => new ResourceStats(userId)),
      range,
    };
  }

  /**
   * Contains information about resources (channels, users).
   */
  public readonly resources: Resources = new Resources();

  /**
   * This is aggregated data for all-time-period with one channel -> user granularity.
   */
  public readonly channels: SerializableMap<SlackUserId, ResourceStats> =
    new SerializableMap();

  /**
   * This is aggregated data for all-time-period with one user -> channel granularity.
   */
  public readonly users: SerializableMap<SlackChannelId, ResourceStats> =
    new SerializableMap();

  /**
   * Contains information about each day of activity with detailed information.
   * This is aggregated data for user, and channel with one day granularity.
   */
  public readonly days: SerializableMap<DateWithoutTimeRaw, DayAggregate> =
    new SerializableMap();

  private getDayAggregate(day: Date) {
    return this.days.getOrSet(
      DayRaw(day),
      () => DayAggregate.createForDay(day),
    );
  }

  static deserializeResourceStatsWithKeyAsSerializedMap<T>(
    json: PropertiesOnly<SerializableMap<T, ResourceStats>>,
  ): SerializableMap<T, ResourceStats> {
    return new SerializableMap(
      (json as unknown as Array<[T, ResourceStats]>)
        .map((
          item,
        ) => [
          item[0],
          ResourceStats.deserialize(item[1]),
        ]),
    );
  }

  static deserialize(
    value: PropertiesOnly<WhoWorksOnWhatNow>,
  ): WhoWorksOnWhatNow {
    return Object.assign(new WhoWorksOnWhatNow(), {
      ...value,
      resources: Resources.deserialize(value.resources),
      channels: WhoWorksOnWhatNow
        .deserializeResourceStatsWithKeyAsSerializedMap(
          value.channels,
        ),
      users: WhoWorksOnWhatNow.deserializeResourceStatsWithKeyAsSerializedMap(
        value.users,
      ),
      days: new SerializableMap(
        (value.days as unknown as Array<[DateWithoutTimeRaw, DayAggregate]>)
          .map(
            (item) => [item[0], DayAggregate.deserialize(item[1])],
          ),
      ),
    });
  }
}
