import { SlackChannelId } from "../common/interfaces.ts";

export class ChannelStats {
    constructor(
        public readonly channelId: SlackChannelId
    ) { 

    }

    migrate(...args: any[]) {
        // console.log(args)
    }

    register(...args: any[]) {
        // console.log(args)
    }
}