// deno-lint-ignore-file no-explicit-any
export interface Logger {
  info: (...args: any[]) => void;
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

export function createLogger(): Logger {
  return console;
}
