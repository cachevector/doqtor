import { Project, type SourceFile, SyntaxKind, type Node } from "ts-morph";
import type { ParsedSymbol, ParameterInfo } from "@doqtor/core-engine";
// @ts-ignore
import filbert from "filbert";

const project = new Project({ useInMemoryFileSystem: true });

export async function parseSource(filePath: string, content: string, includePrivate: boolean = false): Promise<ParsedSymbol[]> {
  if (filePath.endsWith(".py")) {
    return parsePython(filePath, content, includePrivate);
  }
  
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

function parsePython(filePath: string, content: string, includePrivate: boolean): ParsedSymbol[] {
  let ast;
  try {
    const code = content.endsWith("\n") ? content : content + "\n";
    ast = filbert.parse(code, { locations: true });
  } catch (e) {
    return [];
  }

  const symbols: ParsedSymbol[] = [];

  function traverse(node: any) {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(n => traverse(n));
      return;
    }

    if (node.type === "Program" || node.type === "BlockStatement") {
      traverse(node.body);
      return;
    }

    if (node.type === "FunctionDeclaration") {
      const name = node.id.name;
      const isPrivate = name.startsWith("_") && !name.startsWith("__");
      
      if (includePrivate || !isPrivate) {
        symbols.push({
          name,
          kind: "function",
          filePath,
          line: node.loc?.start.line ?? 1,
          exported: !isPrivate,
          jsDoc: extractFilbertDocstring(node),
        });
      }
    } else if (node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression") {
      // Check for class-like assignment: A.prototype.m = ...
      const left = node.expression.left;
      if (left.type === "MemberExpression" && left.object.type === "MemberExpression") {
        if (left.object.property.name === "prototype") {
          const className = left.object.object.name;
          const methodName = left.property.name;
          const isPrivate = methodName.startsWith("_") && !methodName.startsWith("__");

          if (includePrivate || !isPrivate) {
            symbols.push({
              name: `${className}.${methodName}`,
              kind: "method",
              filePath,
              line: node.loc?.start.line ?? 1,
              exported: !isPrivate,
              // FunctionExpression might have docstring in body
              jsDoc: extractFilbertDocstring(node.expression.right),
            });
          }
        }
      }
    } else if (node.type === "ClassDeclaration") {
      // Filbert sometimes uses real ClassDeclaration in newer modes or depending on input
      const className = node.id.name;
      const isPrivate = className.startsWith("_");
      
      if (includePrivate || !isPrivate) {
        symbols.push({
          name: className,
          kind: "class",
          filePath,
          line: node.loc?.start.line ?? 1,
          exported: !isPrivate,
          jsDoc: extractFilbertDocstring(node),
        });
      }

      if (node.body && node.body.type === "ClassBody") {
        for (const element of node.body.body) {
          if (element.type === "MethodDefinition") {
            const mName = element.key.name;
            const isMPrivate = mName.startsWith("_") && !mName.startsWith("__");
            if (includePrivate || !isMPrivate) {
              symbols.push({
                name: `${className}.${mName}`,
                kind: "method",
                filePath,
                line: element.loc?.start.line ?? 1,
                exported: !isMPrivate,
                jsDoc: extractFilbertDocstring(element.value),
              });
            }
          }
        }
      }
    }
  }

  traverse(ast);
  
  // Dedup and find classes that might have been captured as functions (constructors)
  const result: ParsedSymbol[] = [];
  const names = new Set();

  for (const s of symbols) {
    if (!names.has(s.name)) {
      result.push(s);
      names.add(s.name);
    }
  }

  return result;
}

function extractFilbertDocstring(node: any): string | undefined {
  if (!node) return undefined;
  const body = node.body?.body || [];
  for (const stmt of body) {
    if (stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && typeof stmt.expression.value === "string") {
      return stmt.expression.value;
    }
    if (stmt.type !== "VariableDeclaration" && stmt.type !== "IfStatement" && stmt.type !== "ExpressionStatement") break;
  }
  return undefined;
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
