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

(async () => {
    const repository = new Repository(process.env.SQLITE_DB_PATH || null);
    
    await MigrationManager.initializeDb(repository);

    const collectorFactory = new StatsCollectorFactory(repository);

    const statsCollector = collectorFactory.createChannelCollector({count: 25, milliseconds: 25_000});
    const mappingCollector = collectorFactory.createMappingCollector({count: 50, milliseconds: 35_000});

    const botFactory = new BotFactory(
        statsCollector,
        mappingCollector,
    );

    const [app, slackHelper] = botFactory.create();

    const resourceService = new ResourcesService(repository);
    const activityService = new ActivityService(repository);
    const timeTrackingService = new TimeTrackingService(repository);
    const apiServer = new ApiServer(
        resourceService,
        activityService,
        timeTrackingService
    );

    ProcessManager.create([
        async () => {
            console.log('Stopping api')
            await apiServer.stop();
        },
        async () => { 
            console.log('Stopping app')
            await app.stop() 
        },
        async () => { 
            console.log('Stopping stats collector')
            await statsCollector.stop() 
        },
        async () => { 
            console.log('Stopping mapping collector')
            await mappingCollector.stop() 
        },
        async () => { 
            console.log('Stopping repository')
            await repository.stop() 
        }   
    ]);

    await app.start();
    console.log('Running! bot socket');
    apiServer.run();
    await slackHelper.joinToAllChannels();
    
  })();