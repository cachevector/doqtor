import { describe, it, expect } from "vitest";
import { parseDiff } from "../diff-parser.js";

const sampleDiff = `diff --git a/src/utils.ts b/src/utils.ts
index abc1234..def5678 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,5 +1,6 @@
 export function greet(name: string): string {
-  return "hello " + name;
+  return "Hello, " + name + "!";
 }
+
+export function farewell(name: string): string { return "bye " + name; }
`;

describe("parseDiff", () => {
  it("parses a simple modified file diff", () => {
    const files = parseDiff(sampleDiff);

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      oldPath: "src/utils.ts",
      newPath: "src/utils.ts",
      status: "modified",
    });
    expect(files[0]!.hunks).toHaveLength(1);
    expect(files[0]!.hunks[0]).toMatchObject({
      oldStart: 1,
      oldCount: 5,
      newStart: 1,
      newCount: 6,
    });
  });

  it("parses a new file diff", () => {
    const diff = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+export function hello() {
+  return "world";
+}
`;
    const files = parseDiff(diff);

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      oldPath: "/dev/null",
      newPath: "src/new.ts",
      status: "added",
    });
  });

  it("parses a deleted file diff", () => {
    const diff = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function old() {
-  return "gone";
-}
`;
    const files = parseDiff(diff);

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      oldPath: "src/old.ts",
      newPath: "/dev/null",
      status: "deleted",
    });
  });

  it("parses multiple files in one diff", () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,1 +1,1 @@
-const x = 1;
+const x = 2;
diff --git a/src/b.ts b/src/b.ts
--- a/src/b.ts
+++ b/src/b.ts
@@ -1,1 +1,1 @@
-const y = 1;
+const y = 2;
`;
    const files = parseDiff(diff);
    expect(files).toHaveLength(2);
    expect(files[0]!.newPath).toBe("src/a.ts");
    expect(files[1]!.newPath).toBe("src/b.ts");
  });

  it("parses multiple hunks in one file", () => {
    const diff = `diff --git a/src/big.ts b/src/big.ts
--- a/src/big.ts
+++ b/src/big.ts
@@ -1,3 +1,3 @@
-const a = 1;
+const a = 2;
 const b = 2;
 const c = 3;
@@ -10,3 +10,3 @@
-const x = 1;
+const x = 2;
 const y = 2;
 const z = 3;
`;
    const files = parseDiff(diff);
    expect(files[0]!.hunks).toHaveLength(2);
    expect(files[0]!.hunks[0]!.oldStart).toBe(1);
    expect(files[0]!.hunks[1]!.oldStart).toBe(10);
  });

  it("returns empty array for empty input", () => {
    expect(parseDiff("")).toEqual([]);
  });
});
