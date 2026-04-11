import { describe, it, expect } from "vitest";
import { enqueue } from "../queue.js";

describe("queue sequential", () => {
  it("processes tasks sequentially", async () => {
    const uniqueId = Math.random().toString();
    const order: string[] = [];

    const t1 = new Promise<void>(resolve => {
      enqueue(async () => {
        await new Promise(r => setTimeout(r, 50));
        order.push(`1-${uniqueId}`);
        resolve();
      });
    });

    const t2 = new Promise<void>(resolve => {
      enqueue(async () => {
        order.push(`2-${uniqueId}`);
        resolve();
      });
    });

    await Promise.all([t1, t2]);
    
    expect(order).toEqual([`1-${uniqueId}`, `2-${uniqueId}`]);
  });
});
