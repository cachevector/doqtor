import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import type { DocFile } from "@doqtor/matcher";

export function discoverDocs(
  cwd: string,
  docsPaths: string[],
  ignore: string[],
): DocFile[] {
  const files: DocFile[] = [];

  for (const docPath of docsPaths) {
    const fullPath = join(cwd, docPath);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...scanDirectory(fullPath, cwd, ignore));
      } else if (stat.isFile() && isMarkdown(fullPath)) {
        const relPath = relative(cwd, fullPath);
        if (!isIgnored(relPath, ignore)) {
          files.push({
            path: relPath,
            content: readFileSync(fullPath, "utf-8"),
          });
        }
      }
    } catch {
      // Path doesn't exist, skip
    }
  }

  return files;
}

function scanDirectory(dir: string, cwd: string, ignore: string[]): DocFile[] {
  const files: DocFile[] = [];

  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(cwd, fullPath);

      if (isIgnored(relPath, ignore)) continue;

      if (entry.isDirectory()) {
        files.push(...scanDirectory(fullPath, cwd, ignore));
      } else if (entry.isFile() && isMarkdown(entry.name)) {
        files.push({
          path: relPath,
          content: readFileSync(fullPath, "utf-8"),
        });
      }
    }
  } catch {
    // Cannot read directory, skip
  }

  return files;
}

function isMarkdown(path: string): boolean {
  return /\.mdx?$/.test(path);
}

function isIgnored(filePath: string, ignore: string[]): boolean {
  return ignore.some((pattern) => {
    if (pattern.endsWith("/")) {
      return filePath.startsWith(pattern) || filePath.includes(`/${pattern}`);
    }
    return filePath === pattern || filePath.endsWith(`/${pattern}`);
  });
}
