/**
 * End-to-end simulation of the doqtor pipeline against a realistic
 * open-source project scenario.
 *
 * This does NOT hit any external APIs or push anything. It runs the full
 * pipeline in-memory and logs what doqtor would produce.
 *
 * Scenario:
 *   "fetchkit" is a fictional HTTP client library shipping v2.0.
 *   The maintainer merged a PR that:
 *     - Changed createClient(baseUrl, timeout) to createClient(baseUrl, options?)
 *     - Changed get(url, headers?) to get(url, options?)
 *     - Changed post(url, body, headers?) to post(url, body, options?)
 *     - Removed the deprecated fetchJson(url) function
 *     - Renamed HttpClient.request() to HttpClient.send()
 *     - Changed withRetry(fn, maxRetries, baseDelay) to withRetry(fn, options?)
 *
 *   The README and guide still reference the old API.
 */

import { analyzeDiff, detectDrift } from "@doqtor/core-engine";
import type { DriftReport, DocPatch } from "@doqtor/core-engine";
import { parseSourceFile } from "@doqtor/parser";
import { matchDocs } from "@doqtor/matcher";
import { generateFixes } from "@doqtor/fixer";

import {
  BEFORE_CLIENT,
  AFTER_CLIENT,
  BEFORE_RETRY,
  AFTER_RETRY,
  README_DOC,
  GUIDE_DOC,
  UNIFIED_DIFF,
} from "./fixtures.js";

const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function header(text: string) {
  console.log();
  console.log(`${BOLD}${BLUE}${"=".repeat(70)}${RESET}`);
  console.log(`${BOLD}${BLUE}  ${text}${RESET}`);
  console.log(`${BOLD}${BLUE}${"=".repeat(70)}${RESET}`);
  console.log();
}

function subheader(text: string) {
  console.log(`${BOLD}${CYAN}--- ${text} ---${RESET}`);
}

