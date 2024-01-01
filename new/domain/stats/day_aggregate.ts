import { Atom, PropertiesOnly } from "@worotyns/atoms";
import {
  InteractionEvents,
  MigrationEvents,
  SlackUserId,
} from "../common/interfaces.ts";
import { SlackChannelId } from "../common/interfaces.ts";
import { DateWithoutTime } from "../common/interfaces.ts";
import { SerializableMap } from "../common/serializable_map.ts";
import { DayRaw } from "../common/date_time.ts";
import { UserStats } from "./user/user_stats.ts";
import { Events } from "../common/interfaces.ts";
import { ChannelStats } from "./channel_stats.ts";

/**
 * Contains all statistics need to be calculated for a given day.
 */
export class DayAggregate extends Atom<DayAggregate> {
  public identity = DayAggregate.createIdentifier(new Date());

  public users: SerializableMap<SlackUserId, UserStats> =
    new SerializableMap();

  public channels: SerializableMap<SlackChannelId, ChannelStats> =
    new SerializableMap();

  public migrate(
    event: MigrationEvents,
  ) {
    switch (event.type) {
      case "reaction":
        // this.channels.getOrSet(
        //   event.meta.channelId,
        //   () => new UserStats(event.meta.channelId),
        // ).register(event);

        // Two dimensional stats - bidirection registration for user, and receiver
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
        // this.channels.getOrSet(
        //   event.meta.channelId,
        //   () => new UserStats(event.meta.channelId),
        // ).migrate(event);
        this.users.getOrSet(
          event.meta.userId,
          () => new UserStats(event.meta.userId),
        ).migrate(event);
        break;
      default:
        throw new Error(`Unknown event type: ${(event as Events).type}`);
    }
  }

  public register(
    event: InteractionEvents,
  ) {
    switch (event.type) {
      case "reaction":
        // this.channels.getOrSet(
        //   event.meta.channelId,
        //   () => new UserStats(event.meta.channelId),
        // ).register(event);

        // Two dimensional stats - bidirection registration for user, and receiver
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
        // One dimensional stats
        // this.channels.getOrSet(
        //   event.meta.channelId,
        //   () => new UserStats(event.meta.channelId),
        // ).register(event);

        this.users.getOrSet(
          event.meta.userId,
          () => new UserStats(event.meta.userId),
        ).register(event);

        break;
      default:
        throw new Error(`Unknown event type: ${(event as Events).type}`);
    }
  }

  static createIdentifier(day: DateWithoutTime) {
    return `day_aggregator_${DayRaw(day)}`;
  }

  static createForDay(day: DateWithoutTime) {
    return Object.assign(
      new DayAggregate(),
      {
        identity: DayAggregate.createIdentifier(day),
      },
    );
  }

  static deserializeUserStatsWithKeyAsSerializedMap<T>(
    json: PropertiesOnly<SerializableMap<T, UserStats>>,
  ): SerializableMap<T, UserStats> {
    return new SerializableMap(
      (json as unknown as Array<[T, UserStats]>)
        .map((item) => [item[0], UserStats.deserialize(item[1])]),
    );
  }

  static deserialize(json: PropertiesOnly<DayAggregate>): DayAggregate {
    return Object.assign(new DayAggregate(), {
      ...json,
      users: DayAggregate.deserializeUserStatsWithKeyAsSerializedMap(
        json.users,
      ),
      channels: DayAggregate.deserializeUserStatsWithKeyAsSerializedMap(
        json.channels,
      ),
    });
  }
}
