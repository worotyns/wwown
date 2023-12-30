import { PropertiesOnly } from "@worotyns/atoms";
import { BasicStats } from "./basic_stats.ts";
import {
  FirstActivityAt,
  lastActivityAt,
  SlackUserId,
  TwoDigitHour,
} from "./interfaces.ts";
import { SlackThreadId } from "./interfaces.ts";
import { SlackChannelId } from "./interfaces.ts";
import { SerializableMap } from "./serializable_map.ts";

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

export class ResourceStats {
  public readonly hourly: SerializableMap<TwoDigitHour, BasicStats> =
    new SerializableMap();
  public readonly threads: Threads = new Threads();
  public readonly reactions: Reactions = new Reactions();
  public readonly messages: SerializableMap<
    SlackUserId | SlackChannelId,
    BasicStats
  > = new SerializableMap();
  public readonly firstAt: FirstActivityAt = new Date(0);
  public readonly lastAt: lastActivityAt = new Date(0);

  public registerMessage(
    user: SlackUserId,
    channel: SlackChannelId,
    thread?: SlackThreadId,
  ) {
    if (thread) {
      this.threads.authored.getOrSet(channel, () => new BasicStats()).inc();
    }
    this.messages.getOrSet(channel, () => new BasicStats()).inc();
    this.messages.getOrSet(user, () => new BasicStats()).inc();
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
    return Object.assign(new ResourceStats(), {
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
