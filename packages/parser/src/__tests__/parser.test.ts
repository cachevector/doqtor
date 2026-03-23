import { describe, it, expect } from "vitest";
import { parseSourceFile } from "../parser.js";

describe("parseSourceFile", () => {
  describe("functions", () => {
    it("extracts a simple function", () => {
      const code = `export function greet(name: string): string {
        return "hello " + name;
      }`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols).toHaveLength(1);
      expect(symbols[0]).toMatchObject({
        name: "greet",
        kind: "function",
        exported: true,
        filePath: "test.ts",
      });
      expect(symbols[0]!.parameters).toHaveLength(1);
      expect(symbols[0]!.parameters![0]).toMatchObject({
        name: "name",
        type: "string",
        optional: false,
      });
      expect(symbols[0]!.returnType).toBe("string");
    });

    it("extracts functions with optional and default parameters", () => {
      const code = `export function create(name: string, age?: number, active = true) {}`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols[0]!.parameters).toHaveLength(3);
      expect(symbols[0]!.parameters![0]).toMatchObject({ name: "name", optional: false });
      expect(symbols[0]!.parameters![1]).toMatchObject({ name: "age", optional: true });
      expect(symbols[0]!.parameters![2]).toMatchObject({
        name: "active",
        optional: true,
        defaultValue: "true",
      });
    });

    it("extracts non-exported functions", () => {
      const code = `function internal() {}`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols[0]).toMatchObject({
        name: "internal",
        exported: false,
      });
    });
  });

  describe("classes", () => {
    it("extracts class and its methods", () => {
      const code = `export class UserService {
        create(email: string): void {}
        delete(id: number): boolean { return true; }
      }`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols).toHaveLength(3);
      expect(symbols[0]).toMatchObject({ name: "UserService", kind: "class", exported: true });
      expect(symbols[1]).toMatchObject({
        name: "UserService.create",
        kind: "method",
        exported: true,
      });
      expect(symbols[1]!.parameters![0]).toMatchObject({ name: "email", type: "string" });
      expect(symbols[2]).toMatchObject({ name: "UserService.delete", kind: "method" });
    });
  });

  describe("interfaces", () => {
    it("extracts exported interfaces", () => {
      const code = `export interface User {
        id: number;
        name: string;
      }`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols).toHaveLength(1);
      expect(symbols[0]).toMatchObject({
        name: "User",
        kind: "interface",
        exported: true,
      });
    });
  });

  describe("type aliases", () => {
    it("extracts type aliases", () => {
      const code = `export type Status = "active" | "inactive";`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols).toHaveLength(1);
      expect(symbols[0]).toMatchObject({
        name: "Status",
        kind: "type",
        exported: true,
      });
    });
  });

  describe("constants", () => {
    it("extracts exported constants", () => {
      const code = `export const MAX_RETRIES = 3;`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols).toHaveLength(1);
      expect(symbols[0]).toMatchObject({
        name: "MAX_RETRIES",
        kind: "constant",
        exported: true,
      });
    });

    it("extracts multiple declarations in one statement", () => {
      const code = `export const A = 1, B = 2;`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols).toHaveLength(2);
      expect(symbols[0]).toMatchObject({ name: "A", kind: "constant" });
      expect(symbols[1]).toMatchObject({ name: "B", kind: "constant" });
    });
  });

  describe("JSDoc", () => {
    it("extracts JSDoc comments from functions", () => {
      const code = `/**
 * Creates a new user in the system.
 * @param name - The user's display name
 * @returns The created user object
 */
export function createUser(name: string) {
  return { name };
}`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols[0]!.jsDoc).toContain("Creates a new user");
      expect(symbols[0]!.jsDoc).toContain("@param name");
    });

    it("returns undefined when no JSDoc present", () => {
      const code = `export function noDoc() {}`;
      const symbols = parseSourceFile("test.ts", code);

      expect(symbols[0]!.jsDoc).toBeUndefined();
    });
  });

  describe("mixed file", () => {
    it("extracts all symbol types from a realistic file", () => {
      const code = `
/** Configuration options */
export interface Config {
  timeout: number;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export const DEFAULT_TIMEOUT = 5000;

/** The main client class */
export class ApiClient {
  /** Send a request */
  async send(url: string, options?: Config): Promise<void> {}
}

function internalHelper() {}
`;
      const symbols = parseSourceFile("api.ts", code);

      const names = symbols.map((s) => s.name);
      expect(names).toContain("Config");
      expect(names).toContain("LogLevel");
      expect(names).toContain("DEFAULT_TIMEOUT");
      expect(names).toContain("ApiClient");
      expect(names).toContain("ApiClient.send");
      expect(names).toContain("internalHelper");
      expect(symbols).toHaveLength(6);
    });
  });
});
