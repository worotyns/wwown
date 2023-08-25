import { Logger } from "./logger";
import { SelfFlush } from "./self_flush";

type Serializer = (value: boolean | string | number | Date) => string;
type Deserializer = (value: string) => boolean | string | number | Date;
type WithValue<T> = T & {value: number};

export interface CollectorOptions {
    count: number;
    milliseconds: number;
};

export class StatsCollector<T extends Record<string, any>> {
    
    private readonly state: Map<string, number> = new Map();
    private readonly sfl: SelfFlush;

    constructor(
        private readonly collectorMap: Map<keyof T, [Serializer, Deserializer]>,
        private readonly dump: (state: Array<WithValue<T>>) => Promise<void>,
        private readonly logger: Logger,
        options: CollectorOptions = {count: 10, milliseconds: 60_000}
    ) {
        this.sfl = new SelfFlush(options.count, options.milliseconds, () => this.dumpAndClean(), logger);
    }

    createKeyFromItem(item: T): string {
        const keyValues = [];

        for (const key of this.collectorMap.keys()) {
            const wrapFn = this.collectorMap.get(key);
            if (!wrapFn) {
                throw new Error('Cannot find wrap fn');
            }

            const [serializer] = wrapFn;
            keyValues.push([key, serializer(item[key])].join('$'))
        }

        return keyValues.join('|')
    }

    resolveKeyFromValue(value: string) {
        const result: Record<string, any> = {};

        const values = value.split('|');
        
        for (const value of values) {
            const [key, val] = value.split('$');

            const wrapFn = this.collectorMap.get(key as keyof T);

            if (!wrapFn) {
                throw new Error('Cannot find wrap fn');
            }

            const [_, deserializer] = wrapFn;
            result[key] = deserializer(val);
        }

        return result;
    }

    getState(): Array<WithValue<T>> {
        const res: Array<WithValue<T>> = [];
        
        for (const [key, val] of this.state.entries()) {
            const item = this.resolveKeyFromValue(key)
            res.push({
                ...item,
                value: val
            } as unknown as WithValue<T>)
        }

        return res;
    }

    stop() {
        this.sfl.stop();
        return this.dump(this.getState());
    }

    async dumpAndClean() {
        await this.dump(this.getState());
        this.state.clear();
    }

    register(item: T) {
        this.logger.log(item);
        const key = this.createKeyFromItem(item);
        const existing = this.state.get(key) || 0;
        this.state.set(key, existing + 1);
    }
}