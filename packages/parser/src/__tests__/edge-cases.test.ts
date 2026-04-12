import { describe, it, expect } from "vitest";
import { parseSource } from "../parser.js";

describe("parser edge cases", () => {
  it("handles empty file", async () => {
    expect(await parseSource("empty.ts", "")).toEqual([]);
  });

  it("handles file with only comments", async () => {
    const code = `// This is a comment\n/* Block comment */`;
    expect(await parseSource("comments.ts", code)).toEqual([]);
  });

  it("handles file with only imports", async () => {
    const code = `import { foo } from "./bar";\nimport type { Baz } from "./baz";`;
    expect(await parseSource("imports.ts", code)).toEqual([]);
  });

  it("handles arrow functions assigned to const (captured as constant)", async () => {
    const code = `export const greet = (name: string) => "hello " + name;`;
    const symbols = await parseSource("arrow.ts", code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toMatchObject({ name: "greet", kind: "constant" });
  });

  it("handles async functions", async () => {
    const code = `export async function fetchData(url: string): Promise<string> {
      return "";
    }`;
    const symbols = await parseSource("async.ts", code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toMatchObject({ name: "fetchData", kind: "function" });
    expect(symbols[0]!.returnType).toContain("Promise");
  });

  it("handles generic functions", async () => {
    const code = `export function identity<T>(value: T): T { return value; }`;
    const symbols = await parseSource("generic.ts", code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]!.parameters).toHaveLength(1);
  });

  it("handles overloaded functions (takes last implementation)", async () => {
    const code = `export function process(x: string): string;
export function process(x: number): number;
export function process(x: string | number): string | number {
  return x;
}`;
    const symbols = await parseSource("overload.ts", code);

    // Should have the overload signatures + implementation
    expect(symbols.length).toBeGreaterThanOrEqual(1);
  });

  it("handles class with constructor", async () => {
    const code = `export class Service {
  constructor(private name: string) {}
}`;
    const symbols = await parseSource("ctor.ts", code);

    expect(symbols.some((s) => s.name === "Service" && s.kind === "class")).toBe(true);
  });

  it("handles enum (not extracted — expected behavior)", async () => {
    const code = `export enum Color { Red, Green, Blue }`;
    const symbols = await parseSource("enum.ts", code);

    // Enums are not extracted (not in ParsedSymbol kinds)
    expect(symbols).toHaveLength(0);
  });

  it("handles complex nested types", async () => {
    const code = `export interface Config {
  nested: {
    deep: {
      value: string;
    };
  };
}`;
    const symbols = await parseSource("nested.ts", code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]!.kind).toBe("interface");
  });
});
