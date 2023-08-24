export class ProcessManager {

    static create(stepsToDoOnExit: Array<() => Promise<void>>) {
        return new ProcessManager(process, stepsToDoOnExit);
    }

    constructor(
        private readonly process: NodeJS.Process,
        private stepsToDoOnExit: Array<() => Promise<void>>,
    ) {
        this.registerUncaughtExceptions();
        this.registerUnhandlerRejections();
        this.registerStopManager(stepsToDoOnExit);
    }

    private wrapWithTaskAndLog(type: string, callback: Function) {

        return (error?: Error) => {
            if (error) {
                console.error(type, error);
            }

            return callback()
        }
    }
    
    private registerUnhandlerRejections() {
        this.process.once('unhandledRejection', 
            this.wrapWithTaskAndLog(
                'unhandledRejection', 
                () => this.stopProcess()
            )
        );
    }

    private registerUncaughtExceptions() {
        this.process.once('uncaughtException', 
            this.wrapWithTaskAndLog(
                'uncaughtException', 
                () => this.stopProcess()
            )
        );
    }

    private registerStopManager(steps: Array<() => Promise<void>>) {

        const stopSignals: NodeJS.Signals[] = [
            "SIGTERM",
            "SIGHUP",
            "SIGINT",
            "SIGQUIT",
        ];
        
        stopSignals.forEach(signal => {
            this.process.once(signal, this.wrapWithTaskAndLog(
                signal,
                () => this.stopProcess()
            ))
        })
    }

    private async stopProcess() {
        for (const task of this.stepsToDoOnExit) {
            try {
                await task();
            } catch(error) {
                console.error(error);
                this.process.exit(1);
            }
        }

        this.process.exit(0);
    }
}