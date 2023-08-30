import { ActivityService } from "./activity_service";
import Fastify, { FastifyInstance } from "fastify";
import { TimeTrackingService } from "./time_tracking_service";
import { ResourcesService } from "./resources_service";
import path from "path";
import { IncidentService } from "./incident_service";
import { KarmaService } from "./karma_service";
import { HourlyActivityService } from "./hourly_service";

interface ApiOptions {
  port: string;
  bindAddres: string;
}

export class ApiServer {
  static parseQueryTParam(range: string): [Date, Date] | null {
    if (!range) {
      return null;
    }

    const now = new Date();
    const periods = range.split(",");

    const parsedDates = periods.map((period) => {
      const regex = /(-?\d+)([dhmqy])/;
      const match = period.match(regex);

      if (!match) {
        return null;
      }

      const value = parseInt(match[1]);
      const unit = match[2];
      let durationInMilliseconds = 0;

      switch (unit) {
        case "d":
          durationInMilliseconds = value * 24 * 60 * 60 * 1000;
          break;
        case "h":
          durationInMilliseconds = value * 60 * 60 * 1000;
          break;
        case "m":
          durationInMilliseconds = value * 60 * 1000;
          break;
        case "q":
          durationInMilliseconds = value * 3 * 30 * 24 * 60 * 60 * 1000; // Assuming 3 months per quarter
          break;
        case "y":
          durationInMilliseconds = value * 365 * 24 * 60 * 60 * 1000; // Approximating with 365 days per year
          break;
      }

      return new Date(now.getTime() + durationInMilliseconds);
    });

    if (parsedDates.some((date) => date === null)) {
      return null;
    }

    return parsedDates as [Date, Date];
  }

