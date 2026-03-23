import { describe, it, expect } from "vitest";
import { parsePullRequestEvent } from "../webhook.js";

describe("parsePullRequestEvent", () => {
  const validPayload = {
    action: "closed",
    pull_request: {
      number: 42,
      merged: true,
      base: { ref: "main" },
      head: { ref: "feature/update-api" },
    },
    repository: {
      name: "doqtor",
      owner: { login: "cachevector" },
    },
    installation: { id: 12345 },
  };

  it("parses a valid pull_request.closed event", () => {
    const event = parsePullRequestEvent(validPayload);

    expect(event).toMatchObject({
      action: "closed",
      number: 42,
      merged: true,
      owner: "cachevector",
      repo: "doqtor",
      installationId: 12345,
      baseBranch: "main",
      headBranch: "feature/update-api",
    });
  });

  it("returns null for missing pull_request", () => {
    const event = parsePullRequestEvent({ action: "closed" });
    expect(event).toBeNull();
  });

  it("returns null for missing repository", () => {
    const event = parsePullRequestEvent({
      action: "closed",
      pull_request: { number: 1, merged: false, base: { ref: "main" }, head: { ref: "fix" } },
      installation: { id: 1 },
    });
    expect(event).toBeNull();
  });

  it("returns null for missing installation", () => {
    const event = parsePullRequestEvent({
      action: "closed",
      pull_request: { number: 1, merged: false, base: { ref: "main" }, head: { ref: "fix" } },
      repository: { name: "repo", owner: { login: "user" } },
    });
    expect(event).toBeNull();
  });

  it("correctly reports unmerged PR", () => {
    const payload = {
      ...validPayload,
      pull_request: { ...validPayload.pull_request, merged: false },
    };

    const event = parsePullRequestEvent(payload);
    expect(event!.merged).toBe(false);
  });
});
