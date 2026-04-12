import { describe, it, expect } from "vitest";
import { recordDrift, getStats } from "../stats.js";

describe("stats", () => {
  it("should record drift metrics", () => {
    const report = {
      items: [
        { type: "signature-mismatch", filePath: "README.md" },
        { type: "removed-symbol", filePath: "docs/api.md" },
        { type: "signature-mismatch", filePath: "docs/api.md" },
      ],
    };

    recordDrift(report);
    const stats = getStats();

    expect(stats.totalPrsProcessed).toBe(1);
    expect(stats.totalDriftDetected).toBe(3);
    expect(stats.driftByType["signature-mismatch"]).toBe(2);
    expect(stats.driftByType["removed-symbol"]).toBe(1);
    expect(stats.driftByFile["README.md"]).toBe(1);
    expect(stats.driftByFile["docs/api.md"]).toBe(2);
    expect(stats.lastProcessed).toBeDefined();
  });
});
