import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import * as os from "node:os";

export interface CodeBlock {
  language: string;
  content: string;
  filePath: string;
  lineStart: number;
}

export interface ValidationResult {
  codeBlock: CodeBlock;
  success: boolean;
  error?: string;
  output?: string;
}

export interface ValidationReport {
  results: ValidationResult[];
}

export function extractCodeBlocks(markdown: string, filePath: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const lines = markdown.split("\n");
  let currentBlock: Partial<CodeBlock> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith("```")) {
      if (currentBlock) {
        // Close block
        blocks.push(currentBlock as CodeBlock);
        currentBlock = null;
      } else {
        // Open block
        const language = line.slice(3).trim();
        currentBlock = {
          language,
          content: "",
          filePath,
          lineStart: i + 1,
        };
      }
    } else if (currentBlock) {
      currentBlock.content += line + "\n";
    }
  }

  return blocks;
}

export async function validateCodeBlock(block: CodeBlock, projectCwd: string): Promise<ValidationResult> {
  // Only support TS/JS for now
  if (!["typescript", "ts", "javascript", "js"].includes(block.language.toLowerCase())) {
    return { codeBlock: block, success: true }; // Skip unsupported languages
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "doqtor-validator-"));
  const extension = ["typescript", "ts"].includes(block.language.toLowerCase()) ? ".ts" : ".js";
  const testFile = path.join(tmpDir, `example${extension}`);

  // Create a minimal package.json if needed to resolve imports from projectCwd
  // For now, we'll try to run it via bun or ts-node directly
  fs.writeFileSync(testFile, block.content);

  try {
    const result = spawnSync("bun", ["run", testFile], {
      cwd: projectCwd, // Run from project root so imports might work
      encoding: "utf-8",
      timeout: 10000,
    });

    if (result.status === 0) {
      return { codeBlock: block, success: true, output: result.stdout };
    } else {
      return { 
        codeBlock: block, 
        success: false, 
        error: result.stderr || "Execution failed",
        output: result.stdout 
      };
    }
  } catch (error) {
    return { 
      codeBlock: block, 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

export async function validateExecutableDocs(
  markdownFiles: { path: string; content: string }[],
  projectCwd: string
): Promise<ValidationReport> {
  const allBlocks = markdownFiles.flatMap(f => extractCodeBlocks(f.content, f.path));
  const results: ValidationResult[] = [];

  for (const block of allBlocks) {
    if (block.language) {
      const result = await validateCodeBlock(block, projectCwd);
      results.push(result);
    }
  }

  return { results };
}
