import { createLogger } from "./logger.js";
import { enqueue } from "./queue.js";
import { orchestrate } from "./orchestrator.js";
import type { Octokit } from "@octokit/rest";

const log = createLogger({ module: "batcher" });

interface BatchEntry {
  owner: string;
  repo: string;
  branch: string;
  prNumbers: Set<number>;
  timer?: Timer;
  octokit: Octokit;
}

const batches = new Map<string, BatchEntry>();

export function addToBatch(input: {
  owner: string;
  repo: string;
  branch: string;
  prNumber: number;
  octokit: Octokit;
  windowMs: number;
}) {
  const key = `${input.owner}/${input.repo}/${input.branch}`;
  let batch = batches.get(key);

  if (!batch) {
    batch = {
      owner: input.owner,
      repo: input.repo,
      branch: input.branch,
      prNumbers: new Set(),
      octokit: input.octokit,
    };
    batches.set(key, batch);
  }

  batch.prNumbers.add(input.prNumber);
  
  // Update octokit in case tokens refreshed
  batch.octokit = input.octokit;

  if (batch.timer) {
    clearTimeout(batch.timer);
  }

  batch.timer = setTimeout(() => {
    processBatch(key);
  }, input.windowMs);

  log.info("PR added to batch", { 
    repo: key, 
    pr: input.prNumber, 
    batchCount: batch.prNumbers.size,
    windowMs: input.windowMs 
  });
}

async function processBatch(key: string) {
  const batch = batches.get(key);
  if (!batch) return;

  batches.delete(key);

  const prNumbers = Array.from(batch.prNumbers).sort((a, b) => a - b);
  
  log.info("Flushing batch", { repo: key, prs: prNumbers });

  enqueue(async () => {
    try {
      await orchestrate({
        owner: batch.owner,
        repo: batch.repo,
        prNumbers: prNumbers,
        baseBranch: batch.branch,
        octokit: batch.octokit,
      });
    } catch (error) {
      log.error("Batched pipeline failed", {
        repo: key,
        prs: prNumbers,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
