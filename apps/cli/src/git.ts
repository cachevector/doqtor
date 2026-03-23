import { execSync } from "child_process";

export function getGitDiff(cwd: string): string {
  try {
    const staged = execSync("git diff --cached", { cwd, encoding: "utf-8" });
    const unstaged = execSync("git diff", { cwd, encoding: "utf-8" });
    return staged + unstaged;
  } catch {
    throw new Error("Failed to get git diff. Are you in a git repository?");
  }
}

export function getFileContent(
  filePath: string,
  ref: "old" | "new",
  cwd: string,
): string | null {
  try {
    if (ref === "old") {
      return execSync(`git show HEAD:${filePath}`, { cwd, encoding: "utf-8" });
    }
    const { readFileSync } = require("fs") as typeof import("fs");
    const { join } = require("path") as typeof import("path");
    return readFileSync(join(cwd, filePath), "utf-8");
  } catch {
    return null;
  }
}

export function getGitRoot(cwd: string): string {
  try {
    return execSync("git rev-parse --show-toplevel", { cwd, encoding: "utf-8" }).trim();
  } catch {
    throw new Error("Not in a git repository.");
  }
}
