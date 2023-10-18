import 'dotenv/config';
import { ProcessManager } from "./process_manager";
import { Repository } from "./repository";
import { BotFactory } from "./slack";
import { StatsCollectorFactory } from "./stats_collector_factory";
import { ActivityService } from './activity_service';
import { ApiServer } from './api_server';
import { MigrationManager } from './migration_manager';
import { TimeTrackingService } from './time_tracking_service';
import { ResourcesService } from './resources_service';
import { createLogger } from './logger';
import { IncidentService } from './incident_service';
import { KarmaService } from './karma_service';
import { HourlyActivityService } from './hourly_service';

(async () => {
    const logger = createLogger();

    const repository = new Repository(process.env.SQLITE_DB_PATH || null);
    
    await MigrationManager.initializeDb(repository, logger);

    const collectorFactory = new StatsCollectorFactory(repository, logger);

    const statsCollector = collectorFactory.createChannelCollector({count: 25, milliseconds: 25_000});
    const mappingCollector = collectorFactory.createMappingCollector({count: 50, milliseconds: 35_000});
    const hourlyCollector = collectorFactory.createHourlyCollector({count: 25, milliseconds: 15_000});
    const threadsCollector = collectorFactory.createThreadCollector({count: 25, milliseconds: 20_000});
    
    const karmaService = new KarmaService(repository);
    const resourceService = new ResourcesService(repository);
    const activityService = new ActivityService(repository);
    const timeTrackingService = new TimeTrackingService(repository);
    const incidentService = new IncidentService(repository);
    const hourlyActivityService = new HourlyActivityService(repository);

    const botFactory = new BotFactory(
        statsCollector,
        threadsCollector,
        mappingCollector,
        hourlyCollector,
        timeTrackingService,
        incidentService,
        resourceService,
        karmaService,
        logger,
    );

    const [app, slackHelper] = botFactory.create();

    const apiServer = new ApiServer(
        resourceService,
        activityService,
        timeTrackingService,
        incidentService,
        karmaService,
        hourlyActivityService,
    );

    ProcessManager.create([
        async () => {
            logger.log('Stopping api')
            await apiServer.stop();
        },
        async () => { 
            logger.log('Stopping app')
            await app.stop() 
        },
        async () => { 
            logger.log('Stopping stats collector')
            await statsCollector.stop() 
        },
        async () => { 
            logger.log('Stopping mapping collector')
            await mappingCollector.stop() 
        },
        async () => { 
            logger.log('Stopping hourly collector')
            await hourlyCollector.stop() 
        },
        async () => { 
            logger.log('Stopping repository')
            await repository.stop() 
        }   
    ], logger);

    await app.start();
    logger.log('Running! bot socket');
    apiServer.run();
    await slackHelper.joinToAllChannels();
    
  })();