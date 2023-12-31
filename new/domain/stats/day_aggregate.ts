import { Atom, PropertiesOnly } from "@worotyns/atoms";
import { InteractionEvents, MigrationEvents, SlackUserId } from "../common/interfaces.ts";
import { SlackChannelId } from "../common/interfaces.ts";
import { DateWithoutTime } from "../common/interfaces.ts";
import { SerializableMap } from "../common/serializable_map.ts";
import { DayRaw } from "../common/date_time.ts";
import { ResourceStats, ResourceType } from "./resource_stats.ts";
import { Events } from "../common/interfaces.ts";

/**
 * Contains all statistics need to be calculated for a given day.
 */
export class DayAggregate extends Atom<DayAggregate> {
  public identity = DayAggregate.createIdentifier(new Date());

  public users: SerializableMap<SlackUserId, ResourceStats> =
    new SerializableMap();
  public channels: SerializableMap<SlackChannelId, ResourceStats> =
    new SerializableMap();

    public migrate(
      event: MigrationEvents,
    ) {
      switch (event.type) {
        case "thread":
        case "reaction":
        case "message":
        case "hourly":
          this.channels.getOrSet(
            event.meta.channelId,
            () => new ResourceStats(ResourceType.channel),
          ).migrate(event);
          this.users.getOrSet(
            event.meta.userId,
            () => new ResourceStats(ResourceType.user),
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
      case "thread":
      case "reaction":
      case "message":
        this.channels.getOrSet(
          event.meta.channelId,
          () => new ResourceStats(ResourceType.channel),
        ).register(event);
        this.users.getOrSet(
          event.meta.userId,
          () => new ResourceStats(ResourceType.user),
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

  static deserializeResourceStatsWithKeyAsSerializedMap<T>(
    json: PropertiesOnly<SerializableMap<T, ResourceStats>>,
  ): SerializableMap<T, ResourceStats> {
    return new SerializableMap(
      (json as unknown as Array<[T, ResourceStats]>)
        .map((item) => [item[0], ResourceStats.deserialize(item[1])]),
    );
  }

  static deserialize(json: PropertiesOnly<DayAggregate>): DayAggregate {
    return Object.assign(new DayAggregate(), {
      ...json,
      users: DayAggregate.deserializeResourceStatsWithKeyAsSerializedMap(
        json.users,
      ),
      channels: DayAggregate.deserializeResourceStatsWithKeyAsSerializedMap(
        json.channels,
      ),
    });
  }
}
