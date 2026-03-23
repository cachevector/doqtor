export type {
  ParsedSymbol,
  ParameterInfo,
  ChangeSet,
  ModifiedSymbol,
  DocReference,
  DriftItem,
  DriftReport,
  DocPatch,
  DoqtorConfig,
} from "./types.js";

export { parseDiff } from "./diff-parser.js";
export type { DiffFile, DiffHunk } from "./diff-parser.js";

export { analyzeDiff } from "./diff-analyzer.js";
export type { ParseFn, AnalyzerInput } from "./diff-analyzer.js";
