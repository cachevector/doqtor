import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mocking dependencies before importing app
vi.mock("@doqtor/github", () => ({
  convertManifestCode: vi.fn(),
  createWebhookHandler: vi.fn(),
  parsePullRequestEvent: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}));

// We need to bypass env loading if possible or mock it
vi.mock("../env.js", () => ({
  loadEnv: () => ({
    PORT: 3000,
    LOG_LEVEL: "info",
  }),
}));

// Import app after mocks
import { app } from "../index.js";

describe("Server Setup Flow", () => {
  it("GET /health should return 200 and configured: false when env is missing", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.configured).toBe(false);
  });

  it("GET /setup-complete should return 400 when code is missing", async () => {
    const res = await app.request("/setup-complete");
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing setup code");
  });

  it("GET /setup-complete should call convertManifestCode and return HTML with credentials", async () => {
    const { convertManifestCode } = await import("@doqtor/github");
    const mockManifest = {
      id: 999,
      pem: "PRIVATE_KEY_CONTENT",
      webhook_secret: "secret123",
    };
    (convertManifestCode as any).mockResolvedValue(mockManifest);

    const res = await app.request("/setup-complete?code=abc-123");
    
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("GITHUB_APP_ID=999");
    expect(html).toContain("GITHUB_PRIVATE_KEY=\"PRIVATE_KEY_CONTENT\"");
    expect(html).toContain("GITHUB_WEBHOOK_SECRET=secret123");
    expect(convertManifestCode).toHaveBeenCalledWith("abc-123");
  });

  it("POST /webhook should return 503 when app is not configured", async () => {
    const res = await app.request("/webhook", {
      method: "POST",
      headers: {
        "x-hub-signature-256": "sha256=...",
        "x-github-event": "pull_request"
      },
      body: JSON.stringify({ action: "closed" })
    });
    
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("App not configured");
  });
});
