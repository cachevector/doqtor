export interface ParsedSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "constant" | "method";
  filePath: string;
  line: number;
  parameters?: ParameterInfo[];
  returnType?: string;
  jsDoc?: string;
  exported: boolean;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ChangeSet {
  filePath: string;
  added: ParsedSymbol[];
  removed: ParsedSymbol[];
  modified: ModifiedSymbol[];
}

export interface ModifiedSymbol {
  before: ParsedSymbol;
  after: ParsedSymbol;
}

export interface DocReference {
  docFilePath: string;
  lineStart: number;
  lineEnd: number;
  symbolName: string;
  matchType: "name" | "proximity" | "content";
  content: string;
}

export interface DriftItem {
  type: "signature-mismatch" | "removed-symbol" | "outdated-example" | "renamed-symbol";
  symbolName: string;
  docReference: DocReference;
  oldValue: string;
  newValue: string;
  confidence: number;
}

export interface DriftReport {
  items: DriftItem[];
  changeSets: ChangeSet[];
  docReferences: DocReference[];
}

export interface DocPatch {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  oldText: string;
  newText: string;
  driftItem: DriftItem;
}

export interface DoqtorConfig {
  docsPaths: string[];
  ignore: string[];
  ai: {
    enabled: boolean;
    provider?: "openai" | "anthropic";
  };
  autoPR: boolean;
  batchWindow?: number; // Minutes to wait before processing a batch
}
