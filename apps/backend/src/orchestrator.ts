import { analyzeDiff, detectDrift } from "@doqtor/core-engine";
import type { DoqtorConfig, DocPatch } from "@doqtor/core-engine";
import { parseSource } from "@doqtor/parser";
import { matchDocs } from "@doqtor/matcher";
import { generateFixes } from "@doqtor/fixer";
import { validateExecutableDocs } from "@doqtor/validator";
import { GitHubService } from "@doqtor/github";
import type { Octokit } from "@octokit/rest";
import { createLogger } from "./logger.js";
import { recordDrift } from "./stats.js";

export const DEFAULT_CONFIG: DoqtorConfig = {
  docsPaths: ["README.md", "docs/"],
  ignore: ["node_modules/", "dist/", ".git/"],
  ai: { enabled: false },
  autoPR: true,
};

export interface OrchestratorInput {
  owner: string;
  repo: string;
  prNumbers: number[];
  baseBranch: string;
  octokit: Octokit;
}

export async function orchestrate(input: OrchestratorInput): Promise<void> {
  const log = createLogger({ 
    repo: `${input.owner}/${input.repo}`, 
    prs: input.prNumbers.join(",") 
  });

  log.info("Starting pipeline", { batchSize: input.prNumbers.length });

  const github = new GitHubService(input.octokit);

  // Step 1: Fetch config from repo
  const config = await fetchConfig(github, input);
  log.info("Config loaded", { docsPaths: config.docsPaths });

  // Step 2: Get PR diffs
  log.info("Fetching PR diffs");
  const diffs = await Promise.all(
    input.prNumbers.map(n => github.getPrDiff(input.owner, input.repo, n))
  );
  const combinedDiff = diffs.join("\n");

  if (!combinedDiff.trim()) {
    log.info("Empty combined diff, skipping");
    return;
  }

  // Step 3: Analyze diff
  log.info("Analyzing combined diff");
  const changeSets = await analyzeDiff({
    diff: combinedDiff,
    getFileContent: async (path, ref) => {
      const gitRef = ref === "old" ? `${input.baseBranch}~1` : input.baseBranch;
      return github.getFileContent(input.owner, input.repo, path, gitRef);
    },
    parseFn: parseSource,
  });

  if (changeSets.length === 0) {
    log.info("No TypeScript changes detected");
    return;
  }

  log.info("Changes detected", {
    files: changeSets.length,
    symbols: changeSets.reduce((n, cs) => n + cs.added.length + cs.removed.length + cs.modified.length, 0),
  });

  // Step 4: Discover docs
  log.info("Discovering documentation");
  const docFiles = await fetchDocFiles(github, input, config);

  if (docFiles.length === 0) {
    log.info("No documentation files found");
    return;
  }

  // Step 5: Match docs
  log.info("Matching docs to code changes");
  const docReferences = matchDocs({ changeSets, docFiles });

  if (docReferences.length === 0) {
    log.info("No documentation references found");
    return;
  }

  // Step 6: Detect drift
  log.info("Detecting drift");
  const report = detectDrift({ changeSets, docReferences });

  // Step 7: Executable Docs Validation
  if (config.executableDocs) {
    log.info("Validating executable code blocks in docs");
    const validationReport = await validateExecutableDocs(docFiles, "."); 
    for (const result of validationReport.results) {
      if (!result.success) {
        report.items.push({
          type: "outdated-example",
          symbolName: "executable-block",
          filePath: result.codeBlock.filePath,
          lineStart: result.codeBlock.lineStart,
          lineEnd: result.codeBlock.lineStart,
          message: `Executable code block failed: ${result.error}`,
          confidence: 1,
        });
      }
    }
  }

  if (report.items.length === 0) {
    log.info("No documentation drift detected");
    return;
  }

  log.info("Drift detected", { items: report.items.length });
  recordDrift(report);

  // Step 8: Generate fixes
  log.info("Generating fixes");
  const patches = await generateFixes(report);

  if (patches.length === 0) {
    log.info("No deterministic fixes could be generated");
    return;
  }

  // Step 9: Create PR
  log.info("Creating docs PR");
  const summary = buildSummary(patches);
  const result = await github.createDocsPr(
    input.owner,
    input.repo,
    input.baseBranch,
    input.prNumbers,
    patches,
    summary,
  );

  log.info("Docs PR created", { prUrl: result.prUrl, prNumber: result.prNumber });
}

export async function fetchConfig(
  github: GitHubService,
  input: { owner: string; repo: string; baseBranch: string },
): Promise<DoqtorConfig> {
  const configContent = await github.getFileContent(
    input.owner,
    input.repo,
    "doqtor.config.json",
    input.baseBranch,
  );

  if (!configContent) {
    return DEFAULT_CONFIG;
  }

  try {
    return JSON.parse(configContent);
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function fetchDocFiles(
  github: GitHubService,
  input: OrchestratorInput,
  config: DoqtorConfig,
): Promise<{ path: string; content: string }[]> {
  // Simplification: only fetch files from config.docsPaths
  // For each path, if it's a file, fetch it. If it's a directory, we'd need to list it.
  // GitHub API list files in directory: getContents
  
  const files: { path: string; content: string }[] = [];

  for (const docPath of config.docsPaths) {
    const content = await github.getFileContent(input.owner, input.repo, docPath, input.baseBranch);
    if (content) {
      files.push({ path: docPath, content });
    }
  }

  return files;
}

function buildSummary(patches: DocPatch[]): string {
  return patches
    .map((p) => {
      switch (p.driftItem.type) {
        case "signature-mismatch":
          return `Updated signature for ${p.driftItem.symbolName} in ${p.filePath}`;
        case "removed-symbol":
          return `Removed references to deleted symbol ${p.driftItem.symbolName} in ${p.filePath}`;
        case "renamed-symbol":
          return `Renamed ${p.driftItem.oldValue} → ${p.driftItem.newValue} in ${p.filePath}`;
        case "outdated-example":
          return `Updated code example for ${p.driftItem.symbolName} in ${p.filePath}`;
      }
    })
    .join("\n");
}
