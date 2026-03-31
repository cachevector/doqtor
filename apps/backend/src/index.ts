import { Hono } from "hono";
import { loadEnv } from "./env.js";
import { createLogger, setLogLevel } from "./logger.js";
import type { LogLevel } from "./logger.js";
import { enqueue } from "./queue.js";
import { orchestrate } from "./orchestrator.js";
import {
  createWebhookHandler,
  parsePullRequestEvent,
  verifyWebhookSignature,
  createInstallationOctokit,
} from "@doqtor/github";
import type { GitHubAppConfig } from "@doqtor/github";

const env = loadEnv();
setLogLevel(env.LOG_LEVEL as LogLevel);

const log = createLogger({ module: "server" });
const app = new Hono();

const appConfig: GitHubAppConfig = {
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_PRIVATE_KEY,
  webhookSecret: env.GITHUB_WEBHOOK_SECRET,
};

const webhooks = createWebhookHandler(env.GITHUB_WEBHOOK_SECRET);

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/webhook", async (c) => {
  const signature = c.req.header("x-hub-signature-256") ?? "";
  const body = await c.req.text();

  const valid = await verifyWebhookSignature(webhooks, signature, body);
  if (!valid) {
    log.warn("Invalid webhook signature");
    return c.json({ error: "Invalid signature" }, 401);
  }

  const event = c.req.header("x-github-event");
  if (event !== "pull_request") {
    return c.json({ status: "ignored", event });
  }

  const payload = JSON.parse(body) as Record<string, unknown>;
  const prEvent = parsePullRequestEvent(payload);

  if (!prEvent) {
    log.warn("Failed to parse PR event");
    return c.json({ error: "Invalid payload" }, 400);
  }

  if (prEvent.action !== "closed" || !prEvent.merged) {
    log.info("PR not merged, skipping", { action: prEvent.action, merged: prEvent.merged });
    return c.json({ status: "skipped", reason: "PR not merged" });
  }

  log.info("Processing merged PR", {
    owner: prEvent.owner,
    repo: prEvent.repo,
    pr: prEvent.number,
  });

  enqueue(async () => {
    try {
      const octokit = await createInstallationOctokit(appConfig, prEvent.installationId);
      await orchestrate({
        owner: prEvent.owner,
        repo: prEvent.repo,
        prNumber: prEvent.number,
        baseBranch: prEvent.baseBranch,
        octokit,
      });
    } catch (error) {
      log.error("Pipeline failed", {
        owner: prEvent.owner,
        repo: prEvent.repo,
        pr: prEvent.number,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return c.json({ status: "queued", pr: prEvent.number });
});

log.info("Server starting", { port: env.PORT });

export default {
  port: env.PORT,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
