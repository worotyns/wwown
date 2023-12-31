import { PropertiesOnly } from "@worotyns/atoms";
import { BasicStats } from "./basic_stats.ts";
import {
  FirstActivityAt,
  InteractionEvents,
  LastActivityAt,
  MigrationEvents,
  SlackUserId,
  TwoDigitHour,
} from "../common/interfaces.ts";
import { SlackThreadId } from "../common/interfaces.ts";
import { SlackChannelId } from "../common/interfaces.ts";
import { SerializableMap } from "../common/serializable_map.ts";
import { Events } from "../common/interfaces.ts";
import { Hour } from "../common/date_time.ts";

class Threads {
  public authored: SerializableMap<SlackThreadId, BasicStats> =
    new SerializableMap();
  public contributed: SerializableMap<SlackThreadId, BasicStats> =
    new SerializableMap();
}

class Reactions {
  public received: SerializableMap<SlackThreadId, BasicStats> =
    new SerializableMap();
  public given: SerializableMap<SlackThreadId, BasicStats> =
    new SerializableMap();
}

export enum ResourceType {
  channel = "channel",
  user = "user",
}

export class ResourceStats {
  constructor(
    public readonly type: ResourceType,
  ) {
  }

  public readonly hourly: SerializableMap<TwoDigitHour, BasicStats> =
    new SerializableMap();
  public readonly threads: Threads = new Threads();
  public readonly reactions: Reactions = new Reactions();
  public readonly messages: SerializableMap<
    SlackUserId | SlackChannelId,
    BasicStats
  > = new SerializableMap();
  public readonly firstAt: FirstActivityAt = new Date(0);
  public readonly lastAt: LastActivityAt = new Date(0);

  /**
   * @deprecated - used only once for migration data from SQLLite data
   */
  public migrate(event: MigrationEvents) {
    switch (event.type) {
      case "thread":
        if (event.meta.userId === event.meta.parentUserId) {
          this.threads.authored.getOrSet(
            event.meta.threadId,
            () => new BasicStats(),
          ).inc(event.meta.count);
        } else {
          this.threads.contributed.getOrSet(
            event.meta.threadId,
            () => new BasicStats(),
          ).inc(event.meta.count);
        }
        break;
      case "reaction":
        if (event.meta.userId === event.meta.itemUserId) {
          this.reactions.given.getOrSet(
            event.meta.emoji,
            () => new BasicStats(),
          ).inc(event.meta.count);
        } else {
          this.reactions.received.getOrSet(
            event.meta.emoji,
            () => new BasicStats(),
          ).inc(event.meta.count);
        }
        break;
      case "message":
        if (this.type === ResourceType.channel) {
          this.messages.getOrSet(event.meta.userId, () => new BasicStats())
            .inc(event.meta.count);
        } else if (this.type === ResourceType.user) {
          this.messages.getOrSet(event.meta.channelId, () => new BasicStats())
            .inc(event.meta.count);
        } else {
          throw new Error("Unknown resource type");
        }
        break;
      case "hourly":
        this.hourly.getOrSet(Hour(event.meta.timestamp), () => new BasicStats())
        .inc(event.meta.count);
        break;
      default:
        throw new Error(`Unknown event type: ${(event as MigrationEvents).type}`);
    }
  }

  public register(
    event: InteractionEvents,
  ) {
    this.hourly.getOrSet(Hour(event.meta.timestamp), () => new BasicStats())
      .inc(event.meta.count);
    switch (event.type) {
      case "thread":
        if (event.meta.userId === event.meta.parentUserId) {
          this.threads.authored.getOrSet(
            event.meta.threadId,
            () => new BasicStats(),
          ).inc(event.meta.count);
        } else {
          this.threads.contributed.getOrSet(
            event.meta.threadId,
            () => new BasicStats(),
          ).inc(event.meta.count);
        }
        break;
      case "reaction":
        if (event.meta.userId === event.meta.itemUserId) {
          this.reactions.given.getOrSet(
            event.meta.emoji,
            () => new BasicStats(),
          ).inc(event.meta.count);
        } else {
          this.reactions.received.getOrSet(
            event.meta.emoji,
            () => new BasicStats(),
          ).inc(event.meta.count);
        }
        break;
      case "message":
        if (this.type === ResourceType.channel) {
          this.messages.getOrSet(event.meta.userId, () => new BasicStats())
            .inc(event.meta.count);
        } else if (this.type === ResourceType.user) {
          this.messages.getOrSet(event.meta.channelId, () => new BasicStats())
            .inc(event.meta.count);
        } else {
          throw new Error("Unknown resource type");
        }
        break;
      default:
        throw new Error(`Unknown event type: ${(event as Events).type}`);
    }
  }

  static deserializeBasicStatsWithKeyAsSerializedMap<T>(
    json: PropertiesOnly<SerializableMap<T, BasicStats>>,
  ): SerializableMap<T, BasicStats> {
    return new SerializableMap(
      (json as unknown as Array<[T, BasicStats]>)
        .map((item) => [
          item[0],
          Object.assign(new BasicStats(), {
            ...item[1],
            lastTs: new Date(item[1].lastTs),
          }),
        ]),
    );
  }

  static deserialize(json: PropertiesOnly<ResourceStats>): ResourceStats {
    return Object.assign(new ResourceStats(json.type), {
      hourly: ResourceStats.deserializeBasicStatsWithKeyAsSerializedMap(
        json.hourly,
      ),
      threads: Object.assign(new Threads(), {
        authored: ResourceStats.deserializeBasicStatsWithKeyAsSerializedMap(
          json.threads.authored,
        ),
        contributed: ResourceStats.deserializeBasicStatsWithKeyAsSerializedMap(
          json.threads.contributed,
        ),
      }),
      reactions: Object.assign(new Reactions(), {
        given: ResourceStats.deserializeBasicStatsWithKeyAsSerializedMap(
          json.reactions.given,
        ),
        received: ResourceStats.deserializeBasicStatsWithKeyAsSerializedMap(
          json.reactions.received,
        ),
      }),
      messages: ResourceStats.deserializeBasicStatsWithKeyAsSerializedMap(
        json.messages,
      ),
      firstAt: new Date(json.firstAt),
      lastAt: new Date(json.lastAt),
    });
  }
}
