export class SelfFlush {
    private count: number = 0;
    private dumping = false;
    private interval: NodeJS.Timeout;

    constructor(
        private countLimit: number, 
        private readonly milliseconds: number, 
        private readonly dump: Function
    ) {
        this.interval = setInterval(() => this.wrappedDump(), milliseconds);    
    }

    async tick() {
        this.count++
        if (this.count >= this.countLimit) {
            await this.wrappedDump()
        }
    }

    private async wrappedDump() {
     
        if (this.dumping) {
            console.log('Omit dumping.. currently working');
            return;
        }

        this.dumping = true;
        try {
            await this.dump();
        } catch(error) {
            console.error(error);
        } finally {
            this.dumping = false;
        }
    }

    stop() {
        clearInterval(this.interval);
    }
}