import { App } from "@slack/bolt";
import { StatsCollector } from "./stats_collector";
import { Mapping } from "./stats_collector_factory";
import { Logger } from "./logger";
import { WebClient } from "@slack/web-api";
import { Channel } from "@slack/web-api/dist/response/ConversationsInfoResponse";

export enum IntentionType {
    NotRecognized,
    TimeTracking,
    Incident,
}

export class SlackHelper {

    private cache: Map<string, string> = new Map();

    constructor(
        private readonly app: App,
        private readonly mappingCollector: StatsCollector<Mapping>,
        private readonly logger: Logger,
        private readonly webClient: WebClient
    ) {

    }

    public detectIntentionOnTextBased(input: string): [IntentionType, string] {
        if (input.includes('incident:')) {
            return [IntentionType.Incident, input.replace('incident:', '').trim()]
        } else if (input.includes('time:')) {
            return [IntentionType.TimeTracking, input.replace('time:', '').trim()];
        } else {
            return [IntentionType.NotRecognized, input]
        }
    }

    public removeAngleBracketText(inputString: string) {
        return inputString.replace(/<[^>]+>/g, '').trim();
    }
      
    public async addReaction(channel: string, timestamp: string, emoji: string) {
        try {
            await this.webClient.reactions.add({
                channel,
                timestamp,
                name: emoji
            });
            this.logger.log('Reaction added successfully!');
        } catch (error) {
            this.logger.error('Error adding reaction:', error);
        }
    }

    private registerMappingAndCache(resourceId: string, label: string) {
        this.cache.set(resourceId, label);
        this.mappingCollector.register({
            resource: resourceId,
            label: label,
        });
    }

    async getAllPossibleChannelsToJoin(): Promise<Channel[]> {
        let cursor: string | undefined = undefined;
        const channelIds: Channel[] = [];

        while (true) {
            const result = await this.app.client.conversations.list({
                limit: 1,
                cursor,
            });
        
            if (result.ok) {
                for (const channel of result.channels || []) {
                    channelIds.push(channel);
                }
        
                if (result.response_metadata?.next_cursor) {
                    cursor = result.response_metadata.next_cursor;
                } else {
                    break; 
                }
            } else {
                console.error('Error fetching conversations:', result.error);
                break;
            }
        }
    
        return channelIds;
    }

    async joinToAllChannels() {
        const allChannels = await this.getAllPossibleChannelsToJoin();
        
        for (const channel of allChannels) {
            if (!channel.is_private && !channel.is_archived && !channel.is_member && channel.id) {
                await this.app.client.conversations.join({
                    channel: channel.id,
                });
                this.logger.log(`Joined channel: ${channel.name}`);
            }

            if (channel.id && channel.name_normalized) {
                this.registerMappingAndCache(channel.id, channel.name_normalized)
            }
        }
    }

    async resolveChannelName(channelId: string) {
        if (this.cache.has(channelId)) {
            return this.cache.get(channelId);
        }

        const resp = await this.app.client.conversations.info({
            channel: channelId
        });

        const name = resp?.channel?.name_normalized || "NA";
        this.registerMappingAndCache(channelId, name);

        return name;
    }

    async resolveUserName(userId: string) {
        if (this.cache.has(userId)) {
            return this.cache.get(userId);
        }

        const userResponse = await this.app.client.users.info({
          user: userId
        });
  
        const username = userResponse?.user?.real_name || userResponse?.user?.name || "NA";
        this.registerMappingAndCache(userId, username);
        return username;
    }

    async touchMappings(channelId: string, userId: string) {
      await Promise.all([
        this.resolveChannelName(channelId),
        this.resolveUserName(userId)
      ])
    }

    resolveDateFromTS(ts: string) {
        return new Date(Number(ts) * 1000);
    }
}