import { describe, it, expect } from "vitest";
import { generateFixes } from "../fixer.js";
import type { DriftReport, DriftItem, DocReference } from "@doqtor/core-engine";

function ref(symbolName: string, content: string): DocReference {
  return {
    docFilePath: "README.md",
    lineStart: 1,
    lineEnd: 5,
    symbolName,
    matchType: "name",
    content,
  };
}

function makeReport(items: DriftItem[]): DriftReport {
  return { items, changeSets: [], docReferences: [] };
}

describe("generateFixes", () => {
  describe("signature mismatch", () => {
    it("replaces old function call with new params", async () => {
      const item: DriftItem = {
        type: "signature-mismatch",
        symbolName: "createUser",
        docReference: ref("createUser", "Call `createUser(name, email)` to create a user."),
        oldValue: "createUser(name, email): void",
        newValue: "createUser(name): void",
        confidence: 0.9,
      };

      const patches = await generateFixes(makeReport([item]));

      expect(patches).toHaveLength(1);
      expect(patches[0]!.newText).toContain("createUser(name)");
      expect(patches[0]!.newText).not.toContain("createUser(name, email)");
    });
  });

  describe("removed symbol", () => {
    it("removes lines referencing the deleted symbol", async () => {
      const item: DriftItem = {
        type: "removed-symbol",
        symbolName: "deprecatedFn",
        docReference: ref(
          "deprecatedFn",
          "Use `deprecatedFn()` for legacy support.\nThis is another line.",
        ),
        oldValue: "deprecatedFn",
        newValue: "(removed)",
        confidence: 0.9,
      };

      const patches = await generateFixes(makeReport([item]));

      expect(patches).toHaveLength(1);
      expect(patches[0]!.newText).not.toContain("deprecatedFn");
      expect(patches[0]!.newText).toContain("This is another line.");
    });
  });

  describe("renamed symbol", () => {
    it("replaces old name with new name throughout doc", async () => {
      const item: DriftItem = {
        type: "renamed-symbol",
        symbolName: "getUsers",
        docReference: ref(
          "getUsers",
          "Call `getUsers()` to list all users.\nThe getUsers function returns an array.",
        ),
        oldValue: "getUsers",
        newValue: "fetchUsers",
        confidence: 0.75,
      };

      const patches = await generateFixes(makeReport([item]));

      expect(patches).toHaveLength(1);
      expect(patches[0]!.newText).toContain("fetchUsers()");
      expect(patches[0]!.newText).toContain("fetchUsers function");
      expect(patches[0]!.newText).not.toContain("getUsers");
    });
  });

  describe("outdated example", () => {
    it("updates code example with new call pattern", async () => {
      const item: DriftItem = {
        type: "outdated-example",
        symbolName: "send",
        docReference: ref(
          "send",
          "```typescript\nconst result = send(url, body);\nconsole.log(result);\n```",
        ),
        oldValue: "send(url, body)",
        newValue: "send(url, body, options)",
        confidence: 0.8,
      };

      const patches = await generateFixes(makeReport([item]));

      expect(patches).toHaveLength(1);
      expect(patches[0]!.newText).toContain("send(url, body, options)");
      expect(patches[0]!.newText).not.toContain("send(url, body);\n");
    });
  });

  describe("AI fallback", () => {
    it("uses AI provider when deterministic fix fails", async () => {
      const item: DriftItem = {
        type: "signature-mismatch",
        symbolName: "complexFn",
        docReference: ref("complexFn", "This function does complex things."),
        oldValue: "complexFn(a, b): string",
        newValue: "complexFn(a): number",
        confidence: 0.5,
      };

      const mockProvider = {
        name: "mock",
        generateFix: async () => ({
          fixedContent: "This function does complex things with updated params.",
        }),
      };

      const patches = await generateFixes(makeReport([item]), {
        aiProvider: mockProvider,
      });

      expect(patches).toHaveLength(1);
      expect(patches[0]!.newText).toContain("updated params");
    });

    it("handles AI provider errors gracefully", async () => {
      const item: DriftItem = {
        type: "signature-mismatch",
        symbolName: "failFn",
        docReference: ref("failFn", "No matching call pattern here."),
        oldValue: "failFn(x): void",
        newValue: "failFn(): void",
        confidence: 0.5,
      };

      const failingProvider = {
        name: "failing",
        generateFix: async () => {
          throw new Error("API down");
        },
      };

      const patches = await generateFixes(makeReport([item]), {
        aiProvider: failingProvider,
      });

      expect(patches).toHaveLength(0);
    });
  });

  describe("multiple items", () => {
    it("generates patches for multiple drift items", async () => {
      const items: DriftItem[] = [
        {
          type: "renamed-symbol",
          symbolName: "oldName",
          docReference: ref("oldName", "Use oldName to do things."),
          oldValue: "oldName",
          newValue: "newName",
          confidence: 0.75,
        },
        {
          type: "outdated-example",
          symbolName: "api",
          docReference: ref("api", "```\napi(x, y)\n```"),
          oldValue: "api(x, y)",
          newValue: "api(x)",
          confidence: 0.8,
        },
      ];

      const patches = await generateFixes(makeReport(items));
      expect(patches).toHaveLength(2);
    });
  });
});