async function main() {
  console.log(`${BOLD}Doqtor End-to-End Simulation${RESET}`);
  console.log(`${DIM}Simulating a v2.0 breaking change in "fetchkit" HTTP client library${RESET}`);

  // ── Step 1: Parse the diff ──────────────────────────────────────

  header("Step 1: Diff Analysis");

  const files: Record<string, Record<string, string>> = {
    old: {
      "src/client.ts": BEFORE_CLIENT,
      "src/retry.ts": BEFORE_RETRY,
    },
    new: {
      "src/client.ts": AFTER_CLIENT,
      "src/retry.ts": AFTER_RETRY,
    },
  };

  const changeSets = await analyzeDiff({
    diff: UNIFIED_DIFF,
    getFileContent: async (path, ref) => files[ref]?.[path] ?? null,
    parseFn: parseSourceFile,
  });

  console.log(`Files changed: ${changeSets.length}`);
  for (const cs of changeSets) {
    console.log(`\n  ${BOLD}${cs.filePath}${RESET}`);
    if (cs.added.length > 0) {
      console.log(`    ${GREEN}+ Added:${RESET} ${cs.added.map(s => s.name).join(", ")}`);
    }
    if (cs.removed.length > 0) {
      console.log(`    ${RED}- Removed:${RESET} ${cs.removed.map(s => s.name).join(", ")}`);
    }
    if (cs.modified.length > 0) {
      for (const mod of cs.modified) {
        const oldParams = (mod.before.parameters ?? []).map(p => `${p.name}: ${p.type}`).join(", ");
        const newParams = (mod.after.parameters ?? []).map(p => `${p.name}: ${p.type}`).join(", ");
        console.log(`    ${YELLOW}~ Modified:${RESET} ${mod.before.name}`);
        console.log(`      ${RED}  was: ${mod.before.name}(${oldParams})${RESET}`);
        console.log(`      ${GREEN}  now: ${mod.after.name}(${newParams})${RESET}`);
      }
    }
  }

  // ── Step 2: Match docs ──────────────────────────────────────────

  header("Step 2: Doc Matching");

  const docFiles = [
    { path: "README.md", content: README_DOC },
    { path: "docs/guide.md", content: GUIDE_DOC },
  ];

  const docReferences = matchDocs({ changeSets, docFiles });

  console.log(`Found ${docReferences.length} documentation references:\n`);
  for (const ref of docReferences) {
    console.log(`  ${CYAN}${ref.docFilePath}${RESET}:${ref.lineStart}-${ref.lineEnd} [${ref.matchType}] "${ref.symbolName}"`);
  }

  // ── Step 3: Detect drift ────────────────────────────────────────

  header("Step 3: Drift Detection");

  const report: DriftReport = detectDrift({ changeSets, docReferences });

  console.log(`Detected ${report.items.length} drift items:\n`);
  for (const item of report.items) {
    const conf = `${Math.round(item.confidence * 100)}%`;
    console.log(`  ${YELLOW}[${item.type}]${RESET} ${BOLD}${item.symbolName}${RESET} ${DIM}(${conf} confidence)${RESET}`);
    console.log(`    in ${CYAN}${item.docReference.docFilePath}${RESET}:${item.docReference.lineStart}`);
    console.log(`    ${RED}- ${item.oldValue}${RESET}`);
    console.log(`    ${GREEN}+ ${item.newValue}${RESET}`);
    console.log();
  }

  // ── Step 4: Generate fixes ──────────────────────────────────────

  header("Step 4: Fix Generation");

  const patches: DocPatch[] = await generateFixes(report);

  if (patches.length === 0) {
    console.log(`${DIM}No patches generated.${RESET}`);
  } else {
    console.log(`Generated ${patches.length} patches:\n`);
  }

  for (let i = 0; i < patches.length; i++) {
    const patch = patches[i]!;
    subheader(`Patch ${i + 1}: ${patch.filePath} (lines ${patch.lineStart}-${patch.lineEnd})`);
    console.log(`  Drift: ${patch.driftItem.type} on "${patch.driftItem.symbolName}"`);
    console.log();
    console.log(`  ${BOLD}Before:${RESET}`);
    for (const line of patch.oldText.split("\n")) {
      console.log(`    ${RED}- ${line}${RESET}`);
    }
    console.log();
    console.log(`  ${BOLD}After:${RESET}`);
    for (const line of patch.newText.split("\n")) {
      console.log(`    ${GREEN}+ ${line}${RESET}`);
    }
    console.log();
  }

  // ── Step 5: Simulate the commit ─────────────────────────────────

  header("Step 5: Simulated Commit");

  if (patches.length === 0) {
    console.log(`${DIM}Nothing to commit.${RESET}`);
    return;
  }

  const affectedFiles = [...new Set(patches.map(p => p.filePath))];

  console.log(`${BOLD}Branch:${RESET} doqtor/docs-update-pr-42`);
  console.log(`${BOLD}Title:${RESET}  docs: update after #42`);
  console.log(`${BOLD}Files:${RESET}  ${affectedFiles.join(", ")}`);
  console.log();
  console.log(`${BOLD}PR Body:${RESET}`);
  console.log(`${DIM}─────────────────────────────────────${RESET}`);
  console.log(`## Documentation Update`);
  console.log();
  console.log(`This PR updates documentation to reflect code changes from #42.`);
  console.log();
  console.log(`### Changes`);
  console.log();
  for (const patch of patches) {
    console.log(`- Updated \`${patch.filePath}\` (${patch.driftItem.type}: ${patch.driftItem.symbolName})`);
  }
  console.log(`${DIM}─────────────────────────────────────${RESET}`);

  // ── Step 6: Show final doc state ────────────────────────────────

  header("Step 6: Final Document State");

  for (const filePath of affectedFiles) {
    const filePatches = patches.filter(p => p.filePath === filePath);
    const originalDoc = docFiles.find(d => d.path === filePath)?.content ?? "";
    let updatedDoc = originalDoc;

    for (const patch of filePatches) {
      updatedDoc = updatedDoc.replace(patch.oldText, patch.newText);
    }

    subheader(filePath);
    console.log(updatedDoc);
    console.log();
  }

  // ── Summary ─────────────────────────────────────────────────────

  header("Summary");

  console.log(`  Files analyzed:        ${changeSets.length}`);
  console.log(`  Symbols changed:       ${changeSets.reduce((n, cs) => n + cs.added.length + cs.removed.length + cs.modified.length, 0)}`);
  console.log(`  Doc references found:  ${docReferences.length}`);
  console.log(`  Drift items detected:  ${report.items.length}`);
  console.log(`  Patches generated:     ${patches.length}`);
  console.log(`  Files to update:       ${affectedFiles.length}`);
  console.log();
  console.log(`${GREEN}${BOLD}Simulation complete.${RESET}`);
}

main().catch((err) => {
  console.error(`${RED}Simulation failed:${RESET}`, err);
  process.exit(1);
});
