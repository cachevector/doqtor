import type { DriftReport, DriftItem, DocPatch } from "@doqtor/core-engine";
import type { AiProvider } from "./ai-provider.js";

export interface FixerOptions {
  aiProvider?: AiProvider;
}

export async function generateFixes(
  report: DriftReport,
  options: FixerOptions = {},
): Promise<DocPatch[]> {
  const patches: DocPatch[] = [];

  for (const item of report.items) {
    const patch = generateDeterministicFix(item);
    if (patch) {
      patches.push(patch);
      continue;
    }

    if (options.aiProvider) {
      const aiPatch = await generateAiFix(item, options.aiProvider);
      if (aiPatch) {
        patches.push(aiPatch);
      }
    }
  }

  return patches;
}

function generateDeterministicFix(item: DriftItem): DocPatch | null {
  switch (item.type) {
    case "signature-mismatch":
      return fixSignatureMismatch(item);
    case "removed-symbol":
      return fixRemovedSymbol(item);
    case "renamed-symbol":
      return fixRenamedSymbol(item);
    case "outdated-example":
      return fixOutdatedExample(item);
    default:
      return null;
  }
}

function fixSignatureMismatch(item: DriftItem): DocPatch | null {
  const oldCall = item.oldValue;
  const newCall = item.newValue;

  const oldFnName = oldCall.split("(")[0]!;
  const newFnName = newCall.split("(")[0]!;

  const oldParamsMatch = oldCall.match(/\(([^)]*)\)/);
  const newParamsMatch = newCall.match(/\(([^)]*)\)/);

  if (!oldParamsMatch || !newParamsMatch) return null;

  const content = item.docReference.content;
  const baseName = oldFnName.includes(".") ? oldFnName.split(".").pop()! : oldFnName;

  const callRegex = new RegExp(
    `${escapeRegex(baseName)}\\s*\\(${escapeRegex(oldParamsMatch[1]!.trim())}\\)`,
    "g",
  );

  const newBaseName = newFnName.includes(".") ? newFnName.split(".").pop()! : newFnName;
  const newText = content.replace(callRegex, `${newBaseName}(${newParamsMatch[1]!.trim()})`);

  if (newText === content) return null;

  return {
    filePath: item.docReference.docFilePath,
    lineStart: item.docReference.lineStart,
    lineEnd: item.docReference.lineEnd,
    oldText: content,
    newText,
    driftItem: item,
  };
}

function fixRemovedSymbol(item: DriftItem): DocPatch {
  const lines = item.docReference.content.split("\n");
  const baseName = item.symbolName.includes(".")
    ? item.symbolName.split(".").pop()!
    : item.symbolName;

  const filtered = lines.filter((line) => {
    const regex = new RegExp(`\\b${escapeRegex(baseName)}\\b`);
    return !regex.test(line);
  });

  const newText = filtered.length > 0 ? filtered.join("\n") : "";

  return {
    filePath: item.docReference.docFilePath,
    lineStart: item.docReference.lineStart,
    lineEnd: item.docReference.lineEnd,
    oldText: item.docReference.content,
    newText,
    driftItem: item,
  };
}

function fixRenamedSymbol(item: DriftItem): DocPatch {
  const oldBaseName = item.oldValue.includes(".")
    ? item.oldValue.split(".").pop()!
    : item.oldValue;
  const newBaseName = item.newValue.includes(".")
    ? item.newValue.split(".").pop()!
    : item.newValue;

  const regex = new RegExp(`\\b${escapeRegex(oldBaseName)}\\b`, "g");
  const newText = item.docReference.content.replace(regex, newBaseName);

  return {
    filePath: item.docReference.docFilePath,
    lineStart: item.docReference.lineStart,
    lineEnd: item.docReference.lineEnd,
    oldText: item.docReference.content,
    newText,
    driftItem: item,
  };
}

function fixOutdatedExample(item: DriftItem): DocPatch | null {
  const content = item.docReference.content;
  const oldCall = item.oldValue;
  const newCall = item.newValue;

  if (!content.includes(oldCall)) return null;

  const newText = content.replace(oldCall, newCall);

  return {
    filePath: item.docReference.docFilePath,
    lineStart: item.docReference.lineStart,
    lineEnd: item.docReference.lineEnd,
    oldText: content,
    newText,
    driftItem: item,
  };
}

async function generateAiFix(
  item: DriftItem,
  provider: AiProvider,
): Promise<DocPatch | null> {
  try {
    const response = await provider.generateFix({
      docContent: item.docReference.content,
      symbolName: item.symbolName,
      oldSignature: item.oldValue,
      newSignature: item.newValue,
      context: `Drift type: ${item.type}`,
    });

    return {
      filePath: item.docReference.docFilePath,
      lineStart: item.docReference.lineStart,
      lineEnd: item.docReference.lineEnd,
      oldText: item.docReference.content,
      newText: response.fixedContent,
      driftItem: item,
    };
  } catch {
    return null;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
