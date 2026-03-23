import { describe, it, expect, vi } from "vitest";
import { enqueue } from "../queue.js";

describe("queue", () => {
  it("processes tasks sequentially", async () => {
    const order: number[] = [];

    enqueue(async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(1);
    });
    enqueue(async () => {
      order.push(2);
    });
    enqueue(async () => {
      order.push(3);
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(order).toEqual([1, 2, 3]);
  });

  it("continues processing after a task fails", async () => {
    const results: string[] = [];
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    enqueue(async () => {
      throw new Error("task failed");
    });
    enqueue(async () => {
      results.push("recovered");
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(results).toContain("recovered");

    consoleSpy.mockRestore();
  });
});
