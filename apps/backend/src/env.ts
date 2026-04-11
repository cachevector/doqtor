export interface Env {
  PORT: number;
  GITHUB_APP_ID?: string;
  GITHUB_PRIVATE_KEY?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  LOG_LEVEL: string;
}

export function loadEnv(): Env {
  const optional = (key: string): string | undefined => {
    const val = process.env[key];
    if (key === "GITHUB_PRIVATE_KEY" && val) {
      return val.replace(/\\n/g, "\n");
    }
    return val;
  };

  return {
    PORT: Number(process.env.PORT) || 3000,
    GITHUB_APP_ID: optional("GITHUB_APP_ID"),
    GITHUB_PRIVATE_KEY: optional("GITHUB_PRIVATE_KEY"),
    GITHUB_WEBHOOK_SECRET: optional("GITHUB_WEBHOOK_SECRET"),
    LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  };
}
