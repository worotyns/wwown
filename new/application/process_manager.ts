import { Logger } from "./logger.ts";

export class ProcessManager {
  static create(
    stepsToDoOnExit: Array<() => Promise<void>>,
    abortController: AbortController,
    logger: Logger,
  ): ProcessManager {
    return new ProcessManager(Deno, stepsToDoOnExit, abortController, logger);
  }

  private stopping = false;

  constructor(
    private readonly process: typeof Deno,
    private stepsToDoOnExit: Array<() => Promise<void>>,
    private readonly abortController: AbortController,
    private readonly logger: Logger,
  ) {
    this.registerUncaughtExceptions();
    this.registerUnhandlerRejections();
    this.registerStopManager();
  }

  // deno-lint-ignore ban-types
  private wrapWithTaskAndLog(type: string, callback: Function) {
    this.logger.warn("ProcessManager signal received:", type);
    return (error?: Error) => {
      if (error) {
        this.logger.error(type, error);
      }

      return callback();
    };
  }

  private registerUnhandlerRejections() {
    self.addEventListener("unhandledrejection", (event) => {
      this.wrapWithTaskAndLog(
        "unhandledRejection",
        () => this.stopProcess(),
      )(event.reason);
    });
  }

  private registerUncaughtExceptions() {
    self.addEventListener("error", (event) => {
      const error = event.error as Error;
      this.wrapWithTaskAndLog(
        "uncaughtException",
        () => this.stopProcess(),
      )(error);
    });
  }

  private registerStopManager() {
    const stopSignals: Deno.Signal[] = [
      "SIGTERM",
      "SIGINT",
      "SIGHUP",
      "SIGABRT",
      "SIGQUIT",
      "SIGUSR1",
      "SIGUSR2",
    ];

    stopSignals.forEach((signal) => {
      Deno.addSignalListener(signal, () => {
        this.wrapWithTaskAndLog(
          signal,
          () => this.stopProcess(),
        )();
      });
    });
  }

  private async stopProcess() {
    if (this.stopping) {
        this.logger.info('Already stopping process... wait')
        return;
    }

    this.logger.info('Stopping process...');

    this.abortController.abort();

    for (const task of this.stepsToDoOnExit) {
      try {
        await task();
      } catch (error) {
        this.logger.error(error);
        this.process.exit(1);
      }
    }

    this.process.exit(0);
  }

  public stop() {
    console.log("stop() called");
    this.stopProcess();
  }
}
