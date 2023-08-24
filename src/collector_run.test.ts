import assert from "assert";
import { StatsCollectorFactory } from "./stats_collector_factory";
import { Repository } from "./repository";

describe('stats_collector', function() {
    let repository!: Repository;

    before(async () => {
        repository = new Repository(null);
        await Repository.runMigrations(repository);
    })

    it('mapping', async function() {
        const factory = new StatsCollectorFactory(repository);
        const mapping = factory.createMappingCollector({count: 10, milliseconds: 1000});

        await repository.exec(`DELETE FROM mapping WHERE rowid > 0`)

        mapping.register({
            resource: 'ch1',
            label: 'channelone',
        })

        mapping.register({
            resource: 'ch2',
            label: 'channeltwo',
        })

        mapping.register({
            resource: 'ch1',
            label: 'channelone',
        })

        await mapping.stop()
        console.log(await repository.all('SELECT * FROM mapping'));
    });

    it('stats', async function() {
        const factory = new StatsCollectorFactory(repository);
        const statscoll = factory.createChannelCollector({count: 10, milliseconds: 1000});
        await repository.exec(`DELETE FROM stats WHERE rowid > 0`)

        statscoll.register({
            channel: 'ch1',
            user: 'usr1',
            type: "interactions",
            day: new Date('2022-12-12 23:22:22')
        })

        statscoll.register({
            channel: 'ch1',
            user: 'usr1',
            type: "interactions",
            day: new Date('2022-12-12 23:23:22')
        })

        statscoll.register({
            channel: 'ch1',
            user: 'usr2',
            type: "interactions",
            day: new Date('2022-12-12 23:23:22')
        })

        await statscoll.stop()
        console.log(await repository.all('SELECT * FROM stats'));
    });
});