import { Atom, PropertiesOnly } from "https://deno.land/x/atoms@0.0.2/mod.ts";
import {
  ResourceEvents,
  SlackChannelId,
  SlackChannelName,
  SlackUserId,
  SlackUserName,
} from "./common/interfaces.ts";
import { Events } from "./common/interfaces.ts";

/**
 * Contains all data about resources (channels, users).
 * Can translate between ids and names and manage theis own state.
 */
export class Resources extends Atom<Resources> {
  private users: Record<SlackUserId, SlackUserName> = {};
  private channels: Record<SlackChannelId, SlackChannelName> = {};
  private lastActivity: Record<SlackUserId | SlackChannelId, number> = {};

  public register(event: ResourceEvents) {
    switch (event.type) {
      case "user":
        if (event.meta.action === "remove") {
          this.removeUser(event.meta.userId);
        } else if (event.meta.action === "add") {
          this.registerUser(event.meta.userId, event.meta.userName);
        }
        break;
      case "channel":
        if (event.meta.action === "remove") {
          this.removeChannel(event.meta.channelId);
        } else if (event.meta.action === "add") {
          this.registerChannel(event.meta.channelId, event.meta.channelName);
        }
        break;
      default:
        throw new Error(`Unknown event type: ${(event as Events).type}`);
    }
  }

  public getChannels() {
    return Object.entries(this.channels);
  }

  public getUsers() {
    return Object.entries(this.users);
  }

  public resolveUserById(userId: SlackUserId) {
    return this.users[userId];
  }

  public resolveUserIdByName(userName: SlackUserName) {
    const [userId] =
      Object.entries(this.users).find(([_, name]) => name === userName) ?? [];
    return userId;
  }

  public resolveChannelById(channelId: SlackChannelId) {
    return this.channels[channelId];
  }

  public resolveChannelIdByName(channelName: SlackChannelName) {
    const [channelId] =
      Object.entries(this.channels).find(([_, name]) => name === channelName) ??
        [];
    return channelId;
  }

  private registerUser(userId: SlackUserId, userName: SlackUserName) {
    this.users[userId] = userName;
    this.lastActivity[userId] = Date.now();
  }

  private registerChannel(
    channelId: SlackChannelId,
    channelName: SlackChannelName,
  ) {
    this.channels[channelId] = channelName;
    this.lastActivity[channelId] = Date.now();
  }

  private removeUser(userId: SlackUserId) {
    delete this.users[userId];
    delete this.lastActivity[userId];
  }

  private removeChannel(channelId: SlackChannelId) {
    delete this.channels[channelId];
    delete this.lastActivity[channelId];
  }

  static deserialize(value: PropertiesOnly<Resources>): Resources {
    return Object.assign(new Resources(), value);
  }
}
