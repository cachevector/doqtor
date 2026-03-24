import type { DriftReport, DriftItem, DocPatch } from "@doqtor/core-engine";
import type { AiProvider } from "./ai-provider.js";

export interface FixerOptions {
  aiProvider?: AiProvider;
}

export async function generateFixes(
  report: DriftReport,
  options: FixerOptions = {},
): Promise<DocPatch[]> {
  // Group drift items by their target doc region to avoid overlapping patches
  const groups = new Map<string, DriftItem[]>();
  for (const item of report.items) {
    const key = `${item.docReference.docFilePath}:${item.docReference.lineStart}:${item.docReference.lineEnd}`;
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const patches: DocPatch[] = [];

  for (const items of groups.values()) {
    const first = items[0]!;
    const originalText = first.docReference.content;
    let currentText = originalText;
    let appliedAny = false;

    // Apply renames first, then signature fixes, then removals last
    const sorted = [...items].sort((a, b) => {
      const order: Record<string, number> = {
        "renamed-symbol": 0,
        "signature-mismatch": 1,
        "outdated-example": 2,
        "removed-symbol": 3,
      };
      return (order[a.type] ?? 9) - (order[b.type] ?? 9);
    });

    for (const item of sorted) {
      const itemWithText: DriftItem = {
        ...item,
        docReference: { ...item.docReference, content: currentText },
      };
      const patch = generateDeterministicFix(itemWithText);
      if (patch && patch.newText !== currentText) {
        currentText = patch.newText;
        appliedAny = true;
        continue;
      }

      if (options.aiProvider) {
        const aiPatch = await generateAiFix(itemWithText, options.aiProvider);
        if (aiPatch && aiPatch.newText !== currentText) {
          currentText = aiPatch.newText;
          appliedAny = true;
        }
      }
    }

    if (appliedAny) {
      patches.push({
        filePath: first.docReference.docFilePath,
        lineStart: first.docReference.lineStart,
        lineEnd: first.docReference.lineEnd,
        oldText: originalText,
        newText: currentText,
        driftItem: first,
      });
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
  const oldName = item.oldValue;
  const newName = item.newValue;
  const oldBaseName = oldName.includes(".") ? oldName.split(".").pop()! : oldName;
  const newBaseName = newName.includes(".") ? newName.split(".").pop()! : newName;

  const content = item.docReference.content;
  let newText: string;

  // If the full dotted name appears, replace that directly (e.g. StringRule -> StringSchema)
  const fullRegex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, "g");
  if (fullRegex.test(content)) {
    newText = content.replace(fullRegex, newName);
  } else {
    // Replace base name only in code contexts: inside backticks, after 'new ', or
    // when it looks like an identifier (preceded by dot, space+capital, import, etc.)
    newText = content.replace(
      new RegExp(`(\`[^\`]*?)\\b${escapeRegex(oldBaseName)}\\b([^\`]*?\`)`, "g"),
      `$1${newBaseName}$2`,
    );
    // Also replace in code block lines (lines inside ``` blocks)
    if (newText === content) {
      newText = replaceInCodeBlocks(content, oldBaseName, newBaseName);
    }
    // Replace when preceded by 'new ' or followed by '(' or property access '.\w'
    if (newText === content) {
      const codeContextRegex = new RegExp(
        `(\\bnew\\s+)${escapeRegex(oldBaseName)}\\b|\\b${escapeRegex(oldBaseName)}(\\s*\\()|\\b${escapeRegex(oldBaseName)}(\\.\\w)`,
        "g",
      );
      newText = content.replace(codeContextRegex, (_match, pre, parenPost, dotPost) => {
        if (pre) return `${pre}${newBaseName}`;
        if (parenPost) return `${newBaseName}${parenPost}`;
        return `${newBaseName}${dotPost}`;
      });
    }
    // Headings with backtick-wrapped names: ### `StringRule`
    if (newText === content) {
      const headingRegex = new RegExp(`\`${escapeRegex(oldBaseName)}\``, "g");
      newText = content.replace(headingRegex, `\`${newBaseName}\``);
    }
  }

  return {
    filePath: item.docReference.docFilePath,
    lineStart: item.docReference.lineStart,
    lineEnd: item.docReference.lineEnd,
    oldText: item.docReference.content,
    newText,
    driftItem: item,
  };
}

function replaceInCodeBlocks(content: string, oldName: string, newName: string): string {
  const lines = content.split("\n");
  let inCodeBlock = false;
  const result: string[] = [];
  const regex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, "g");

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
    } else if (inCodeBlock) {
      result.push(line.replace(regex, newName));
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
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
