import { describe, it, expect } from "vitest";
import { analyzeDiff } from "../diff-analyzer.js";
import { detectDrift } from "../drift-detector.js";
import type { ParsedSymbol } from "../types.js";

/**
 * Minimal inline parser for integration tests — avoids depending on @doqtor/parser
 * to keep core-engine tests self-contained.
 */
function simpleParse(_path: string, content: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const fnRegex = /(?:export\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/g;
  let match;

  while ((match = fnRegex.exec(content)) !== null) {
    const name = match[1]!;
    const paramsStr = match[2] ?? "";
    const returnType = match[3] ?? "void";

    const params = paramsStr
      .split(",")
      .filter((p) => p.trim())
      .map((p) => {
        const parts = p.trim().split(/\s*:\s*/);
        return {
          name: parts[0]!.replace("?", ""),
          type: parts[1] ?? "unknown",
          optional: p.includes("?"),
        };
      });

    symbols.push({
      name,
      kind: "function",
      filePath: _path,
      line: 1,
      parameters: params,
      returnType,
      exported: content.includes(`export function ${name}`),
    });
  }

  return symbols;
}

describe("end-to-end pipeline", () => {
  it("detects drift from a realistic diff", async () => {
    const diff = `diff --git a/src/api.ts b/src/api.ts
--- a/src/api.ts
+++ b/src/api.ts
@@ -1,5 +1,5 @@
-export function createUser(name: string, email: string): User {
-  return db.insert({ name, email });
+export function createUser(name: string): User {
+  return db.insert({ name });
 }

 export function deleteUser(id: number): void {
`;

    const oldContent = `export function createUser(name: string, email: string): User {
  return db.insert({ name, email });
}

export function deleteUser(id: number): void {
  db.remove(id);
}`;

    const newContent = `export function createUser(name: string): User {
  return db.insert({ name });
}

export function deleteUser(id: number): void {
  db.remove(id);
}`;

    const changeSets = await analyzeDiff({
      diff,
      getFileContent: async (path, ref) => {
        if (path === "src/api.ts") return ref === "old" ? oldContent : newContent;
        return null;
      },
      parseFn: simpleParse,
    });

    expect(changeSets).toHaveLength(1);
    expect(changeSets[0]!.modified).toHaveLength(1);
    expect(changeSets[0]!.modified[0]!.before.parameters).toHaveLength(2);
    expect(changeSets[0]!.modified[0]!.after.parameters).toHaveLength(1);

    // Now simulate doc matching + drift detection
    const docRefs = [
      {
        docFilePath: "README.md",
        lineStart: 10,
        lineEnd: 15,
        symbolName: "createUser",
        matchType: "name" as const,
        content: "```typescript\nconst user = createUser(name, email);\n```",
      },
    ];

    const report = detectDrift({ changeSets, docReferences: docRefs });

    expect(report.items.length).toBeGreaterThan(0);

    const sigItem = report.items.find((i) => i.type === "signature-mismatch");
    const exItem = report.items.find((i) => i.type === "outdated-example");

    expect(sigItem || exItem).toBeDefined();
  });

  it("handles a file with added and removed functions", async () => {
    const diff = `diff --git a/src/utils.ts b/src/utils.ts
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,3 +1,3 @@
-export function oldHelper(): void {}
+export function newHelper(): void {}
`;

    const changeSets = await analyzeDiff({
      diff,
      getFileContent: async (_path, ref) => {
        if (ref === "old") return "export function oldHelper(): void {}";
        return "export function newHelper(): void {}";
      },
      parseFn: simpleParse,
    });

    expect(changeSets[0]!.added).toHaveLength(1);
    expect(changeSets[0]!.added[0]!.name).toBe("newHelper");
    expect(changeSets[0]!.removed).toHaveLength(1);
    expect(changeSets[0]!.removed[0]!.name).toBe("oldHelper");

    const docRefs = [
      {
        docFilePath: "docs/api.md",
        lineStart: 1,
        lineEnd: 1,
        symbolName: "oldHelper",
        matchType: "name" as const,
        content: "Use `oldHelper()` for utility operations.",
      },
    ];

    const report = detectDrift({ changeSets, docReferences: docRefs });

    expect(report.items.some((i) => i.type === "removed-symbol")).toBe(true);
    expect(report.items.some((i) => i.type === "renamed-symbol")).toBe(true);
  });
});

describe("edge cases", () => {
  it("handles empty diff", async () => {
    const changeSets = await analyzeDiff({
      diff: "",
      getFileContent: async () => null,
      parseFn: simpleParse,
    });

    expect(changeSets).toHaveLength(0);
  });

  it("handles diff with only non-TS files", async () => {
    const diff = `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1,1 +1,1 @@
-# Old
+# New
diff --git a/image.png b/image.png
Binary files differ
`;

    const changeSets = await analyzeDiff({
      diff,
      getFileContent: async () => null,
      parseFn: simpleParse,
    });

    expect(changeSets).toHaveLength(0);
  });

  it("handles diff with .d.ts files (should skip)", async () => {
    const diff = `diff --git a/types.d.ts b/types.d.ts
--- a/types.d.ts
+++ b/types.d.ts
@@ -1,1 +1,1 @@
-declare const x: number;
+declare const x: string;
`;

    const changeSets = await analyzeDiff({
      diff,
      getFileContent: async () => "declare const x: string;",
      parseFn: simpleParse,
    });

    expect(changeSets).toHaveLength(0);
  });

  it("handles file content that cannot be fetched", async () => {
    const diff = `diff --git a/src/gone.ts b/src/gone.ts
--- a/src/gone.ts
+++ b/src/gone.ts
@@ -1,1 +1,1 @@
-const x = 1;
+const x = 2;
`;

    const changeSets = await analyzeDiff({
      diff,
      getFileContent: async () => null,
      parseFn: simpleParse,
    });

    expect(changeSets).toHaveLength(0);
  });

  it("drift detection with no doc references returns empty report", () => {
    const report = detectDrift({
      changeSets: [
        {
          filePath: "src/api.ts",
          added: [
            {
              name: "newFn",
              kind: "function",
              filePath: "src/api.ts",
              line: 1,
              exported: true,
            },
          ],
          removed: [],
          modified: [],
        },
      ],
      docReferences: [],
    });

    expect(report.items).toHaveLength(0);
  });
});
