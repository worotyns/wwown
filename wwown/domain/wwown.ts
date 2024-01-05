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
import { DayRaw } from "./common/date_time.ts";
import { UserStats } from "./stats/user/user_stats.ts";
import { UserData } from "./stats/user/user_data.ts";
import { ChannelStats } from "./stats/channel/channel_stats.ts";
import { ChannelData } from "./stats/channel/channel_data.ts";
import { DashboardData } from "./stats/dashboard_data.ts";

/**
 * Main entry point for the application.
 */
export class WhoWorksOnWhatNow extends Atom<WhoWorksOnWhatNow> {
  /**
   * Identity determine file name on disk
   * and is used to identify the application state.
   */
  public readonly identity = "wwown_prod";

  /**
   * @deprecated - used only once for initialize old sqldata data
   */
  public migrate(event: Events) {
    switch (event.type) {
      case "reaction":
        this.resources.touch(event);
        this.getDayAggregate(event.meta.timestamp).register(event);

        this.channels.getOrSet(
          event.meta.channelId,
          () => new ChannelStats(event.meta.channelId),
        ).register(event);

        // Bidirectional registration for user, and receiver
        this.users.getOrSet(
          event.meta.userId,
          () => new UserStats(event.meta.userId),
        ).register(event);

        if (event.meta.itemUserId) {
          this.users.getOrSet(
            event.meta.itemUserId,
            () => new UserStats(event.meta.itemUserId!),
          ).register(event);
        }
        break;
      case "thread":
      case "message":
      case "hourly":
        this.resources.touch(event);
        this.getDayAggregate(event.meta.timestamp).migrate(event);
        this.users.getOrSet(
          event.meta.userId,
          () => new UserStats(event.meta.userId),
        ).migrate(event);
        this.channels.getOrSet(
          event.meta.channelId,
          () => new ChannelStats(event.meta.channelId),
        ).migrate(event);
        break;
      case "user":
      case "channel":
        this.resources.register(event);
        break;
    }
  }

  public register(event: Events) {
    switch (event.type) {
      case "reaction":
        this.resources.touch(event);
        this.getDayAggregate(event.meta.timestamp).register(event);
        // Bidirectional registration for user, and receiver
        this.users.getOrSet(
          event.meta.userId,
          () => new UserStats(event.meta.userId),
        ).register(event);
        if (event.meta.itemUserId) {
          this.users.getOrSet(
            event.meta.itemUserId,
            () => new UserStats(event.meta.itemUserId!),
          ).register(event);
        }
        break;
      case "thread":
      case "message":
        this.resources.touch(event);
        this.getDayAggregate(event.meta.timestamp).register(event);
        this.users.getOrSet(
          event.meta.userId,
          () => new UserStats(event.meta.userId),
        ).register(event);
        this.channels.getOrSet(
          event.meta.channelId,
          () => new ChannelStats(event.meta.channelId),
        ).register(event);
        break;
      case "user":
      case "channel":
        this.resources.register(event);
        break;
    }
  }

  public getDashboardData() {
    return new DashboardData(
      new SerializableMap(
        Array.from(this.days)
      ),
    );
  }

  public getChannelData(
    channelId: SlackChannelId,
  ): ChannelData {
    const days: SerializableMap<DateWithoutTimeRaw, ChannelStats> =
      new SerializableMap();

    for (const [day, dayAggregate] of this.days.entries()) {
      days.set(
        day,
        dayAggregate.channels.getOrMock(
          channelId,
          () => new ChannelStats(channelId),
        ),
      );
    }

    return new ChannelData(
      channelId,
      this.channels.getOrMock(
        channelId,
        () => new ChannelStats(channelId),
      ),
      days,
    );
  }

  public getUserData(
    userId: SlackUserId,
  ): UserData {
    const days: SerializableMap<DateWithoutTimeRaw, UserStats> =
      new SerializableMap();

    for (const [day, dayAggregate] of this.days.entries()) {
      days.set(
        day,
        dayAggregate.users.getOrMock(
          userId,
          () => new UserStats(userId),
        ),
      );
    }

    return new UserData(
      userId,
      this.users.getOrMock(
        userId,
        () => new UserStats(userId),
      ),
      days,
    );
  }

  /**
   * Contains information about resources (channels, users).
   */
  public readonly resources: Resources = new Resources();

  /**
   * This is aggregated data for all-time-period with one channel -> user granularity.
   */
  public readonly channels: SerializableMap<SlackChannelId, ChannelStats> =
    new SerializableMap();

  /**
   * This is aggregated data for all-time-period with one user -> channel granularity.
   */
  public readonly users: SerializableMap<SlackUserId, UserStats> =
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

  static deserializeUserStatsWithKeyAsSerializedMap<T>(
    json: PropertiesOnly<SerializableMap<T, UserStats>>,
  ): SerializableMap<T, UserStats> {
    return new SerializableMap(
      (json as unknown as Array<[T, UserStats]>)
        .map((
          item,
        ) => [
          item[0],
          UserStats.deserialize(item[1]),
        ]),
    );
  }

  static deserializeChannelStatsWithKeyAsSerializedMap<T>(
    json: PropertiesOnly<SerializableMap<T, ChannelStats>>,
  ): SerializableMap<T, ChannelStats> {
    return new SerializableMap(
      (json as unknown as Array<[T, ChannelStats]>)
        .map((
          item,
        ) => [
          item[0],
          ChannelStats.deserialize(item[1]),
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
        .deserializeChannelStatsWithKeyAsSerializedMap(
          value.channels,
        ),
      users: WhoWorksOnWhatNow.deserializeUserStatsWithKeyAsSerializedMap(
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