  private fastify: FastifyInstance;

  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly activityService: ActivityService,
    private readonly timeTrackingService: TimeTrackingService,
    private readonly incidentService: IncidentService,
    private readonly karmaService: KarmaService,
    private readonly hourlyActivityService: HourlyActivityService,
    private readonly opts: ApiOptions = {
      port: process.env.API_SERVER_PORT || "4000",
      bindAddres: process.env.API_SERVER_BIND_ADDR || "0.0.0.0",
    },
  ) {
    this.fastify = Fastify({ logger: true });
    this.bindRouter();
  }

  private getParam(params: any, name: string) {
    const param = params[name];

    if (!param) {
      throw new Error(`${name} - query param in url is required`);
    }

    return param;
  }

  private parseT(query: any) {
    const range = ApiServer.parseQueryTParam(query?.t);

    if (!range) {
      throw new Error("?t param is required");
    }

    return range;
  }

  private parseLimit(query: any) {
    const limit = query?.l;

    if (!limit) {
      throw new Error("?l param is required");
    }

    return limit;
  }

  bindRouter() {
    this.fastify.register(require("@fastify/static"), {
      root: path.join(__dirname, "front"),
    });

    this.fastify.get("/ping", async (request) => {
      return { pong: "pong" };
    });

    this.fastify.get("/resources", async (request) => {
      return this.resourcesService.getResources();
    });

    /**
     * Returns all time channel, user duration
     * timematrix.html
     */
    this.fastify.get(
      "/timetracking/dashboard/matrix",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);
        return this.timeTrackingService
          .getTimeMatrixData(
            startDate,
            endDate,
          );
      },
    );

    /**
     * Get karma reactions top
     * users.html
     */
    this.fastify.get("/karma/dashboard/receivers", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.karmaService.getGlobalReceiversInRangeAndLimit(
        startDate,
        endDate,
        this.parseLimit(request.query),
      );
    });

    /**
     * Get given karma reactions top
     * users.html
     */
    this.fastify.get("/karma/dashboard/givers", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.karmaService.getGlobalGiversInRangeAndLimit(
        startDate,
        endDate,
        this.parseLimit(request.query),
      );
    });

    /**
     * Get karma reactions for user
     * users.html
     */
    this.fastify.get("/karma/users/:userid/received", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.karmaService.getForUserInRangeAndLimit(
        this.getParam(request.params, "userid"),
        startDate,
        endDate,
        this.parseLimit(request.query),
      );
    });

    /**
     * Get given karma reactions for user
     * users.html
     */
    this.fastify.get("/karma/users/:userid/given", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.karmaService.getForGivingUserInRangeAndLimit(
        this.getParam(request.params, "userid"),
        startDate,
        endDate,
        this.parseLimit(request.query),
      );
    });

    /**
     * Get karma reactions for user
     * channel.html
     */
    this.fastify.get(
      "/karma/channels/:channelid/receivers",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);
        return this.karmaService.getForChannelReceiversInRangeAndLimit(
          this.getParam(request.params, "channelid"),
          startDate,
          endDate,
          this.parseLimit(request.query),
        );
      },
    );

    /**
     * Get given karma reactions for user
     * channel.html
     */
    this.fastify.get("/karma/channels/:channelid/givers", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.karmaService.getForChannelGiversInRangeAndLimit(
        this.getParam(request.params, "channelid"),
        startDate,
        endDate,
        this.parseLimit(request.query),
      );
    });

    /**
     * Returns distribution time of date range
     * dashboard.html
     */
    this.fastify.get(
      "/activity/dashboard/hourly",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);
        return this.hourlyActivityService
          .getGlobalActivityForTimeRange(
            startDate,
            endDate,
          );
      },
    );

    /**
     * Returns distribution time of channel
     * channel.html
     */
    this.fastify.get(
      "/activity/channels/:channelid/hourly",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);
        return this.hourlyActivityService
          .getHourlyActivityForChannelInTimeRange(
            this.getParam(request.params, "channelid"),
            startDate,
            endDate,
          );
      },
    );

    /**
     * Returns distribution time of user
     * user.html
     */
    this.fastify.get(
      "/activity/users/:userid/hourly",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);
        return this.hourlyActivityService
          .getHourlyActivityForUserInTimeRange(
            this.getParam(request.params, "userid"),
            startDate,
            endDate,
          );
      },
    );

    /**
     * Returns last active users in all channels (who work on what now)
     * dashboard.html
     */
    this.fastify.get("/timetracking/dashboard/last", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.timeTrackingService
        .durationPerChannelAndUserAndDescriptionInTimeRange(
          startDate,
          endDate,
        );
    });

    /**
     * Returns lastactivity data for chart
     * dashboard.html
     */
    this.fastify.get("/activity/dashboard/activity", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.activityService.getActivityChartData(
        startDate,
        endDate,
      );
    });

    /**
     * Returns avg daily activity
     * dashboard.html
     */
    this.fastify.get("/activity/dashboard/daily", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.activityService.getDailyActivityForUsersInTime(
        startDate,
        endDate,
      );
    });

    /**
     * Returns last active users in all channels (who work on what now)
     * dashboard.html
     */
    this.fastify.get("/activity/dashboard/last", async (request) => {
      const [startDate] = this.parseT(request.query);
      return this.activityService.getLastActivityOfAllSinceDate(
        startDate,
      );
    });

    /**
     * Returns monthly sum of date, user duration for channel time tracking
     * channels.html
     */
    this.fastify.get(
      "/timetracking/channels/:channelid/monthly",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);
        return this.timeTrackingService
          .durationOfChannelInTimeByMonthAndUser(
            this.getParam(request.params, "channelid"),
            startDate,
            endDate,
          );
      },
    );

    /**
     * Returns sum of channel, duration for channel time tracking
     * channels.html
     */
    this.fastify.get(
      "/timetracking/channels/:channelid/sum",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);
        return this.timeTrackingService
          .durationOfChannelAndDescriptionInTimeRange(
            this.getParam(request.params, "channelid"),
            startDate,
            endDate,
          );
      },
    );

    /**
     * Returns channel time range top users
     * channels.html
     */
    this.fastify.get(
      "/activity/channels/:channelid/range",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);

        return this.activityService.getChannelUsersInTimeRange(
          this.getParam(request.params, "channelid"),
          startDate,
          endDate,
        );
      },
    );

    /**
     * Returns channel last users (last interest)
     * channels.html
     */
    this.fastify.get(
      "/activity/channels/:channelid/last",
      async (request) => {
        return this.activityService.getLastChannelUsers(
          this.getParam(request.params, "channelid"),
          this.parseLimit(request.query),
        );
      },
    );

    /**
     * Returns top users of channel (knowledge master)
     * channels.html
     */
    this.fastify.get(
      "/activity/channels/:channelid/top",
      async (request) => {
        return this.activityService.getTopChannelUsers(
          this.getParam(request.params, "channelid"),
          this.parseLimit(request.query),
        );
      },
    );

    /**
     * Returns user avg daily activity
     * dashboard.html
     */
    this.fastify.get("/activity/users/:userid/daily", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.activityService.getDailyActivityForUserInTime(
        this.getParam(request.params, "userid"),
        startDate,
        endDate,
      );
    });

    /**
     * Returns user avg daily activity
     * channels.html
     */
    this.fastify.get("/activity/channels/:channelid/daily", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      return this.activityService.getDailyActivityForChannelInTime(
        this.getParam(request.params, "channelid"),
        startDate,
        endDate,
      );
    });

    /**
     * Returns monthly sum of date, user duration for channel time tracking
     * users.html
     */
    this.fastify.get(
      "/timetracking/users/:userid/monthly",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);
        return this.timeTrackingService
          .durationOfUserInTimeByMonthAndUser(
            this.getParam(request.params, "userid"),
            startDate,
            endDate,
          );
      },
    );

    /**
     * Get top of user channel interests
     * users.html
     */
    this.fastify.get("/activity/users/:userid/top", async (request) => {
      const query: any = request.query;
      return this.activityService.getTopChannelsForUser(
        this.getParam(request.params, "userid"),
        this.parseLimit(request.query),
      );
    });

    /**
     * Get last channels of user interest
     * users.html
     */
    this.fastify.get("/activity/users/:userid/last", async (request) => {
      const query: any = request.query;
      return this.activityService.getLastChannelsForUser(
        this.getParam(request.params, "userid"),
        this.parseLimit(request.query),
      );
    });

    /**
     * Returns last n- time registrations for user
     * users.html
     */
    this.fastify.get(
      "/timetracking/users/:userid/last",
      async (request) => {
        return this.timeTrackingService
          .getLastNChannelAndDescriptionOfUser(
            this.getParam(request.params, "userid"),
            this.parseLimit(request.query),
          );
      },
    );

    /**
     * Returns last n- incidents
     * dashboard.html
     */
    this.fastify.get(
      "/incidents/dashboard/last",
      async (request) => {
        return this.incidentService
          .getLastIncidents(
            this.parseLimit(request.query),
          );
      },
    );
  }

  run() {
    const start = async () => {
      try {
        await this.fastify.listen({
          port: ~~this.opts.port,
          host: this.opts.bindAddres,
        });
      } catch (err) {
        this.fastify.log.error(err);
        process.exit(1);
      }
    };

    start();
  }

  stop() {
    return this.fastify.close();
  }
}
