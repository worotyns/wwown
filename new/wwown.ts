import { Atom, PropertiesOnly } from "@worotyns/atoms";
import { Resources } from "./resources.ts";
import { BasicStats } from "./basic_stats.ts";
import {
  DateWithoutTimeRaw,
  Events,
  SlackChannelId,
  SlackUserId,
} from "./interfaces.ts";
import { DayAggregate } from "./day_aggregate.ts";
import { SerializableMap } from "./serializable_map.ts";
import { DayRaw } from "./date_time.ts";

/**
 * Main entry point for the application.
 */
export class WhoWorksOnWhatNow extends Atom<WhoWorksOnWhatNow> {
  /**
   * Identity determine file name on disk
   * and is used to identify the application state.
   */
  public readonly identity = "wwown_production";

  /**
   * Contains information about resources (channels, users).
   */
  public readonly resources: Resources = new Resources();

  /**
   * This is aggregated data for all-time-period with one channel -> user granularity.
   */
  public readonly channels: SerializableMap<SlackUserId, BasicStats> =
    new SerializableMap();

  /**
   * This is aggregated data for all-time-period with one user -> channel granularity.
   */
  public readonly users: SerializableMap<SlackChannelId, BasicStats> =
    new SerializableMap();

  /**
   * Contains information about each day of activity with detailed information.
   * This is aggregated data for user, and channel with one day granularity.
   */
  public readonly days: SerializableMap<DateWithoutTimeRaw, DayAggregate> =
    new SerializableMap();

  public register(event: Events) {
    const dayAggregate = this.getDayAggregate(event.meta.timestamp);

    switch (event.type) {
      case "message":
        this.channels.getOrSet(event.meta.channelId, () => new BasicStats())
          .inc();
        this.users.getOrSet(event.meta.userId, () => new BasicStats()).inc();

        dayAggregate.registerMessage(event.meta.userId, event.meta.channelId);
        break;
      default:
        throw new Error(`UNIMPLEMENTED event type: ${event.type}`);
        // case "reaction":
        //   this.registerReaction(event.meta.userId, event.meta.channelId, event.meta.threadId);
        //   break;
        // case "channel":
        //   this.registerChannel(event.meta.channelId, event.meta.channelName);
        //   break;
        // case "user":
        //   this.registerUser(event.meta.userId, event.meta.userName);
        //   break;
    }
  }

  private getDayAggregate(day: Date) {
    return this.days.getOrSet(
      DayRaw(day),
      () => DayAggregate.createForDay(day),
    );
  }

  static deserialize(
    value: PropertiesOnly<WhoWorksOnWhatNow>,
  ): WhoWorksOnWhatNow {
    return Object.assign(new WhoWorksOnWhatNow(), value);
  }
}
