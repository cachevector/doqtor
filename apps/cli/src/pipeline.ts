import { analyzeDiff, detectDrift } from "@doqtor/core-engine";
import type { DriftReport, DocPatch, DoqtorConfig } from "@doqtor/core-engine";
import { parseSourceFile } from "@doqtor/parser";
import { matchDocs } from "@doqtor/matcher";
import { generateFixes } from "@doqtor/fixer";
import { getGitDiff, getFileContent } from "./git.js";
import { discoverDocs } from "./discovery.js";

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
    parseFn: parseSourceFile,
  });

  if (changeSets.length === 0) {
    return { items: [], changeSets: [], docReferences: [] };
  }

  const docFiles = discoverDocs(cwd, config.docsPaths, config.ignore);
  const docReferences = matchDocs({ changeSets, docFiles });
  const report = detectDrift({ changeSets, docReferences });

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
