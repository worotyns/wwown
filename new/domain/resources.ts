import { Atom, PropertiesOnly } from "https://deno.land/x/atoms@0.0.2/mod.ts";
import {
  ResourceEvents,
  SlackChannelId,
  SlackChannelName,
  SlackUserId,
  SlackUserName,
} from "./common/interfaces.ts";
import { Events } from "./common/interfaces.ts";

interface BaseEventMetadata {
  meta: {
    channelId: SlackChannelId;
    userId: SlackUserId;
  }
}

/**
 * Contains all data about resources (channels, users).
 * Can translate between ids and names and manage theis own state.
 */
export class Resources extends Atom<Resources> {
  private users: Record<SlackUserId, SlackUserName> = {};
  private channels: Record<SlackChannelId, SlackChannelName> = {};
  private lastActivity: Record<SlackUserId | SlackChannelId, number> = {};

  public touch(event: BaseEventMetadata) {
    this.lastActivity[event.meta.channelId] = Date.now();
    this.lastActivity[event.meta.userId] = Date.now();
  }

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

  public getAsResources(): Array<[SlackUserId | SlackChannelId, SlackUserName | SlackChannelName]> {
    const combinedArray = Object.keys(this.users).map(id => ({ id, name: this.users[id], lastActivity: this.lastActivity[id] }));
    
    Object.keys(this.channels).forEach(id => {
      combinedArray.push({ id, name: this.channels[id], lastActivity: this.lastActivity[id] });
    });

    combinedArray.filter(a => a.lastActivity > 0).sort((a, b) => b.lastActivity - a.lastActivity);

    return combinedArray.map(({ id, name }) => [id, name]);
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
    this.lastActivity[userId] = 0;
  }

  private registerChannel(
    channelId: SlackChannelId,
    channelName: SlackChannelName,
  ) {
    this.channels[channelId] = channelName;
    this.lastActivity[channelId] = 0;
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
