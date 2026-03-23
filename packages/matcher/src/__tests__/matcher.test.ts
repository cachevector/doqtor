import { describe, it, expect } from "vitest";
import { matchDocs } from "../matcher.js";
import type { ChangeSet, ParsedSymbol } from "@doqtor/core-engine";

function makeSymbol(name: string, kind: ParsedSymbol["kind"] = "function"): ParsedSymbol {
  return {
    name,
    kind,
    filePath: "src/api.ts",
    line: 1,
    parameters: [],
    returnType: "void",
    exported: true,
  };
}

function makeChangeSet(overrides: Partial<ChangeSet> = {}): ChangeSet {
  return {
    filePath: "src/api.ts",
    added: [],
    removed: [],
    modified: [],
    ...overrides,
  };
}

describe("matchDocs", () => {
  it("matches symbol names found in documentation", () => {
    const refs = matchDocs({
      changeSets: [
        makeChangeSet({
          modified: [{ before: makeSymbol("createUser"), after: makeSymbol("createUser") }],
        }),
      ],
      docFiles: [
        {
          path: "README.md",
          content: "## API\n\nCall `createUser(name)` to create a new user.",
        },
      ],
    });

    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0]).toMatchObject({
      symbolName: "createUser",
      matchType: "name",
      docFilePath: "README.md",
    });
  });

  it("matches class method names (base name)", () => {
    const refs = matchDocs({
      changeSets: [
        makeChangeSet({
          added: [makeSymbol("UserService.create", "method")],
        }),
      ],
      docFiles: [
        {
          path: "docs/api.md",
          content: "Use the `create` method to add a user.",
        },
      ],
    });

    expect(refs.some((r) => r.symbolName === "UserService.create" && r.matchType === "name")).toBe(
      true,
    );
  });

  it("matches by file proximity (file name referenced in docs)", () => {
    const refs = matchDocs({
      changeSets: [makeChangeSet({ filePath: "src/auth.ts" })],
      docFiles: [
        {
          path: "README.md",
          content: "The auth module handles authentication.\nSee src/auth.ts for details.",
        },
      ],
    });

    expect(refs.some((r) => r.matchType === "proximity")).toBe(true);
  });

  it("captures code block context", () => {
    const refs = matchDocs({
      changeSets: [
        makeChangeSet({
          added: [makeSymbol("fetchData")],
        }),
      ],
      docFiles: [
        {
          path: "README.md",
          content: [
            "## Usage",
            "",
            "```typescript",
            "const data = fetchData();",
            "console.log(data);",
            "```",
          ].join("\n"),
        },
      ],
    });

    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0]!.content).toContain("```typescript");
    expect(refs[0]!.content).toContain("fetchData()");
  });

  it("returns empty when no matches found", () => {
    const refs = matchDocs({
      changeSets: [
        makeChangeSet({
          added: [makeSymbol("internalHelper")],
        }),
      ],
      docFiles: [
        {
          path: "README.md",
          content: "This project has no documentation about that function.",
        },
      ],
    });

    expect(refs).toHaveLength(0);
  });

  it("deduplicates references at the same location", () => {
    const refs = matchDocs({
      changeSets: [
        makeChangeSet({
          modified: [
            {
              before: makeSymbol("process"),
              after: makeSymbol("process"),
            },
          ],
        }),
      ],
      docFiles: [
        {
          path: "docs/guide.md",
          content: "Call process to process data.",
        },
      ],
    });

    const uniqueKeys = new Set(refs.map((r) => `${r.docFilePath}:${r.lineStart}:${r.lineEnd}:${r.symbolName}`));
    expect(refs.length).toBe(uniqueKeys.size);
  });

  it("handles empty inputs", () => {
    expect(matchDocs({ changeSets: [], docFiles: [] })).toEqual([]);
    expect(
      matchDocs({
        changeSets: [makeChangeSet({ added: [makeSymbol("x")] })],
        docFiles: [],
      }),
    ).toEqual([]);
  });
});
