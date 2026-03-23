import { createLogger } from "./logger.js";

const logger = createLogger({ module: "queue" });

type Task = () => Promise<void>;

const queue: Task[] = [];
let processing = false;

export function enqueue(task: Task): void {
  queue.push(task);
  logger.debug("Task enqueued", { queueLength: queue.length });
  processNext();
}

async function processNext(): Promise<void> {
  if (processing || queue.length === 0) return;

  processing = true;
  const task = queue.shift()!;

  try {
    await task();
  } catch (error) {
    logger.error("Task failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    processing = false;
    processNext();
  }
}
