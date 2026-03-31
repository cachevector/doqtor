import { analyzeDiff, detectDrift } from "@doqtor/core-engine";
import type { DoqtorConfig, DocPatch } from "@doqtor/core-engine";
import { parseSource } from "@doqtor/parser";
import { matchDocs } from "@doqtor/matcher";
import type { DocFile } from "@doqtor/matcher";
import { generateFixes } from "@doqtor/fixer";
import { GitHubService } from "@doqtor/github";
import type { Octokit } from "@octokit/rest";
import { createLogger } from "./logger.js";

const DEFAULT_CONFIG: DoqtorConfig = {
  docsPaths: ["README.md", "docs/"],
  ignore: ["node_modules/", "dist/", ".git/"],
  ai: { enabled: false },
  autoPR: true,
};

export interface OrchestratorInput {
  owner: string;
  repo: string;
  prNumber: number;
  baseBranch: string;
  octokit: Octokit;
}

export async function orchestrate(input: OrchestratorInput): Promise<void> {
  const log = createLogger({ repo: `${input.owner}/${input.repo}`, pr: input.prNumber });

  log.info("Starting pipeline");

  const github = new GitHubService(input.octokit);

  // Step 1: Fetch config from repo
  const config = await fetchConfig(github, input);
  log.info("Config loaded", { docsPaths: config.docsPaths });

  // Step 2: Get PR diff
  log.info("Fetching PR diff");
  const diff = await github.getPrDiff(input.owner, input.repo, input.prNumber);

  if (!diff.trim()) {
    log.info("Empty diff, skipping");
    return;
  }

  // Step 3: Analyze diff
  log.info("Analyzing diff");
  const changeSets = await analyzeDiff({
    diff,
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

  if (report.items.length === 0) {
    log.info("No documentation drift detected");
    return;
  }

  log.info("Drift detected", { items: report.items.length });

  // Step 7: Generate fixes
  log.info("Generating fixes");
  const patches = await generateFixes(report);

  if (patches.length === 0) {
    log.info("No patches generated");
    return;
  }

  // Step 8: Create PR
  if (!config.autoPR) {
    log.info("Auto PR disabled, skipping PR creation", { patches: patches.length });
    return;
  }

  log.info("Creating docs PR");
  const summary = buildSummary(patches);
  const result = await github.createDocsPr(
    input.owner,
    input.repo,
    input.baseBranch,
    input.prNumber,
    patches,
    summary,
  );

  log.info("Docs PR created", { prUrl: result.prUrl, prNumber: result.prNumber });
}

async function fetchConfig(
  github: GitHubService,
  input: OrchestratorInput,
): Promise<DoqtorConfig> {
  const configContent = await github.getFileContent(
    input.owner,
    input.repo,
    "doqtor.config.json",
    input.baseBranch,
  );

  if (configContent) {
    try {
      const parsed = JSON.parse(configContent) as Partial<DoqtorConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      // Invalid config, use defaults
    }
  }

  return DEFAULT_CONFIG;
}

async function fetchDocFiles(
  github: GitHubService,
  input: OrchestratorInput,
  config: DoqtorConfig,
): Promise<DocFile[]> {
  const files: DocFile[] = [];

  for (const docPath of config.docsPaths) {
    if (docPath.endsWith("/")) {
      // Directory — we'd need to list tree; for MVP, try common files
      for (const name of ["README.md", "guide.md", "api.md", "getting-started.md"]) {
        const content = await github.getFileContent(
          input.owner,
          input.repo,
          `${docPath}${name}`,
          input.baseBranch,
        );
        if (content) {
          files.push({ path: `${docPath}${name}`, content });
        }
      }
    } else {
      const content = await github.getFileContent(
        input.owner,
        input.repo,
        docPath,
        input.baseBranch,
      );
      if (content) {
        files.push({ path: docPath, content });
      }
    }
  }

  return files;
}

function buildSummary(patches: DocPatch[]): string {
  return patches
    .map((p) => {
      switch (p.driftItem.type) {
        case "signature-mismatch":
          return `Updated ${p.driftItem.symbolName} signature in ${p.filePath}`;
        case "removed-symbol":
          return `Removed references to ${p.driftItem.symbolName} in ${p.filePath}`;
        case "renamed-symbol":
          return `Renamed ${p.driftItem.oldValue} → ${p.driftItem.newValue} in ${p.filePath}`;
        case "outdated-example":
          return `Updated code example for ${p.driftItem.symbolName} in ${p.filePath}`;
      }
    })
    .join("\n");
}
