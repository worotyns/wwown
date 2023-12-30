import { Atom, PropertiesOnly } from "@worotyns/atoms";
import { Day } from "./date_time.ts";
import { SlackThreadId, SlackUserId } from "./interfaces.ts";
import { SlackChannelId } from "./interfaces.ts";
import { DateWithoutTime } from "./interfaces.ts";
import { SerializableMap } from "./serializable_map.ts";
import { DayRaw } from "./date_time.ts";
import { ResourceStats } from "./resource_stats.ts";

/**
 * Contains all statistics need to be calculated for a given day.
 */
export class DayAggregate extends Atom<DayAggregate> {
  public identity = DayAggregate.createIdentifier(new Date());

  public day: DateWithoutTime = Day(new Date());

  public users: SerializableMap<SlackUserId, ResourceStats> =
    new SerializableMap();
  public channels: SerializableMap<SlackChannelId, ResourceStats> =
    new SerializableMap();

  public registerMessage(
    user: SlackUserId,
    channel: SlackChannelId,
    thread?: SlackThreadId,
  ) {
    // if (thread) {
    // this.threads.authored.getOrSet(channel, () => new BasicStats()).inc();
    // this.messages.getOrSet(user, () => new BasicStats()).inc();
    // }
    this.channels.getOrSet(channel, () => new ResourceStats()).registerMessage(
      user,
      channel,
      thread,
    );
    this.users.getOrSet(user, () => new ResourceStats()).registerMessage(
      user,
      channel,
      thread,
    );
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
      day: Day(new Date(json.day)),
      users: DayAggregate.deserializeResourceStatsWithKeyAsSerializedMap(
        json.users,
      ),
      channels: DayAggregate.deserializeResourceStatsWithKeyAsSerializedMap(
        json.channels,
      ),
    });
  }
}
