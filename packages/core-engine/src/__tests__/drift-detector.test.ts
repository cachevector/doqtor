import { describe, it, expect } from "vitest";
import { detectDrift } from "../drift-detector.js";
import type { ChangeSet, DocReference, ParsedSymbol } from "../types.js";

function sym(name: string, params: string[] = [], returnType = "void"): ParsedSymbol {
  return {
    name,
    kind: "function",
    filePath: "src/api.ts",
    line: 1,
    parameters: params.map((p) => ({ name: p, type: "string", optional: false })),
    returnType,
    exported: true,
  };
}

function docRef(symbolName: string, content: string, matchType: DocReference["matchType"] = "name"): DocReference {
  return {
    docFilePath: "README.md",
    lineStart: 1,
    lineEnd: 3,
    symbolName,
    matchType,
    content,
  };
}

describe("detectDrift", () => {
  it("detects signature mismatch when params change", () => {
    const changeSets: ChangeSet[] = [
      {
        filePath: "src/api.ts",
        added: [],
        removed: [],
        modified: [
          {
            before: sym("createUser", ["name", "email"]),
            after: sym("createUser", ["name"]),
          },
        ],
      },
    ];

    const docRefs: DocReference[] = [
      docRef("createUser", "Call `createUser(name, email)` to create a user."),
    ];

    const report = detectDrift({ changeSets, docReferences: docRefs });

    expect(report.items.length).toBeGreaterThan(0);
    expect(report.items[0]).toMatchObject({
      type: "signature-mismatch",
      symbolName: "createUser",
    });
    expect(report.items[0]!.confidence).toBeGreaterThan(0.5);
  });

  it("detects removed symbols referenced in docs", () => {
    const changeSets: ChangeSet[] = [
      {
        filePath: "src/api.ts",
        added: [],
        removed: [sym("deprecatedFn")],
        modified: [],
      },
    ];

    const docRefs: DocReference[] = [
      docRef("deprecatedFn", "Use `deprecatedFn()` for legacy support."),
    ];

    const report = detectDrift({ changeSets, docReferences: docRefs });

    expect(report.items).toHaveLength(1);
    expect(report.items[0]).toMatchObject({
      type: "removed-symbol",
      symbolName: "deprecatedFn",
      oldValue: "deprecatedFn",
      newValue: "(removed)",
    });
    expect(report.items[0]!.confidence).toBe(0.9);
  });

  it("detects renamed symbols", () => {
    const changeSets: ChangeSet[] = [
      {
        filePath: "src/api.ts",
        added: [sym("fetchUsers")],
        removed: [sym("getUsers")],
        modified: [],
      },
    ];

    const docRefs: DocReference[] = [
      docRef("getUsers", "Call `getUsers()` to list all users."),
    ];

    const report = detectDrift({ changeSets, docReferences: docRefs });

    const renameItem = report.items.find((i) => i.type === "renamed-symbol");
    expect(renameItem).toBeDefined();
    expect(renameItem).toMatchObject({
      oldValue: "getUsers",
      newValue: "fetchUsers",
    });
  });

  it("detects outdated code examples", () => {
    const changeSets: ChangeSet[] = [
      {
        filePath: "src/api.ts",
        added: [],
        removed: [],
        modified: [
          {
            before: sym("send", ["url", "body"]),
            after: sym("send", ["url", "body", "options"]),
          },
        ],
      },
    ];

    const docRefs: DocReference[] = [
      docRef(
        "send",
        "```typescript\nconst result = send(url, body);\n```",
      ),
    ];

    const report = detectDrift({ changeSets, docReferences: docRefs });

    const exampleItem = report.items.find((i) => i.type === "outdated-example");
    expect(exampleItem).toBeDefined();
    expect(exampleItem!.oldValue).toContain("send(url, body)");
    expect(exampleItem!.newValue).toContain("send(url, body, options)");
  });

  it("returns empty report when no drift detected", () => {
    const changeSets: ChangeSet[] = [
      {
        filePath: "src/api.ts",
        added: [sym("newFn")],
        removed: [],
        modified: [],
      },
    ];

    const report = detectDrift({ changeSets, docReferences: [] });

    expect(report.items).toHaveLength(0);
  });

  it("includes confidence scores on all items", () => {
    const changeSets: ChangeSet[] = [
      {
        filePath: "src/api.ts",
        added: [],
        removed: [sym("oldFn")],
        modified: [
          {
            before: sym("update", ["id", "data"]),
            after: sym("update", ["id"]),
          },
        ],
      },
    ];

    const docRefs: DocReference[] = [
      docRef("oldFn", "Use `oldFn()` for something."),
      docRef("update", "Call `update(id, data)` to save."),
    ];

    const report = detectDrift({ changeSets, docReferences: docRefs });

    for (const item of report.items) {
      expect(item.confidence).toBeGreaterThan(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
  });
});
