import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addToBatch } from "../batcher.js";
import { orchestrate } from "../orchestrator.js";
import { enqueue } from "../queue.js";

vi.mock("../orchestrator.js", () => ({
  orchestrate: vi.fn(),
}));

vi.mock("../queue.js", () => ({
  enqueue: vi.fn((fn) => fn()),
}));

describe("batcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should aggregate multiple PRs within the window", async () => {
    const octokit = {} as any;
    const input = {
      owner: "owner",
      repo: "repo",
      branch: "main",
      octokit,
      windowMs: 1000,
    };

    addToBatch({ ...input, prNumber: 1 });
    addToBatch({ ...input, prNumber: 2 });
    addToBatch({ ...input, prNumber: 3 });

    expect(orchestrate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(enqueue).toHaveBeenCalled();
    expect(orchestrate).toHaveBeenCalledWith(expect.objectContaining({
      prNumbers: [1, 2, 3],
      owner: "owner",
      repo: "repo",
      baseBranch: "main",
    }));
  });

  it("should reset timer on each new PR", () => {
    const octokit = {} as any;
    const input = {
      owner: "owner",
      repo: "repo",
      branch: "main",
      octokit,
      windowMs: 1000,
    };

    addToBatch({ ...input, prNumber: 1 });
    vi.advanceTimersByTime(500);
    addToBatch({ ...input, prNumber: 2 });
    vi.advanceTimersByTime(600);
    
    expect(orchestrate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(orchestrate).toHaveBeenCalledWith(expect.objectContaining({
      prNumbers: [1, 2],
    }));
  });

  it("should handle different repos independently", () => {
    const octokit = {} as any;
    
    addToBatch({ owner: "o1", repo: "r1", branch: "m", octokit, windowMs: 1000, prNumber: 1 });
    addToBatch({ owner: "o2", repo: "r2", branch: "m", octokit, windowMs: 1000, prNumber: 2 });

    vi.advanceTimersByTime(1000);

    expect(orchestrate).toHaveBeenCalledTimes(2);
  });
});
