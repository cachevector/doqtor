export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  status: "added" | "deleted" | "modified" | "renamed";
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

export function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileChunks = splitByFileDiffs(diffText);

  for (const chunk of fileChunks) {
    const file = parseFileChunk(chunk);
    if (file) {
      files.push(file);
    }
  }

  return files;
}

function splitByFileDiffs(diffText: string): string[] {
  const chunks: string[] = [];
  const lines = diffText.split("\n");
  let currentChunk: string[] = [];

  for (const line of lines) {
    if (line.startsWith("diff --git") && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
    }
    currentChunk.push(line);
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }

  return chunks;
}

function parseFileChunk(chunk: string): DiffFile | null {
  const lines = chunk.split("\n");

  let oldPath = "";
  let newPath = "";
  let status: DiffFile["status"] = "modified";

  for (const line of lines) {
    if (line.startsWith("--- a/")) {
      oldPath = line.slice(6);
    } else if (line.startsWith("--- /dev/null")) {
      oldPath = "/dev/null";
      status = "added";
    } else if (line.startsWith("+++ b/")) {
      newPath = line.slice(6);
    } else if (line.startsWith("+++ /dev/null")) {
      newPath = "/dev/null";
      status = "deleted";
    } else if (line.startsWith("rename from ")) {
      oldPath = line.slice(12);
      status = "renamed";
    } else if (line.startsWith("rename to ")) {
      newPath = line.slice(10);
    }
  }

  if (!oldPath && !newPath) return null;

  const hunks = parseHunks(lines);

  return { oldPath, newPath, hunks, status };
}

function parseHunks(lines: string[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    const hunkHeader = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

    if (hunkHeader) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = {
        oldStart: parseInt(hunkHeader[1]!, 10),
        oldCount: parseInt(hunkHeader[2] ?? "1", 10),
        newStart: parseInt(hunkHeader[3]!, 10),
        newCount: parseInt(hunkHeader[4] ?? "1", 10),
        lines: [],
      };
    } else if (currentHunk && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" "))) {
      currentHunk.lines.push(line);
    }
  }

  if (currentHunk) hunks.push(currentHunk);

  return hunks;
}
