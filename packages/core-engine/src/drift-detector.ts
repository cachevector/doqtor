import type { ChangeSet, DocReference, DriftItem, DriftReport, ParsedSymbol } from "./types.js";

export interface DriftDetectorInput {
  changeSets: ChangeSet[];
  docReferences: DocReference[];
}

export function detectDrift(input: DriftDetectorInput): DriftReport {
  const items: DriftItem[] = [];

  for (const changeSet of input.changeSets) {
    // First pass: identify class/type-level renames (no dots) to inform method matching
    const classRenames = new Map<string, string>();
    const topLevelRemoved = changeSet.removed.filter((s) => !s.name.includes("."));
    const topLevelAdded = changeSet.added.filter((s) => !s.name.includes("."));
    for (const removed of topLevelRemoved) {
      const match = findBestRenameCandidate(removed, topLevelAdded);
      if (match) {
        classRenames.set(removed.name, match.name);
      }
    }

    // Second pass: compute all rename pairs using class rename context (1-to-1 matching)
    const renameMap = buildRenameMap(changeSet.removed, changeSet.added, classRenames);
    const renamedNames = new Set(renameMap.map(([rem]) => rem.name));

    items.push(...detectSignatureMismatches(changeSet, input.docReferences));
    items.push(...detectRemovedSymbols(changeSet, input.docReferences, renamedNames));
    items.push(...detectRenamedSymbols(changeSet, input.docReferences, classRenames));
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
  renamedNames: Set<string>,
): DriftItem[] {
  const items: DriftItem[] = [];

  for (const removed of changeSet.removed) {
    if (renamedNames.has(removed.name)) continue;

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
  classRenames?: Map<string, string>,
): DriftItem[] {
  const items: DriftItem[] = [];

  // Build 1-to-1 rename map using greedy best-match
  const renameMap = buildRenameMap(changeSet.removed, changeSet.added, classRenames);

  for (const [removed, added] of renameMap) {
    const refs = findRefsForSymbol(removed.name, docRefs);
    for (const ref of refs) {
      items.push({
        type: "renamed-symbol",
        symbolName: removed.name,
        docReference: ref,
        oldValue: removed.name,
        newValue: added.name,
        confidence: 0.75,
      });
    }
  }

  return items;
}

function buildRenameMap(
  removed: ParsedSymbol[],
  added: ParsedSymbol[],
  classRenames?: Map<string, string>,
): Array<[ParsedSymbol, ParsedSymbol]> {
  // Score all possible pairs
  const pairs: Array<{ removed: ParsedSymbol; added: ParsedSymbol; score: number }> = [];

  for (const rem of removed) {
    for (const add of added) {
      if (rem.kind !== add.kind || rem.name === add.name) continue;
      const score = scoreRenamePair(rem, add, classRenames);
      if (score > 0) {
        pairs.push({ removed: rem, added: add, score });
      }
    }
  }

  // Sort by score descending, greedily assign 1-to-1
  pairs.sort((a, b) => b.score - a.score);

  const usedRemoved = new Set<string>();
  const usedAdded = new Set<string>();
  const result: Array<[ParsedSymbol, ParsedSymbol]> = [];

  for (const pair of pairs) {
    if (usedRemoved.has(pair.removed.name) || usedAdded.has(pair.added.name)) continue;
    usedRemoved.add(pair.removed.name);
    usedAdded.add(pair.added.name);
    result.push([pair.removed, pair.added]);
  }

  return result;
}

function scoreRenamePair(
  removed: ParsedSymbol,
  added: ParsedSymbol,
  classRenames?: Map<string, string>,
): number {
  let score = 0;
  const removedBase = baseName(removed.name);
  const addedBase = baseName(added.name);
  const removedPar = parentName(removed.name);
  const addedPar = parentName(added.name);

  // Exact base name match (e.g. StringRule.minLength -> StringSchema.minLength)
  if (addedBase === removedBase) {
    score += 10;
  }

  // Same parent (e.g. Validator.check -> Validator.run)
  if (removedPar && addedPar && addedPar === removedPar) {
    score += 20;
  }

  // Renamed parent match (e.g. StateContainer.dispatch -> StateStore.emit)
  if (removedPar && addedPar && classRenames) {
    const renamedParent = classRenames.get(removedPar);
    if (renamedParent === addedPar) {
      score += 15;
    }
  }

  // Penalize cross-class base-name matches
  if (removedPar && addedPar && addedPar !== removedPar && addedBase === removedBase) {
    const isRenamedParent = classRenames?.get(removedPar) === addedPar;
    if (!isRenamedParent) {
      score -= 5;
    }
  }

  // Partial name similarity (e.g. selectAsync -> selectDeferred, VERSION -> LIB_VERSION)
  if (addedBase !== removedBase) {
    if (addedBase.includes(removedBase) || removedBase.includes(addedBase)) {
      score += 3;
    }
    // Check shared segments (split by underscore or camelCase boundary)
    const removedParts = removedBase.split(/[_]|(?=[A-Z])/).filter((p) => p.length > 0);
    const addedParts = addedBase.split(/[_]|(?=[A-Z])/).filter((p) => p.length > 0);
    const shared = removedParts.filter((p) => addedParts.includes(p));
    if (shared.length > 0) {
      score += shared.length * 2;
    }
  }

  return score;
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
  classRenames?: Map<string, string>,
): ParsedSymbol | undefined {
  const candidates = added.filter((a) => a.kind === removed.kind && a.name !== removed.name);
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const removedBase = baseName(removed.name);
  const removedParent = parentName(removed.name);

  let best: ParsedSymbol | undefined;
  let bestScore = 0; // Minimum score of 1 required to match

  for (const candidate of candidates) {
    let score = 0;
    const candidateBase = baseName(candidate.name);
    const candidateParent = parentName(candidate.name);

    // Exact base name match (e.g. StringRule.minLength -> StringSchema.minLength)
    if (candidateBase === removedBase) {
      score += 10;
    }

    // Same parent is a strong signal (e.g. Validator.check -> Validator.run)
    if (removedParent && candidateParent && candidateParent === removedParent) {
      score += 20;
    }

    // If the parent class was renamed, treat renamed parent as equivalent
    // (e.g. StateContainer.dispatch -> StateStore.emit when StateContainer->StateStore)
    if (removedParent && candidateParent && classRenames) {
      const renamedParent = classRenames.get(removedParent);
      if (renamedParent === candidateParent) {
        score += 15;
      }
    }

    // Penalize cross-class base-name matches when both have parents
    if (removedParent && candidateParent && candidateParent !== removedParent && candidateBase === removedBase) {
      const isRenamedParent = classRenames?.get(removedParent) === candidateParent;
      if (!isRenamedParent) {
        score -= 5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function baseName(name: string): string {
  return name.includes(".") ? name.split(".").pop()! : name;
}

function parentName(name: string): string | null {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.substring(0, idx) : null;
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
