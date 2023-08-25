import { App } from "@slack/bolt";
import { StatsCollector } from "./stats_collector";
import { Mapping } from "./stats_collector_factory";
import { Logger } from "./logger";

export class SlackHelper {

    private cache: Map<string, string> = new Map();

    constructor(
        private readonly app: App,
        private readonly mappingCollector: StatsCollector<Mapping>,
        private readonly logger: Logger
    ) {

    }

    private registerMappingAndCache(resourceId: string, label: string) {
        this.cache.set(resourceId, label);
        this.mappingCollector.register({
            resource: resourceId,
            label: label,
        });
    }

    async joinToAllChannels() {
        const resp = await this.app.client.conversations.list()
        
        for (const channel of resp?.channels || []) {
            if (!channel.is_private && !channel.is_member && channel.id) {
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