export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function createLogger(context: Record<string, unknown> = {}) {
  function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (LEVELS[level] < LEVELS[currentLevel]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      ...data,
    };

    const output = JSON.stringify(entry);

    if (level === "error") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
  };
}
