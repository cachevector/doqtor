import { analyzeDiff, detectDrift } from "@doqtor/core-engine";
import type { DriftReport, DocPatch, DoqtorConfig } from "@doqtor/core-engine";
import { parseSource } from "@doqtor/parser";
import { matchDocs } from "@doqtor/matcher";
import { generateFixes } from "@doqtor/fixer";
import { validateExecutableDocs } from "@doqtor/validator";
import { getGitDiff, getFileContent, getFileContentRaw } from "./git.js";
import { discoverDocs } from "./discovery.js";
import fs from "node:fs";

export async function runCheck(
  cwd: string,
  config: DoqtorConfig,
): Promise<DriftReport> {
  const diff = getGitDiff(cwd);

  if (!diff.trim()) {
    return { items: [], changeSets: [], docReferences: [] };
  }

  const changeSets = await analyzeDiff({
    diff,
    getFileContent: async (path, ref) => getFileContent(path, ref, cwd),
    parseFn: parseSource,
  });

  const docFiles = discoverDocs(cwd, config.docsPaths, config.ignore);
  
  if (changeSets.length === 0) {
    return { items: [], changeSets: [], docReferences: [] };
  }

  const docReferences = matchDocs({ changeSets, docFiles });
  const report = detectDrift({ changeSets, docReferences });

  // Executable Docs Validation
  if (config.executableDocs) {
    const markdownData = docFiles.map(path => ({
      path,
      content: fs.readFileSync(path, "utf-8"),
    }));
    
    const validationReport = await validateExecutableDocs(markdownData, cwd);
    for (const result of validationReport.results) {
      if (!result.success) {
        report.items.push({
          type: "outdated-example",
          symbolName: "executable-block", // Generic name for now
          filePath: result.codeBlock.filePath,
          lineStart: result.codeBlock.lineStart,
          lineEnd: result.codeBlock.lineStart, // Approximation
          message: `Executable code block failed: ${result.error}`,
          confidence: 1,
        });
      }
    }
  }

  return report;
}

export async function runFix(
  cwd: string,
  config: DoqtorConfig,
): Promise<{ report: DriftReport; patches: DocPatch[] }> {
  const report = await runCheck(cwd, config);

  if (report.items.length === 0) {
    return { report, patches: [] };
  }

  const patches = await generateFixes(report);

  return { report, patches };
}
