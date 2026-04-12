import { describe, it, expect } from "vitest";
import { analyzeDiff } from "../diff-analyzer.js";
import type { ParsedSymbol } from "../types.js";

async function mockParseFn(_filePath: string, content: string): Promise<ParsedSymbol[]> {
  const symbols: ParsedSymbol[] = [];
  const fnRegex = /(?:export )?function (\w+)\(([^)]*)\)/g;
  let match;

  while ((match = fnRegex.exec(content)) !== null) {
    const name = match[1]!;
    const paramsStr = match[2] ?? "";
    const params = paramsStr
      .split(",")
      .filter(Boolean)
      .map((p) => {
        const [pName, pType] = p.trim().split(":").map((s) => s.trim());
        return { name: pName!, type: pType ?? "any", optional: false };
      });

    symbols.push({
      name,
      kind: "function",
      filePath: _filePath,
      line: 1,
      parameters: params,
      returnType: "void",
      exported: content.includes(`export function ${name}`),
    });
  }

  return symbols;
}

function makeFileStore(files: Record<string, Record<string, string>>) {
  return async (path: string, ref: "old" | "new"): Promise<string | null> => {
    return files[ref]?.[path] ?? null;
  };
}

describe("analyzeDiff", () => {
  it("detects added symbols in a new file", async () => {
    const diff = `diff --git a/src/utils.ts b/src/utils.ts
new file mode 100644
--- /dev/null
+++ b/src/utils.ts
@@ -0,0 +1,3 @@
+export function greet(name: string) {}
`;
    const changeSets = await analyzeDiff({
      diff,
      getFileContent: makeFileStore({
        old: {},
        new: { "src/utils.ts": 'export function greet(name: string) {}' },
      }),
      parseFn: mockParseFn,
    });

    expect(changeSets).toHaveLength(1);
    expect(changeSets[0]!.added).toHaveLength(1);
    expect(changeSets[0]!.added[0]!.name).toBe("greet");
    expect(changeSets[0]!.removed).toHaveLength(0);
  });

  it("detects removed symbols in a deleted file", async () => {
    const diff = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1,1 +0,0 @@
-export function old() {}
`;
    const changeSets = await analyzeDiff({
      diff,
      getFileContent: makeFileStore({
        old: { "src/old.ts": "export function old() {}" },
        new: {},
      }),
      parseFn: mockParseFn,
    });

    expect(changeSets).toHaveLength(1);
    expect(changeSets[0]!.removed).toHaveLength(1);
    expect(changeSets[0]!.removed[0]!.name).toBe("old");
  });

  it("detects modified symbols (parameter change)", async () => {
    const diff = `diff --git a/src/api.ts b/src/api.ts
--- a/src/api.ts
+++ b/src/api.ts
@@ -1,1 +1,1 @@
-export function create(name: string, email: string) {}
+export function create(name: string) {}
`;
    const changeSets = await analyzeDiff({
      diff,
      getFileContent: makeFileStore({
        old: { "src/api.ts": "export function create(name: string, email: string) {}" },
        new: { "src/api.ts": "export function create(name: string) {}" },
      }),
      parseFn: mockParseFn,
    });

    expect(changeSets).toHaveLength(1);
    expect(changeSets[0]!.modified).toHaveLength(1);
    expect(changeSets[0]!.modified[0]!.before.parameters).toHaveLength(2);
    expect(changeSets[0]!.modified[0]!.after.parameters).toHaveLength(1);
  });

  it("detects added and removed symbols in a modified file", async () => {
    const diff = `diff --git a/src/api.ts b/src/api.ts
--- a/src/api.ts
+++ b/src/api.ts
@@ -1,1 +1,1 @@
-export function oldFn() {}
+export function newFn() {}
`;
    const changeSets = await analyzeDiff({
      diff,
      getFileContent: makeFileStore({
        old: { "src/api.ts": "export function oldFn() {}" },
        new: { "src/api.ts": "export function newFn() {}" },
      }),
      parseFn: mockParseFn,
    });

    expect(changeSets).toHaveLength(1);
    expect(changeSets[0]!.added).toHaveLength(1);
    expect(changeSets[0]!.added[0]!.name).toBe("newFn");
    expect(changeSets[0]!.removed).toHaveLength(1);
    expect(changeSets[0]!.removed[0]!.name).toBe("oldFn");
  });

  it("skips non-TypeScript files", async () => {
    const diff = `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1,1 +1,1 @@
-# Old
+# New
`;
    const changeSets = await analyzeDiff({
      diff,
      getFileContent: makeFileStore({ old: {}, new: {} }),
      parseFn: mockParseFn,
    });

    expect(changeSets).toHaveLength(0);
  });

  it("handles empty diff", async () => {
    const changeSets = await analyzeDiff({
      diff: "",
      getFileContent: async () => null,
      parseFn: mockParseFn,
    });

    expect(changeSets).toHaveLength(0);
  });
});
