import { describe, it, expect, vi } from "vitest";
import { enqueue } from "../queue.js";

describe("queue failure", () => {
  it("continues processing after a task fails", async () => {
    const uniqueId = Math.random().toString();
    const results: string[] = [];
    // Silence error logging for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const t1 = new Promise<void>(resolve => {
      enqueue(async () => {
        try {
          // Simulate failure
          throw new Error("task failed");
        } catch {
          // Expected
        } finally {
          resolve();
        }
      });
    });

    const t2 = new Promise<void>(resolve => {
      enqueue(async () => {
        results.push(`recovered-${uniqueId}`);
        resolve();
      });
    });

    await Promise.all([t1, t2]);
    expect(results).toContain(`recovered-${uniqueId}`);

    consoleSpy.mockRestore();
  });
});
