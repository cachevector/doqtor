/**
 * End-to-end simulation: "statestream" scenario.
 *
 * A reactive state management library with a major v2 release that includes:
 *   - Class rename + method changes (StateContainer->StateStore, dispatch->emit, getSnapshot->getState)
 *   - Class rename (MiddlewarePipeline->MiddlewareChain) + factory rename (createPipeline->createChain)
 *   - Type alias rename (StateSnapshot->StateSlice)
 *   - Interface->type change (Subscription->Unsubscribe)
 *   - Method removal (disconnect)
 *   - Method rename with substring trap (selectAsync->selectDeferred, but select stays)
 *   - Constant renames (VERSION->LIB_VERSION, DEFAULT_OPTIONS->DEFAULT_CONFIG)
 *   - Return type changes
 *   - Multi-file changes (store, middleware, types, constants, index)
 *   - Rich prose documentation with embedded code examples
 */

import { analyzeDiff, detectDrift } from "@doqtor/core-engine";
import type { DriftReport, DocPatch } from "@doqtor/core-engine";
import { parseSource } from "@doqtor/parser";
import { matchDocs } from "@doqtor/matcher";
import { generateFixes } from "@doqtor/fixer";

import {
  BEFORE_STORE,
  AFTER_STORE,
  BEFORE_MIDDLEWARE,
  AFTER_MIDDLEWARE,
  BEFORE_TYPES,
  AFTER_TYPES,
  BEFORE_CONSTANTS,
  AFTER_CONSTANTS,
  BEFORE_INDEX,
  AFTER_INDEX,
  STATESTREAM_README,
  STATESTREAM_GUIDE,
  STATESTREAM_DIFF,
} from "./fixtures-statestream.js";

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
  console.log(`${BOLD}Doqtor End-to-End Simulation: statestream${RESET}`);
  console.log(`${DIM}Simulating a v2.0 major release of "statestream" state management library${RESET}`);

  // -- Step 1: Parse the diff --

  header("Step 1: Diff Analysis");

  const files: Record<string, Record<string, string>> = {
    old: {
      "src/store.ts": BEFORE_STORE,
      "src/middleware.ts": BEFORE_MIDDLEWARE,
      "src/types.ts": BEFORE_TYPES,
      "src/constants.ts": BEFORE_CONSTANTS,
      "src/index.ts": BEFORE_INDEX,
    },
    new: {
      "src/store.ts": AFTER_STORE,
      "src/middleware.ts": AFTER_MIDDLEWARE,
      "src/types.ts": AFTER_TYPES,
      "src/constants.ts": AFTER_CONSTANTS,
      "src/index.ts": AFTER_INDEX,
    },
  };

  const changeSets = await analyzeDiff({
    diff: STATESTREAM_DIFF,
    getFileContent: async (path, ref) => files[ref]?.[path] ?? null,
    parseFn: parseSource,
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

  // -- Step 2: Match docs --

  header("Step 2: Doc Matching");

  const docFiles = [
    { path: "README.md", content: STATESTREAM_README },
    { path: "docs/guide.md", content: STATESTREAM_GUIDE },
  ];

  const docReferences = matchDocs({ changeSets, docFiles });

  console.log(`Found ${docReferences.length} documentation references:\n`);
  for (const ref of docReferences) {
    console.log(`  ${CYAN}${ref.docFilePath}${RESET}:${ref.lineStart}-${ref.lineEnd} [${ref.matchType}] "${ref.symbolName}"`);
  }

  // -- Step 3: Detect drift --

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

  // -- Step 4: Generate fixes --

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

  // -- Step 5: Simulate the commit --

  header("Step 5: Simulated Commit");

  if (patches.length === 0) {
    console.log(`${DIM}Nothing to commit.${RESET}`);
    return;
  }

  const affectedFiles = [...new Set(patches.map(p => p.filePath))];

  console.log(`${BOLD}Branch:${RESET} doqtor/docs-update-pr-200`);
  console.log(`${BOLD}Title:${RESET}  docs: update after #200`);
  console.log(`${BOLD}Files:${RESET}  ${affectedFiles.join(", ")}`);
  console.log();
  console.log(`${BOLD}PR Body:${RESET}`);
  console.log(`${DIM}${"─".repeat(37)}${RESET}`);
  console.log(`## Documentation Update`);
  console.log();
  console.log(`This PR updates documentation to reflect code changes from #200.`);
  console.log();
  console.log(`### Changes`);
  console.log();
  for (const patch of patches) {
    console.log(`- Updated \`${patch.filePath}\` (${patch.driftItem.type}: ${patch.driftItem.symbolName})`);
  }
  console.log(`${DIM}${"─".repeat(37)}${RESET}`);

  // -- Step 6: Show final doc state --

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

  // -- Summary --

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
