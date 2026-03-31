import { Command } from "commander";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { loadConfig, getDefaultConfig } from "./config.js";
import { runCheck, runFix } from "./pipeline.js";
import { formatDriftReport, formatPatches } from "./output.js";
import { getGitRoot } from "./git.js";

const program = new Command();

program
  .name("doqtor")
  .description("Keep your docs in sync with your code")
  .version("0.1.1");

program
  .command("check")
  .description("Check for documentation drift in local changes")
  .option("-c, --config <path>", "Path to config file")
  .action(async (options) => {
    try {
      const cwd = getGitRoot(process.cwd());
      const config = options.config
        ? JSON.parse(readFileSync(options.config, "utf-8"))
        : loadConfig(cwd);

      const report = await runCheck(cwd, config);
      console.log(formatDriftReport(report));

      if (report.items.length > 0) {
        process.exitCode = 1;
      }
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

program
  .command("fix")
  .description("Fix documentation drift and apply patches")
  .option("-c, --config <path>", "Path to config file")
  .option("--dry-run", "Show patches without applying them")
  .action(async (options) => {
    try {
      const cwd = getGitRoot(process.cwd());
      const config = options.config
        ? JSON.parse(readFileSync(options.config, "utf-8"))
        : loadConfig(cwd);

      const { report, patches } = await runFix(cwd, config);
      console.log(formatDriftReport(report));

      if (patches.length === 0) {
        return;
      }

      if (options.dryRun) {
        console.log("\n" + formatPatches(patches));
        return;
      }

      applyPatches(cwd, patches);
      console.log("\n" + formatPatches(patches));
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

program
  .command("init")
  .description("Generate a default doqtor.config.json")
  .action(() => {
    const configPath = join(process.cwd(), "doqtor.config.json");
    const config = getDefaultConfig();
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    console.log(`Created doqtor.config.json`);
  });

function applyPatches(
  cwd: string,
  patches: Array<{ filePath: string; oldText: string; newText: string }>,
) {
  const filePatches = new Map<string, Array<{ oldText: string; newText: string }>>();

  for (const patch of patches) {
    const existing = filePatches.get(patch.filePath) ?? [];
    existing.push({ oldText: patch.oldText, newText: patch.newText });
    filePatches.set(patch.filePath, existing);
  }

  for (const [filePath, patchList] of filePatches) {
    const fullPath = join(cwd, filePath);
    let content = readFileSync(fullPath, "utf-8");

    for (const patch of patchList) {
      content = content.replace(patch.oldText, patch.newText);
    }

    writeFileSync(fullPath, content);
  }
}

program.parse();
