import { Project, type SourceFile, SyntaxKind, type Node } from "ts-morph";
import type { ParsedSymbol, ParameterInfo } from "@doqtor/core-engine";

const project = new Project({ useInMemoryFileSystem: true });

export function parseSourceFile(filePath: string, content: string, includePrivate: boolean = false): ParsedSymbol[] {
  const sourceFile = project.createSourceFile(filePath, content, { overwrite: true });
  const symbols: ParsedSymbol[] = [];

  symbols.push(...extractFunctions(sourceFile, filePath));
  symbols.push(...extractClasses(sourceFile, filePath));
  symbols.push(...extractInterfaces(sourceFile, filePath));
  symbols.push(...extractTypeAliases(sourceFile, filePath));
  symbols.push(...extractConstants(sourceFile, filePath));

  if (!includePrivate) {
    return symbols.filter((s) => s.exported);
  }
  return symbols;
}

function extractFunctions(sourceFile: SourceFile, filePath: string): ParsedSymbol[] {
  return sourceFile.getFunctions().map((fn) => {
    const params = fn.getParameters().map(toParameterInfo);
    return {
      name: fn.getName() ?? "(anonymous)",
      kind: "function" as const,
      filePath,
      line: fn.getStartLineNumber(),
      parameters: params,
      returnType: fn.getReturnType().getText(fn),
      jsDoc: getJsDoc(fn),
      exported: fn.isExported(),
    };
  });
}

function extractClasses(sourceFile: SourceFile, filePath: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const cls of sourceFile.getClasses()) {
    symbols.push({
      name: cls.getName() ?? "(anonymous)",
      kind: "class",
      filePath,
      line: cls.getStartLineNumber(),
      jsDoc: getJsDoc(cls),
      exported: cls.isExported(),
    });

    for (const method of cls.getMethods()) {
      const params = method.getParameters().map(toParameterInfo);
      symbols.push({
        name: `${cls.getName()}.${method.getName()}`,
        kind: "method",
        filePath,
        line: method.getStartLineNumber(),
        parameters: params,
        returnType: method.getReturnType().getText(method),
        jsDoc: getJsDoc(method),
        exported: cls.isExported(),
      });
    }
  }

  return symbols;
}

function extractInterfaces(sourceFile: SourceFile, filePath: string): ParsedSymbol[] {
  return sourceFile.getInterfaces().map((iface) => ({
    name: iface.getName(),
    kind: "interface" as const,
    filePath,
    line: iface.getStartLineNumber(),
    jsDoc: getJsDoc(iface),
    exported: iface.isExported(),
  }));
}

function extractTypeAliases(sourceFile: SourceFile, filePath: string): ParsedSymbol[] {
  return sourceFile.getTypeAliases().map((alias) => ({
    name: alias.getName(),
    kind: "type" as const,
    filePath,
    line: alias.getStartLineNumber(),
    jsDoc: getJsDoc(alias),
    exported: alias.isExported(),
  }));
}

function extractConstants(sourceFile: SourceFile, filePath: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const stmt of sourceFile.getVariableStatements()) {
    const isExported = stmt.isExported();
    for (const decl of stmt.getDeclarations()) {
      symbols.push({
        name: decl.getName(),
        kind: "constant",
        filePath,
        line: decl.getStartLineNumber(),
        returnType: decl.getType().getText(decl),
        jsDoc: getJsDoc(stmt),
        exported: isExported,
      });
    }
  }

  return symbols;
}

function toParameterInfo(param: Node & { getName(): string; getType(): { getText(node?: Node): string }; isOptional(): boolean; getInitializer(): Node | undefined }): ParameterInfo {
  return {
    name: param.getName(),
    type: param.getType().getText(param),
    optional: param.isOptional(),
    defaultValue: param.getInitializer()?.getText(),
  };
}

function getJsDoc(node: Node): string | undefined {
  const jsDocs = node.getChildrenOfKind(SyntaxKind.JSDoc);
  if (jsDocs.length === 0) return undefined;
  return jsDocs.map((doc) => doc.getText()).join("\n");
}
