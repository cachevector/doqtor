import { describe, it, expect } from "vitest";
import { parseSource } from "../parser.js";

describe("Python support", () => {
  it("extracts global functions from Python files", async () => {
    const code = "def hello(name):\n    \"Greets the user.\"\n    pass\n\ndef add(a, b):\n    return a + b\n";
    const symbols = await parseSource("test.py", code);

    expect(symbols).toHaveLength(2);
    expect(symbols[0]).toMatchObject({
      name: "hello",
      kind: "function",
    });
    expect(symbols[0]!.jsDoc).toBe("Greets the user.");
    expect(symbols[1]).toMatchObject({
      name: "add",
      kind: "function",
    });
  });

  it("extracts classes and methods from Python files", async () => {
    const code = "class UserService:\n    \"Handles user operations.\"\n    def init(self, db):\n        pass\n    def get_user(self, user_id):\n        pass\n    def _internal(self):\n        pass\n";
    const symbols = await parseSource("service.py", code);

    const names = symbols.map(s => s.name);
    expect(names).toContain("UserService");
    expect(names).toContain("UserService.init");
    expect(names).toContain("UserService.get_user");
    expect(names).not.toContain("UserService._internal");

    const cls = symbols.find(s => s.name === "UserService");
    expect(cls!.jsDoc).toBe("Handles user operations.");
  });

  it("respects includePrivate for Python functions", async () => {
    const code = "def _private_fn():\n    pass\ndef public_fn():\n    pass\n";
    const symbols = await parseSource("test.py", code, false);
    expect(symbols.map(s => s.name)).toEqual(["public_fn"]);

    const allSymbols = await parseSource("test.py", code, true);
    expect(allSymbols.map(s => s.name)).toEqual(["_private_fn", "public_fn"]);
  });
});
