import { WebClient } from "slack-web";
import { Logger } from "../logger.ts";

type Channel = {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  unlinked: number;
  name_normalized: string;
  is_shared: boolean;
  parent_conversation: null;
  creator: string;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  shared_team_ids: string[];
  pending_shared: [];
  pending_connected_team_ids: [];
  is_pending_ext_shared: boolean;
  is_member: boolean;
  is_private: boolean;
  is_mpim: boolean;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  previous_names: [];
  num_members: number;
};

export class SlackHelper {
  private cache: Map<string, string> = new Map();

  constructor(
    private readonly client: WebClient,
    private readonly logger: Logger,
  ) {
  }

  public removeAngleBracketText(inputString: string) {
    return inputString.replace(/<[^>]+>/g, "").trim();
  }

  private registerInCache(resourceId: string, label: string) {
    this.cache.set(resourceId, label);
  }

  async getAllPossibleChannelsToJoin(): Promise<Channel[]> {
    let cursor: string | undefined = undefined;
    const channelIds: Channel[] = [];

    while (true) {
      const result = await this.client.conversations.list({
        limit: 50,
        cursor,
      });

      if (result.ok) {
        for (const channel of result.channels as Channel[] || []) {
          if (channel) {
            channelIds.push(channel as Channel);
          }
        }

        if (result.response_metadata?.next_cursor) {
          cursor = result.response_metadata.next_cursor;
        } else {
          break;
        }
      } else {
        console.error("Error fetching conversations:", result.error);
        break;
      }
    }

    return channelIds;
  }

  async joinToAllChannels() {
    const allChannels = await this.getAllPossibleChannelsToJoin();

    for (const channel of allChannels) {
      if (
        !channel.is_private && !channel.is_archived && !channel.is_member &&
        channel.id
      ) {
        await this.client.conversations.join({
          channel: channel.id,
        });
        this.logger.log(`Joined channel: ${channel.name}`);
      }

      if (channel.id && channel.name_normalized) {
        this.registerInCache(channel.id, channel.name_normalized);
      }
    }
  }

  private async resolveChannelName(channelId: string): Promise<string> {
    if (this.cache.has(channelId)) {
      return this.cache.get(channelId) as string;
    }

    // deno-lint-ignore no-explicit-any
    const resp: any = await this.client.conversations.info({
      channel: channelId,
    });

    const name = resp.channel.name_normalized || "NA";
    this.registerInCache(channelId, name);

    return name;
  }

  private async resolveUserName(userId: string): Promise<string> {
    if (this.cache.has(userId)) {
      return this.cache.get(userId) as string;
    }

    // deno-lint-ignore no-explicit-any
    const userResponse: any = await this.client.users.info({
      user: userId,
    });

    const username = userResponse?.user?.real_name ||
      userResponse?.user?.name || "NA";
    this.registerInCache(userId, username);
    return username;
  }

  public resolveAuthorOfThreadByThreadTs(
    threadTs: string,
  ): Promise<null | string> {
    return this.client.conversations.replies({
      channel: threadTs,
      ts: threadTs,
    // deno-lint-ignore no-explicit-any
    }).then((resp: any) => {
      if (resp.messages && resp.messages.length > 0) {
        return resp.messages[0].user || null;
      }

      return null;
    });
  }

  public resolveNames(
    channelId: string,
    userId: string,
  ): Promise<[string, string]> {
    return Promise.all([
      this.resolveChannelName(channelId),
      this.resolveUserName(userId),
    ]);
  }
}
