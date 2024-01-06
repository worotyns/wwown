import { PropertiesOnly } from "@worotyns/atoms";
import { BasicStats } from "../common/basic_stats.ts";
import {
  FirstActivityAt,
  InteractionEvents,
  LastActivityAt,
  SlackUserId,
  TwoDigitHour,
} from "../../common/interfaces.ts";
import { SlackThreadId } from "../../common/interfaces.ts";
import { SlackChannelId } from "../../common/interfaces.ts";
import { SerializableMap } from "../../common/serializable_map.ts";
import { Events } from "../../common/interfaces.ts";
import { Hour } from "../../common/date_time.ts";

class Threads {
  public authored: SerializableMap<SlackThreadId, BasicStats> =
    new SerializableMap();
  public contributed: SerializableMap<SlackThreadId, BasicStats> =
    new SerializableMap();
}

class Reactions {
  public received: SerializableMap<SlackUserId, BasicStats> =
    new SerializableMap();
  public given: SerializableMap<SlackUserId, BasicStats> =
    new SerializableMap();
}

export class UserStats {
  constructor(
    public readonly userId: SlackUserId,
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

  public register(
    event: InteractionEvents,
  ) {
    this.hourly.getOrSet(Hour(event.meta.timestamp), () => new BasicStats())
      .inc(event.meta.count, event.meta.timestamp);

    this.touchTimes(event.meta.timestamp);

    switch (event.type) {
      case "thread":
        if (this.userId === event.meta.parentUserId) {
          this.threads.authored.getOrSet(
            event.meta.threadId,
            () => new BasicStats(),
          ).inc(event.meta.count, event.meta.timestamp);
        } else {
          this.threads.contributed.getOrSet(
            event.meta.threadId,
            () => new BasicStats(),
          ).inc(event.meta.count, event.meta.timestamp);
        }
        break;
      case "reaction":
        if (this.userId === event.meta.itemUserId) {
          this.reactions.given.getOrSet(
            event.meta.emoji,
            () => new BasicStats(),
          ).inc(event.meta.count, event.meta.timestamp);
        } else {
          this.reactions.received.getOrSet(
            event.meta.emoji,
            () => new BasicStats(),
          ).inc(event.meta.count, event.meta.timestamp);
        }
        break;
      case "message":
        this.messages.getOrSet(event.meta.channelId, () => new BasicStats())
          .inc(event.meta.count, event.meta.timestamp);
        break;
      default:
        throw new Error(`Unknown event type: ${(event as Events).type}`);
    }
  }

  private touchTimes(ts: Date) {
    if (this.firstAt.getTime() === 0) {
      this.firstAt.setTime(ts.getTime());
    }

    this.lastAt.setTime(ts.getTime());
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
            firstTs: new Date(item[1].firstTs),
          }),
        ]),
    );
  }

  static deserialize(json: PropertiesOnly<UserStats>): UserStats {
    return Object.assign(new UserStats(json.userId), {
      hourly: UserStats.deserializeBasicStatsWithKeyAsSerializedMap(
        json.hourly,
      ),
      threads: Object.assign(new Threads(), {
        authored: UserStats.deserializeBasicStatsWithKeyAsSerializedMap(
          json.threads.authored,
        ),
        contributed: UserStats.deserializeBasicStatsWithKeyAsSerializedMap(
          json.threads.contributed,
        ),
      }),
      reactions: Object.assign(new Reactions(), {
        given: UserStats.deserializeBasicStatsWithKeyAsSerializedMap(
          json.reactions.given,
        ),
        received: UserStats.deserializeBasicStatsWithKeyAsSerializedMap(
          json.reactions.received,
        ),
      }),
      messages: UserStats.deserializeBasicStatsWithKeyAsSerializedMap(
        json.messages,
      ),
      firstAt: new Date(json.firstAt),
      lastAt: new Date(json.lastAt),
    });
  }
}
