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
import { ResourceStats, ResourceType } from "./stats/resource_stats.ts";
import { ConcreteResourceData } from "./stats/concrete_resource_data.ts";

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
      case "thread":
      case "reaction":
      case "message":
      case "hourly":  
        this.getDayAggregate(event.meta.timestamp).migrate(event);
        this.users.getOrSet(
          event.meta.userId,
          () => new ResourceStats(ResourceType.user),
        ).migrate(event);
        this.channels.getOrSet(
          event.meta.channelId,
          () => new ResourceStats(ResourceType.channel),
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
      case "thread":
      case "reaction":
      case "message":
        this.getDayAggregate(event.meta.timestamp).register(event);
        this.users.getOrSet(
          event.meta.userId,
          () => new ResourceStats(ResourceType.user),
        ).register(event);
        this.channels.getOrSet(
          event.meta.channelId,
          () => new ResourceStats(ResourceType.channel),
        ).register(event);
        break;
      case "user":
      case "channel":
        this.resources.register(event);
        break;
    }
  }

  public getChannelData(
    channelId: SlackChannelId,
  ): ConcreteResourceData {
    const days: SerializableMap<DateWithoutTimeRaw, ResourceStats> = new SerializableMap();

    for (const [day, dayAggregate] of this.days.entries()) {
      days.set(
        day,
        dayAggregate.channels.getOrSet(
          channelId,
          () => new ResourceStats(ResourceType.channel),
        ),
      );
    }

    return new ConcreteResourceData(
      ResourceType.channel,
      channelId,
      this.channels.getOrSet(
        channelId,
        () => new ResourceStats(ResourceType.channel),
      ),
      days,
    );
  }

  public getUserData(
    userId: SlackUserId,
  ): ConcreteResourceData {
    const days: SerializableMap<DateWithoutTimeRaw, ResourceStats> = new SerializableMap();

    for (const [day, dayAggregate] of this.days.entries()) {
      days.set(
        day,
        dayAggregate.users.getOrSet(
          userId,
          () => new ResourceStats(ResourceType.channel),
        ),
      );
    }

    return new ConcreteResourceData(
      ResourceType.user,
      userId,
      this.users.getOrSet(
        userId,
        () => new ResourceStats(ResourceType.user),
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
