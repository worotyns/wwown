export interface Logger {
    info: (...args: any[]) => void
    log: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
}

export function createLogger(): Logger {
    return console;
}

export function createFakeLogger(): Logger {
    return {
        log(...args: any[]) {},
        error(...args: any[]) {},
        warn(...args: any[]) {},
        info(...args: any[]) {}
    }
}