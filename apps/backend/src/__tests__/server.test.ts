import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocking dependencies before importing app
vi.mock("@doqtor/github", () => ({
  convertManifestCode: vi.fn(),
  createWebhookHandler: vi.fn().mockReturnValue({
    verify: vi.fn().mockResolvedValue(true),
  }),
  parsePullRequestEvent: vi.fn(),
  verifyWebhookSignature: vi.fn().mockResolvedValue(true),
  GitHubService: vi.fn().mockImplementation(() => ({})),
  createInstallationOctokit: vi.fn().mockResolvedValue({}),
}));

vi.mock("../orchestrator.js", () => ({
  orchestrate: vi.fn(),
  fetchConfig: vi.fn(),
}));

vi.mock("../batcher.js", () => ({
  addToBatch: vi.fn(),
}));

vi.mock("../queue.js", () => ({
  enqueue: vi.fn(),
}));

import * as envModule from "../env.js";

// Import app after mocks
import { app } from "../index.js";

const testEnv = JSON.stringify({
  PORT: 3000,
  LOG_LEVEL: "info",
  GITHUB_APP_ID: "123",
  GITHUB_PRIVATE_KEY: "key",
  GITHUB_WEBHOOK_SECRET: "secret",
});

describe("Server Setup Flow", () => {
  beforeEach(() => {
    vi.spyOn(envModule, "loadEnv").mockReturnValue({
      PORT: 3000,
      LOG_LEVEL: "info",
      GITHUB_APP_ID: "123",
      GITHUB_PRIVATE_KEY: "key",
      GITHUB_WEBHOOK_SECRET: "secret",
    });
  });

  it("GET /health should return 200 and configured: true with test env", async () => {
    const res = await app.request("/health", {
      headers: { "x-test-env": testEnv }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.configured).toBe(true);
  });

  it("POST /webhook should batch PRs when batchWindow > 0", async () => {
    const { parsePullRequestEvent } = await import("@doqtor/github");
    const { fetchConfig } = await import("../orchestrator.js");
    const { addToBatch } = await import("../batcher.js");
    
    (fetchConfig as any).mockResolvedValue({ batchWindow: 5, autoPR: true });
    (parsePullRequestEvent as any).mockImplementation(() => ({
      action: "closed",
      merged: true,
      owner: "owner",
      repo: "repo",
      number: 123,
      installationId: 456,
      baseBranch: "main",
    }));

    const res = await app.request("/webhook", {
      method: "POST",
      headers: {
        "x-hub-signature-256": "sha256=...",
        "x-github-event": "pull_request",
        "x-test-env": testEnv
      },
      body: JSON.stringify({ action: "closed" })
    });
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("batched");
    expect(addToBatch).toHaveBeenCalled();
  });

  it("POST /webhook should enqueue immediately when batchWindow is 0", async () => {
    const { parsePullRequestEvent } = await import("@doqtor/github");
    const { fetchConfig } = await import("../orchestrator.js");
    const { enqueue } = await import("../queue.js");
    
    (fetchConfig as any).mockResolvedValue({ batchWindow: 0, autoPR: true });
    (parsePullRequestEvent as any).mockImplementation(() => ({
      action: "closed",
      merged: true,
      owner: "owner",
      repo: "repo",
      number: 124,
      installationId: 456,
      baseBranch: "main",
    }));

    const res = await app.request("/webhook", {
      method: "POST",
      headers: {
        "x-hub-signature-256": "sha256=...",
        "x-github-event": "pull_request",
        "x-test-env": testEnv
      },
      body: JSON.stringify({ action: "closed" })
    });
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("queued");
    expect(enqueue).toHaveBeenCalled();
  });
});
