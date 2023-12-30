import { Atom, PropertiesOnly } from "https://deno.land/x/atoms@0.0.2/mod.ts";
import {
  SlackChannelId,
  SlackChannelName,
  SlackUserId,
  SlackUserName,
} from "./interfaces.ts";

/**
 * Contains all data about resources (channels, users).
 * Can translate between ids and names and manage theis own state.
 */
export class Resources extends Atom<Resources> {
  private users: Record<SlackUserId, SlackUserName> = {};
  private channels: Record<SlackChannelId, SlackChannelName> = {};
  private lastActivity: Record<SlackUserId | SlackChannelId, number> = {};

  registerUser(userId: SlackUserId, userName: SlackUserName) {
    this.users[userId] = userName;
    this.lastActivity[userId] = Date.now();
  }

  registerChannel(channelId: SlackChannelId, channelName: SlackChannelName) {
    this.channels[channelId] = channelName;
    this.lastActivity[channelId] = Date.now();
  }

  removeUser(userId: SlackUserId) {
    delete this.users[userId];
    delete this.lastActivity[userId];
  }

  removeChannel(channelId: SlackChannelId) {
    delete this.channels[channelId];
    delete this.lastActivity[channelId];
  }

  getChannels() {
    return Object.entries(this.channels);
  }

  getUsers() {
    return Object.entries(this.users);
  }

  resolveUserById(userId: SlackUserId) {
    return this.users[userId];
  }

  resolveUserIdByName(userName: SlackUserName) {
    const [userId] =
      Object.entries(this.users).find(([_, name]) => name === userName) ?? [];
    return userId;
  }

  resolveChannelById(channelId: SlackChannelId) {
    return this.channels[channelId];
  }

  resolveChannelIdByName(channelName: SlackChannelName) {
    const [channelId] =
      Object.entries(this.channels).find(([_, name]) => name === channelName) ??
        [];
    return channelId;
  }

  static deserialize(value: PropertiesOnly<Resources>): Resources {
    return Object.assign(new Resources(), value);
  }
}
