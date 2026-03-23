import type { ChangeSet, DocReference, DriftItem, DriftReport, ParsedSymbol } from "./types.js";

export interface DriftDetectorInput {
  changeSets: ChangeSet[];
  docReferences: DocReference[];
}

export function detectDrift(input: DriftDetectorInput): DriftReport {
  const items: DriftItem[] = [];

  for (const changeSet of input.changeSets) {
    items.push(...detectSignatureMismatches(changeSet, input.docReferences));
    items.push(...detectRemovedSymbols(changeSet, input.docReferences));
    items.push(...detectRenamedSymbols(changeSet, input.docReferences));
    items.push(...detectOutdatedExamples(changeSet, input.docReferences));
  }

  return {
    items: deduplicateItems(items),
    changeSets: input.changeSets,
    docReferences: input.docReferences,
  };
}

function detectSignatureMismatches(
  changeSet: ChangeSet,
  docRefs: DocReference[],
): DriftItem[] {
  const items: DriftItem[] = [];

  for (const mod of changeSet.modified) {
    const refs = findRefsForSymbol(mod.after.name, docRefs);

    for (const ref of refs) {
      const oldSig = formatSignature(mod.before);
      const newSig = formatSignature(mod.after);

      if (oldSig !== newSig && ref.content.includes(extractCallPattern(mod.before))) {
        items.push({
          type: "signature-mismatch",
          symbolName: mod.after.name,
          docReference: ref,
          oldValue: oldSig,
          newValue: newSig,
          confidence: computeSignatureConfidence(mod.before, mod.after, ref),
        });
      }
    }
  }

  return items;
}

function detectRemovedSymbols(
  changeSet: ChangeSet,
  docRefs: DocReference[],
): DriftItem[] {
  const items: DriftItem[] = [];

  for (const removed of changeSet.removed) {
    const refs = findRefsForSymbol(removed.name, docRefs);

    for (const ref of refs) {
      items.push({
        type: "removed-symbol",
        symbolName: removed.name,
        docReference: ref,
        oldValue: removed.name,
        newValue: "(removed)",
        confidence: 0.9,
      });
    }
  }

  return items;
}

function detectRenamedSymbols(
  changeSet: ChangeSet,
  docRefs: DocReference[],
): DriftItem[] {
  const items: DriftItem[] = [];
  const removedNames = new Set(changeSet.removed.map((s) => s.name));
  const addedNames = new Set(changeSet.added.map((s) => s.name));

  for (const removed of changeSet.removed) {
    const bestMatch = findBestRenameCandidate(removed, changeSet.added);
    if (!bestMatch) continue;

    if (removedNames.has(removed.name) && addedNames.has(bestMatch.name)) {
      const refs = findRefsForSymbol(removed.name, docRefs);
      for (const ref of refs) {
        items.push({
          type: "renamed-symbol",
          symbolName: removed.name,
          docReference: ref,
          oldValue: removed.name,
          newValue: bestMatch.name,
          confidence: 0.75,
        });
      }
    }
  }

  return items;
}

function detectOutdatedExamples(
  changeSet: ChangeSet,
  docRefs: DocReference[],
): DriftItem[] {
  const items: DriftItem[] = [];

  for (const mod of changeSet.modified) {
    const refs = findRefsForSymbol(mod.after.name, docRefs);

    for (const ref of refs) {
      if (!isCodeBlock(ref.content)) continue;

      const oldCallPattern = extractCallPattern(mod.before);
      if (oldCallPattern && ref.content.includes(oldCallPattern)) {
        const newCallPattern = extractCallPattern(mod.after);
        items.push({
          type: "outdated-example",
          symbolName: mod.after.name,
          docReference: ref,
          oldValue: oldCallPattern,
          newValue: newCallPattern,
          confidence: computeExampleConfidence(mod.before, ref),
        });
      }
    }
  }

  return items;
}

function findRefsForSymbol(symbolName: string, docRefs: DocReference[]): DocReference[] {
  const baseName = symbolName.includes(".") ? symbolName.split(".").pop()! : symbolName;
  return docRefs.filter(
    (ref) => ref.symbolName === symbolName || ref.symbolName === baseName,
  );
}

function formatSignature(symbol: ParsedSymbol): string {
  const params = (symbol.parameters ?? [])
    .map((p) => {
      const opt = p.optional ? "?" : "";
      const type = p.type ? `: ${p.type}` : "";
      return `${p.name}${opt}${type}`;
    })
    .join(", ");

  const ret = symbol.returnType ? `: ${symbol.returnType}` : "";
  return `${symbol.name}(${params})${ret}`;
}

function extractCallPattern(symbol: ParsedSymbol): string {
  const baseName = symbol.name.includes(".") ? symbol.name.split(".").pop()! : symbol.name;
  const params = (symbol.parameters ?? []).map((p) => p.name).join(", ");
  return `${baseName}(${params})`;
}

function isCodeBlock(content: string): boolean {
  return content.includes("```");
}

function computeSignatureConfidence(
  before: ParsedSymbol,
  after: ParsedSymbol,
  ref: DocReference,
): number {
  let confidence = 0.5;

  const oldCall = extractCallPattern(before);
  if (ref.content.includes(oldCall)) {
    confidence += 0.25;
  }

  if (ref.matchType === "name") {
    confidence += 0.15;
  }

  const beforeParams = before.parameters ?? [];
  const afterParams = after.parameters ?? [];
  if (beforeParams.length !== afterParams.length) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

function computeExampleConfidence(before: ParsedSymbol, ref: DocReference): number {
  let confidence = 0.6;

  const callPattern = extractCallPattern(before);
  if (ref.content.includes(callPattern)) {
    confidence += 0.2;
  }

  if (ref.matchType === "name") {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

function findBestRenameCandidate(
  removed: ParsedSymbol,
  added: ParsedSymbol[],
): ParsedSymbol | undefined {
  return added.find((a) => a.kind === removed.kind && a.name !== removed.name);
}

function deduplicateItems(items: DriftItem[]): DriftItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.symbolName}:${item.docReference.docFilePath}:${item.docReference.lineStart}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
