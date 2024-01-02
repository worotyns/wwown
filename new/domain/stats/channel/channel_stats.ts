import { PropertiesOnly } from "@worotyns/atoms";
import { BasicStats } from "../common/basic_stats.ts";
import {
  Emoji,
  FirstActivityAt,
  InteractionEvents,
  LastActivityAt,
  MigrationEvents,
  SlackUserId,
  TwoDigitHour,
} from "../../common/interfaces.ts";
import { SlackThreadId } from "../../common/interfaces.ts";
import { SlackChannelId } from "../../common/interfaces.ts";
import { SerializableMap } from "../../common/serializable_map.ts";
import { Events } from "../../common/interfaces.ts";
import { Hour } from "../../common/date_time.ts";

export class ChannelStats {
  constructor(
    public readonly channelId: SlackChannelId,
  ) {
  }

  public readonly hourly: SerializableMap<TwoDigitHour, BasicStats> =
    new SerializableMap();

  public readonly threads: SerializableMap<
    SlackThreadId,
    BasicStats
  > = new SerializableMap();

  public readonly reactions: SerializableMap<
    Emoji,
    BasicStats
  > = new SerializableMap();

  public readonly messages: SerializableMap<
    SlackUserId,
    BasicStats
  > = new SerializableMap();

  public firstAt: FirstActivityAt = new Date(0);
  public lastAt: LastActivityAt = new Date(0);

  /**
   * @deprecated - used only once for migration data from SQLLite data
   */
  public migrate(event: MigrationEvents) {
    this.touchTimes(event.meta.timestamp);
    switch (event.type) {
      case "thread":
        this.threads.getOrSet(
          event.meta.threadId,
          () => new BasicStats(),
        ).inc(event.meta.count, event.meta.timestamp);
        break;
      case "reaction":
        this.reactions.getOrSet(
          event.meta.emoji,
          () => new BasicStats(),
        ).inc(event.meta.count, event.meta.timestamp);
        break;
      case "message":
        this.messages.getOrSet(event.meta.userId, () => new BasicStats())
          .inc(event.meta.count, event.meta.timestamp);
        break;
      case "hourly":
        this.hourly.getOrSet(Hour(event.meta.timestamp), () => new BasicStats())
          .inc(event.meta.count, event.meta.timestamp);
        break;
      default:
        throw new Error(
          `Unknown event type: ${(event as MigrationEvents).type}`,
        );
    }
  }

  public register(
    event: InteractionEvents,
  ) {
    this.hourly.getOrSet(Hour(event.meta.timestamp), () => new BasicStats())
      .inc(event.meta.count, event.meta.timestamp);

    this.touchTimes(event.meta.timestamp);

    switch (event.type) {
      case "thread":
        this.threads.getOrSet(
          event.meta.threadId,
          () => new BasicStats(),
        ).inc(event.meta.count, event.meta.timestamp);
        break;
      case "reaction":
        this.reactions.getOrSet(
          event.meta.emoji,
          () => new BasicStats(),
        ).inc(event.meta.count, event.meta.timestamp);
        break;
      case "message":
        this.messages.getOrSet(event.meta.userId, () => new BasicStats())
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
          }),
        ]),
    );
  }

  static deserialize(json: PropertiesOnly<ChannelStats>): ChannelStats {
    return Object.assign(new ChannelStats(json.channelId), {
      hourly: ChannelStats.deserializeBasicStatsWithKeyAsSerializedMap(
        json.hourly,
      ),
      threads: ChannelStats.deserializeBasicStatsWithKeyAsSerializedMap(
        json.threads,
      ),
      reactions: ChannelStats.deserializeBasicStatsWithKeyAsSerializedMap(
        json.reactions,
      ),
      messages: ChannelStats.deserializeBasicStatsWithKeyAsSerializedMap(
        json.messages,
      ),
      firstAt: new Date(json.firstAt),
      lastAt: new Date(json.lastAt),
    });
  }
}
