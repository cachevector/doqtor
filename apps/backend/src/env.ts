export interface Env {
  PORT: number;
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
  LOG_LEVEL: string;
}

export function loadEnv(): Env {
  const required = (key: string): string => {
    const val = process.env[key];
    if (!val) throw new Error(`Missing required env var: ${key}`);
    return val;
  };

  return {
    PORT: Number(process.env.PORT) || 3000,
    GITHUB_APP_ID: required("GITHUB_APP_ID"),
    GITHUB_PRIVATE_KEY: required("GITHUB_PRIVATE_KEY").replace(/\\n/g, "\n"),
    GITHUB_WEBHOOK_SECRET: required("GITHUB_WEBHOOK_SECRET"),
    LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  };
}
