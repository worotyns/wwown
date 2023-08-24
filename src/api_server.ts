import { ApiService } from "./api_service";
import Fastify, { FastifyInstance } from 'fastify'
const path = require('path')

interface ApiOptions {
    port: string;
    bindAddres: string;
}

export class ApiServer {

    private fastify: FastifyInstance

    constructor(
        private readonly apiService: ApiService,
        private readonly opts: ApiOptions = { port: process.env.API_SERVER_PORT || '4000', bindAddres: process.env.API_SERVER_BIND_ADDR || '0.0.0.0'},
    ) {
        this.fastify = Fastify({logger: true})
        this.bindRouter();
    }

    bindRouter() {
        this.fastify.register(require('@fastify/static'), {
            root: path.join(__dirname, 'front'),
        })
        
        this.fastify.get('/ping', async (request, reply) => {
            return { pong: 'pong' }
        })

        /**
         * Returns top 5 user of each channel ordered by points, activity date
         */
        this.fastify.get('/dashboard/top', async (request, reply) => {
            const query: any = request.query;
            return await this.apiService.getTopNUsersOfAllChannels(query.limit || 5);
        })

        /**
         * Returns last active users in all channels (who work on what now)
         */
        this.fastify.get('/dashboard/last', async (request, reply) => {
            return await this.apiService.getLastActivityOfAllInLastNHours();
        })

        /**
         * Returns channel today top users
         */
        this.fastify.get('/channels/:channelid/today', async (request, reply) => {
            const params: any = request.params;
            return await this.apiService.getTodayChannelUsers(params.channelid || "none");
        })

        /**
         * Returns channel last users (last interest)
         */
        this.fastify.get('/channels/:channelid/last', async (request, reply) => {
            const params: any = request.params;
            const query: any = request.query;
            return await this.apiService.getLastChannelUsers(params.channelid || "none", query.limit || 10);
        })

        /**
         * Returns top users of channel (knowledge master)
         */
        this.fastify.get('/channels/:channelid/top', async (request, reply) => {
            const params: any = request.params;
            const query: any = request.query;

            return await this.apiService.getTopChannelUsers(params.channelid || "none", query.limit || 10);
        })

        /**
         * Get top of user channel interests
         */
        this.fastify.get('/users/:userid/top', async (request, reply) => {
            const query: any = request.query;
            const params: any = request.params;
            return await this.apiService.getTopChannelsForUser(params.userid || "none", query.limit || 5);
        })

        /**
         * Get last channels of user interest
         */
        this.fastify.get('/users/:userid/last', async (request, reply) => {
            const query: any = request.query;
            const params: any = request.params;
            return await this.apiService.getLastChannelsForUser(params.userid || "none", query.limit || 5);
        })

        /**
         * Get list of channels what user was active today
         */
        this.fastify.get('/users/:userid/today', async (request, reply) => {
            const params: any = request.params;
            return await this.apiService.getTodayChannelsForUser(params.userid || "none");
        })

        this.fastify.get('/resources', async (request, reply) => {
            return await this.apiService.getResources();
        })
    }

    run() {
        const start = async () => {
            try {
              await this.fastify.listen({ port: ~~this.opts.port, host: this.opts.bindAddres })
            } catch (err) {
              this.fastify.log.error(err)
              process.exit(1)
            }
          }
          
        start()
    }

    stop() {
        return this.fastify.close()
    }

}