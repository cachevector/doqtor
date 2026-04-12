import { Hono } from "hono";
import { loadEnv } from "./env.js";
import { createLogger, setLogLevel } from "./logger.js";
import type { LogLevel } from "./logger.js";
import { enqueue } from "./queue.js";
import { orchestrate, fetchConfig } from "./orchestrator.js";
import { addToBatch } from "./batcher.js";
import { getStats } from "./stats.js";
import {
  createWebhookHandler,
  parsePullRequestEvent,
  verifyWebhookSignature,
  createInstallationOctokit,
  convertManifestCode,
  GitHubService,
} from "@doqtor/github";
import type { GitHubAppConfig } from "@doqtor/github";

const app = new Hono<{ Variables: { env: any } }>();
const log = createLogger({ module: "server" });

function getContext(overrideEnv?: any) {
  const env = overrideEnv || loadEnv();
  setLogLevel(env.LOG_LEVEL as LogLevel);
  const contextLog = createLogger({ module: "server" });

  const appConfig: GitHubAppConfig | null =
    env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY
      ? {
          appId: env.GITHUB_APP_ID,
          privateKey: env.GITHUB_PRIVATE_KEY,
          webhookSecret: env.GITHUB_WEBHOOK_SECRET || "",
        }
      : null;

  const webhooks = env.GITHUB_WEBHOOK_SECRET
    ? createWebhookHandler(env.GITHUB_WEBHOOK_SECRET)
    : null;

  return { env, log: contextLog, appConfig, webhooks };
}

app.use("*", async (c, next) => {
  const testEnv = c.req.header("x-test-env");
  if (testEnv) {
    try {
      const parsed = JSON.parse(testEnv);
      c.set("env", parsed);
    } catch {
      // Ignore
    }
  }
  await next();
});

app.get("/health", (c) => {
  const { appConfig } = getContext(c.get("env"));
  return c.json({ status: "ok", timestamp: new Date().toISOString(), configured: !!appConfig });
});

app.get("/api/stats", (c) => {
  return c.json(getStats());
});

app.get("/dashboard", (c) => {
  const stats = getStats();
  const driftByType = Object.entries(stats.driftByType).map(([type, count]) => `<li>${type}: ${count}</li>`).join("");
  const driftByFile = Object.entries(stats.driftByFile).map(([file, count]) => `<li>${file}: ${count}</li>`).join("");

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Doqtor Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; background: #f9f9f9; }
          .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
          h1 { color: #333; }
          .metric { font-size: 2em; font-weight: bold; color: #007bff; }
          ul { padding-left: 20px; }
        </style>
      </head>
      <body>
        <h1>Doqtor Drift Analytics</h1>
        <div class="card">
          <p>Total PRs Processed</p>
          <div class="metric">${stats.totalPrsProcessed}</div>
        </div>
        <div class="card">
          <p>Total Drift Detected</p>
          <div class="metric">${stats.totalDriftDetected}</div>
        </div>
        <div class="card">
          <h3>Drift by Type</h3>
          <ul>${driftByType || "<li>No drift detected yet</li>"}</ul>
        </div>
        <div class="card">
          <h3>Top Drifting Files</h3>
          <ul>${driftByFile || "<li>No drift detected yet</li>"}</ul>
        </div>
        <p><small>Last processed: ${stats.lastProcessed || "Never"}</small></p>
      </body>
    </html>
  `);
});

app.get("/setup-complete", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.text("Missing setup code", 400);

  try {
    const manifest = await convertManifestCode(code);
    return c.html(`
      <h1>Setup Complete!</h1>
      <p>Add these variables to your <code>.env</code> file and restart the server:</p>
      <pre style="background: #f4f4f4; padding: 20px;">
GITHUB_APP_ID=${manifest.id}
GITHUB_PRIVATE_KEY="${manifest.pem.replace(/\n/g, "\\n")}"
GITHUB_WEBHOOK_SECRET=${manifest.webhook_secret}
      </pre>
      <p>After restarting, you can install the app on your repositories.</p>
    `);
  } catch (error) {
    return c.text("Failed to complete setup: " + (error instanceof Error ? error.message : "Unknown error"), 500);
  }
});

app.post("/webhook", async (c) => {
  const { log: contextLog, appConfig, webhooks } = getContext(c.get("env"));
  
  if (!appConfig || !webhooks) {
    contextLog.warn("Webhook received but app not configured");
    return c.json({ error: "App not configured" }, 503);
  }

  const signature = c.req.header("x-hub-signature-256") ?? "";
  const body = await c.req.text();

  const valid = await verifyWebhookSignature(webhooks, signature, body);
  if (!valid) {
    contextLog.warn("Invalid webhook signature");
    return c.json({ error: "Invalid signature" }, 401);
  }

  const event = c.req.header("x-github-event");
  if (event !== "pull_request") {
    return c.json({ status: "ignored", event });
  }

  const payload = JSON.parse(body) as Record<string, unknown>;
  const prEvent = parsePullRequestEvent(payload);

  if (!prEvent) {
    contextLog.warn("Failed to parse PR event");
    return c.json({ error: "Invalid payload" }, 400);
  }

  if (prEvent.action !== "closed" || !prEvent.merged) {
    contextLog.info("PR not merged, skipping", { action: prEvent.action, merged: prEvent.merged });
    return c.json({ status: "skipped", reason: "PR not merged" });
  }

  contextLog.info("Processing merged PR", {
    owner: prEvent.owner,
    repo: prEvent.repo,
    pr: prEvent.number,
  });

  const octokit = await createInstallationOctokit(appConfig, prEvent.installationId);
  const github = new GitHubService(octokit);
  const config = await fetchConfig(github, {
    owner: prEvent.owner,
    repo: prEvent.repo,
    baseBranch: prEvent.baseBranch,
  });

  const batchWindowMs = (config.batchWindow || 0) * 60 * 1000;

  if (batchWindowMs > 0) {
    addToBatch({
      owner: prEvent.owner,
      repo: prEvent.repo,
      branch: prEvent.baseBranch,
      prNumber: prEvent.number,
      octokit,
      windowMs: batchWindowMs,
    });
  } else {
    enqueue(async () => {
      try {
        await orchestrate({
          owner: prEvent.owner,
          repo: prEvent.repo,
          prNumbers: [prEvent.number],
          baseBranch: prEvent.baseBranch,
          octokit,
        });
      } catch (error) {
        contextLog.error("Pipeline failed", {
          owner: prEvent.owner,
          repo: prEvent.repo,
          pr: prEvent.number,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  return c.json({ status: batchWindowMs > 0 ? "batched" : "queued", pr: prEvent.number });
});

log.info("Server starting");

export { app };

export default {
  port: loadEnv().PORT,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
