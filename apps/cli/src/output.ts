import type { DriftReport, DocPatch } from "@doqtor/core-engine";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

export function formatDriftReport(report: DriftReport): string {
  if (report.items.length === 0) {
    return `${COLORS.green}${COLORS.bold}No documentation drift detected.${COLORS.reset}`;
  }

  const lines: string[] = [
    `${COLORS.bold}Documentation Drift Report${COLORS.reset}`,
    `${COLORS.dim}${"─".repeat(50)}${COLORS.reset}`,
    "",
  ];

  for (const item of report.items) {
    const typeColor = item.type === "removed-symbol" ? COLORS.red : COLORS.yellow;
    const confidenceStr = `${Math.round(item.confidence * 100)}%`;

    lines.push(
      `${typeColor}${COLORS.bold}[${item.type}]${COLORS.reset} ${item.symbolName} ${COLORS.dim}(${confidenceStr} confidence)${COLORS.reset}`,
    );
    lines.push(
      `  ${COLORS.dim}File:${COLORS.reset} ${item.docReference.docFilePath}:${item.docReference.lineStart}`,
    );
    lines.push(`  ${COLORS.red}- ${item.oldValue}${COLORS.reset}`);
    lines.push(`  ${COLORS.green}+ ${item.newValue}${COLORS.reset}`);
    lines.push("");
  }

  lines.push(
    `${COLORS.bold}Found ${report.items.length} drift item${report.items.length === 1 ? "" : "s"}.${COLORS.reset}`,
  );

  return lines.join("\n");
}

export function formatPatches(patches: DocPatch[]): string {
  if (patches.length === 0) {
    return `${COLORS.dim}No patches to apply.${COLORS.reset}`;
  }

  const lines: string[] = [
    `${COLORS.bold}Patches to apply:${COLORS.reset}`,
    "",
  ];

  for (const patch of patches) {
    lines.push(
      `${COLORS.cyan}${patch.filePath}${COLORS.reset} ${COLORS.dim}(lines ${patch.lineStart}-${patch.lineEnd})${COLORS.reset}`,
    );

    for (const oldLine of patch.oldText.split("\n")) {
      lines.push(`  ${COLORS.red}- ${oldLine}${COLORS.reset}`);
    }
    for (const newLine of patch.newText.split("\n")) {
      lines.push(`  ${COLORS.green}+ ${newLine}${COLORS.reset}`);
    }
    lines.push("");
  }

  lines.push(
    `${COLORS.bold}${patches.length} patch${patches.length === 1 ? "" : "es"} applied.${COLORS.reset}`,
  );

  return lines.join("\n");
}
