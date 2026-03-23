import { describe, it, expect } from "vitest";
import { parseSourceFile } from "../parser.js";

describe("parser edge cases", () => {
  it("handles empty file", () => {
    expect(parseSourceFile("empty.ts", "")).toEqual([]);
  });

  it("handles file with only comments", () => {
    const code = `// This is a comment\n/* Block comment */`;
    expect(parseSourceFile("comments.ts", code)).toEqual([]);
  });

  it("handles file with only imports", () => {
    const code = `import { foo } from "./bar";\nimport type { Baz } from "./baz";`;
    expect(parseSourceFile("imports.ts", code)).toEqual([]);
  });

  it("handles arrow functions assigned to const (captured as constant)", () => {
    const code = `export const greet = (name: string) => "hello " + name;`;
    const symbols = parseSourceFile("arrow.ts", code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toMatchObject({ name: "greet", kind: "constant" });
  });

  it("handles async functions", () => {
    const code = `export async function fetchData(url: string): Promise<string> {
      return "";
    }`;
    const symbols = parseSourceFile("async.ts", code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toMatchObject({ name: "fetchData", kind: "function" });
    expect(symbols[0]!.returnType).toContain("Promise");
  });

  it("handles generic functions", () => {
    const code = `export function identity<T>(value: T): T { return value; }`;
    const symbols = parseSourceFile("generic.ts", code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]!.parameters).toHaveLength(1);
  });

  it("handles overloaded functions (takes last implementation)", () => {
    const code = `export function process(x: string): string;
export function process(x: number): number;
export function process(x: string | number): string | number {
  return x;
}`;
    const symbols = parseSourceFile("overload.ts", code);

    // Should have the overload signatures + implementation
    expect(symbols.length).toBeGreaterThanOrEqual(1);
  });

  it("handles class with constructor", () => {
    const code = `export class Service {
  constructor(private name: string) {}
}`;
    const symbols = parseSourceFile("ctor.ts", code);

    expect(symbols.some((s) => s.name === "Service" && s.kind === "class")).toBe(true);
  });

  it("handles enum (not extracted — expected behavior)", () => {
    const code = `export enum Color { Red, Green, Blue }`;
    const symbols = parseSourceFile("enum.ts", code);

    // Enums are not extracted (not in ParsedSymbol kinds)
    expect(symbols).toHaveLength(0);
  });

  it("handles complex nested types", () => {
    const code = `export interface Config {
  nested: {
    deep: {
      value: string;
    };
  };
}`;
    const symbols = parseSourceFile("nested.ts", code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]!.kind).toBe("interface");
  });
});
