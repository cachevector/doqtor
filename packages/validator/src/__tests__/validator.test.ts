import { describe, it, expect } from "vitest";
import { extractCodeBlocks, validateCodeBlock } from "../validator.js";
import path from "node:path";

describe("validator", () => {
  describe("extractCodeBlocks", () => {
    it("should extract code blocks with languages", () => {
      const markdown = `
# Title
\`\`\`typescript
const x: number = 1;
console.log(x);
\`\`\`

Some text

\`\`\`javascript
console.log("hello");
\`\`\`
`;
      const blocks = extractCodeBlocks(markdown, "test.md");
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toMatchObject({
        language: "typescript",
        content: "const x: number = 1;\nconsole.log(x);\n",
        lineStart: 3,
      });
      expect(blocks[1]).toMatchObject({
        language: "javascript",
        content: "console.log(\"hello\");\n",
        lineStart: 10,
      });
    });
  });

  describe("validateCodeBlock", () => {
    it("should succeed for valid TS code", async () => {
      const block = {
        language: "typescript",
        content: "const x: number = 10; if (x !== 10) throw new Error('fail');",
        filePath: "test.md",
        lineStart: 1,
      };
      const result = await validateCodeBlock(block, process.cwd());
      expect(result.success).toBe(true);
    });

    it("should fail for invalid syntax", async () => {
      const block = {
        language: "typescript",
        content: "const x: = ; // Syntax error",
        filePath: "test.md",
        lineStart: 1,
      };
      const result = await validateCodeBlock(block, process.cwd());
      expect(result.success).toBe(false);
    });

    it("should fail for code that throws at runtime", async () => {
      const block = {
        language: "javascript",
        content: "throw new Error('runtime error');",
        filePath: "test.md",
        lineStart: 1,
      };
      const result = await validateCodeBlock(block, process.cwd());
      expect(result.success).toBe(false);
      expect(result.error).toContain("runtime error");
    });
  });
});
