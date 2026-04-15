import type { DiamondAstNode, DiamondSymbol, DiamondValueType } from "../types";

import { countSourceLines } from "../ide-utils";

export type ScopeInsightNode = {
  id: string;
  label: string;
  kind: "program" | "main" | "function" | "branch" | "loop";
  depth: number;
  startLine: number;
  endLine: number;
  symbols: DiamondSymbol[];
  children: ScopeInsightNode[];
};

export type ScopeInsight = {
  totalLines: number;
  root: ScopeInsightNode | null;
  builtins: DiamondSymbol[];
  flat: ScopeInsightNode[];
};

export type TypeInsight = {
  id: string;
  line: number;
  kind: "assignment" | "condition" | "return" | "argument" | "expression";
  label: string;
  expectedType: DiamondValueType | "n/a";
  inferredType: DiamondValueType;
  status: "ok" | "warning";
  detail: string;
};

export type TypeSuggestion = {
  id: string;
  line: number | null;
  severity: "tip" | "warning";
  title: string;
  body: string;
};

function getNodeLineRange(node: DiamondAstNode | null): { startLine: number; endLine: number } {
  if (!node) {
    return { startLine: 1, endLine: 1 };
  }

  let startLine = Math.max(node.line || 1, 1);
  let endLine = Math.max(node.line || 1, 1);

  for (const child of node.children) {
    const range = getNodeLineRange(child);
    startLine = Math.min(startLine, range.startLine);
    endLine = Math.max(endLine, range.endLine);
  }

  return { startLine, endLine };
}

function flattenScopes(node: ScopeInsightNode | null, output: ScopeInsightNode[] = []) {
  if (!node) {
    return output;
  }

  output.push(node);
  node.children.forEach((child) => flattenScopes(child, output));
  return output;
}

function createScopeNode(
  id: string,
  label: string,
  kind: ScopeInsightNode["kind"],
  depth: number,
  startLine: number,
  endLine: number
): ScopeInsightNode {
  return {
    id,
    label,
    kind,
    depth,
    startLine,
    endLine,
    symbols: [],
    children: []
  };
}

function extractStatements(node: DiamondAstNode | null): DiamondAstNode[] {
  if (!node) {
    return [];
  }

  if (node.type === "BLOCK") {
    if (node.children.length === 1 && node.children[0]?.type === "STATEMENT_LIST") {
      return node.children[0].children;
    }

    return node.children;
  }

  if (node.type === "STATEMENT_LIST") {
    return node.children;
  }

  return [node];
}

function collectChildScopes(parent: ScopeInsightNode, node: DiamondAstNode, nextId: () => string) {
  if (node.type === "FUNCTION_DECL") {
    const body = node.children[1] ?? null;
    const range = getNodeLineRange(body ?? node);
    const functionScope = createScopeNode(
      nextId(),
      `Function ${node.text ?? "anonymous"}()`,
      "function",
      parent.depth + 1,
      range.startLine,
      range.endLine
    );
    parent.children.push(functionScope);
    extractStatements(body).forEach((child) => collectChildScopes(functionScope, child, nextId));
    return;
  }

  if (node.type === "IF") {
    const thenBlock = node.children[1] ?? null;
    const elseBlock = node.children[2] ?? null;
    const thenRange = getNodeLineRange(thenBlock ?? node);
    const thenScope = createScopeNode(
      nextId(),
      `jodi block`,
      "branch",
      parent.depth + 1,
      thenRange.startLine,
      thenRange.endLine
    );

    parent.children.push(thenScope);
    extractStatements(thenBlock).forEach((child) => collectChildScopes(thenScope, child, nextId));

    if (elseBlock) {
      const elseRange = getNodeLineRange(elseBlock);
      const elseScope = createScopeNode(
        nextId(),
        `naile block`,
        "branch",
        parent.depth + 1,
        elseRange.startLine,
        elseRange.endLine
      );

      parent.children.push(elseScope);
      extractStatements(elseBlock).forEach((child) => collectChildScopes(elseScope, child, nextId));
    }

    return;
  }

  if (node.type === "WHILE" || node.type === "FOR") {
    const body = node.children[node.type === "FOR" ? 3 : 1] ?? null;
    const range = getNodeLineRange(body ?? node);
    const loopScope = createScopeNode(
      nextId(),
      node.type === "WHILE" ? "jotokhon loop" : "ghurao loop",
      "loop",
      parent.depth + 1,
      range.startLine,
      range.endLine
    );

    parent.children.push(loopScope);
    extractStatements(body).forEach((child) => collectChildScopes(loopScope, child, nextId));
    return;
  }

  if (node.type === "BLOCK" || node.type === "STATEMENT_LIST") {
    extractStatements(node).forEach((child) => collectChildScopes(parent, child, nextId));
  }
}

function assignSymbolsToScopes(root: ScopeInsightNode | null, symbols: DiamondSymbol[]) {
  if (!root) {
    return;
  }

  const flat = flattenScopes(root);

  for (const symbol of symbols.filter((item) => !item.builtin)) {
    const matches = flat.filter(
      (scope) =>
        scope.depth === symbol.scope &&
        symbol.line >= scope.startLine &&
        symbol.line <= scope.endLine
    );

    const target =
      matches.sort((left, right) => {
        const leftSpan = left.endLine - left.startLine;
        const rightSpan = right.endLine - right.startLine;
        return leftSpan - rightSpan;
      })[0] ?? root;

    target.symbols.push(symbol);
  }
}

export function buildScopeInsight(ast: DiamondAstNode | null, symbols: DiamondSymbol[], source: string): ScopeInsight {
  const totalLines = countSourceLines(source);
  const builtins = symbols.filter((symbol) => symbol.builtin);

  if (!ast) {
    return {
      totalLines,
      root: null,
      builtins,
      flat: []
    };
  }

  let counter = 0;
  const nextId = () => `scope-${counter++}`;
  const programRange = getNodeLineRange(ast);
  const root = createScopeNode(
    nextId(),
    "Program",
    "program",
    0,
    1,
    Math.max(programRange.endLine, totalLines)
  );

  const mainBlock =
    ast.type === "PROGRAM"
      ? ast.children.find((child) => child.type === "BLOCK" && child.text === "main") ?? null
      : ast.type === "BLOCK"
        ? ast
        : null;

  if (mainBlock) {
    const mainRange = getNodeLineRange(mainBlock);
    const mainScope = createScopeNode(
      nextId(),
      "Main block",
      "main",
      0,
      mainRange.startLine,
      Math.max(mainRange.endLine, totalLines)
    );
    root.children.push(mainScope);
    extractStatements(mainBlock).forEach((child) => collectChildScopes(mainScope, child, nextId));
  }

  if (ast.type === "PROGRAM") {
    ast.children
      .filter((child) => child.type === "FUNCTION_DECL")
      .forEach((child) => collectChildScopes(root, child, nextId));

    const functionList = ast.children.find(
      (child) => child.type === "STATEMENT_LIST" && child.text === "functions"
    );

    functionList?.children.forEach((child) => collectChildScopes(root, child, nextId));
  }

  assignSymbolsToScopes(root, symbols);

  return {
    totalLines,
    root,
    builtins,
    flat: flattenScopes(root)
  };
}

function isCompatibleType(expectedType: DiamondValueType | "n/a", inferredType: DiamondValueType) {
  if (expectedType === "n/a" || expectedType === "unknown" || inferredType === "unknown") {
    return true;
  }

  if (expectedType === inferredType) {
    return true;
  }

  return expectedType === "doshomik" && inferredType === "shonkha";
}

function getExpressionType(node: DiamondAstNode | null): DiamondValueType {
  if (!node) {
    return "unknown";
  }

  return node.valueType ?? "unknown";
}

function getFunctionTypeMap(symbols: DiamondSymbol[]) {
  return new Map(
    symbols
      .filter((symbol) => symbol.kind === "function")
      .map((symbol) => [symbol.name, symbol.type] as const)
  );
}

export function buildTypeInsights(ast: DiamondAstNode | null, symbols: DiamondSymbol[]) {
  const insights: TypeInsight[] = [];
  const functionTypes = getFunctionTypeMap(symbols);
  let counter = 0;

  function pushInsight(
    line: number,
    kind: TypeInsight["kind"],
    label: string,
    expectedType: TypeInsight["expectedType"],
    inferredType: DiamondValueType,
    detail: string
  ) {
    insights.push({
      id: `type-insight-${counter++}`,
      line,
      kind,
      label,
      expectedType,
      inferredType,
      status: isCompatibleType(expectedType, inferredType) ? "ok" : "warning",
      detail
    });
  }

  function visit(node: DiamondAstNode | null, functionName: string | null) {
    if (!node) {
      return;
    }

    switch (node.type) {
      case "FUNCTION_DECL": {
        const nextFunctionName = node.text ?? functionName;
        node.children.forEach((child) => visit(child, nextFunctionName));
        return;
      }

      case "DECLARATION": {
        const initializer = node.children.at(-1) ?? null;
        if (initializer && initializer !== node.children[0]) {
          pushInsight(
            node.line,
            "assignment",
            `${node.text ?? "value"} initializer`,
            node.valueType,
            getExpressionType(initializer),
            `Declaration expects ${node.valueType} and the initializer resolves to ${getExpressionType(initializer)}.`
          );
        }
        break;
      }

      case "ASSIGNMENT": {
        const target = node.children[0] ?? null;
        const value = node.children[1] ?? null;
        pushInsight(
          node.line,
          "assignment",
          `${target?.text ?? "assignment"} value`,
          getExpressionType(target),
          getExpressionType(value),
          `Assignment target expects ${getExpressionType(target)} and receives ${getExpressionType(value)}.`
        );
        break;
      }

      case "IF":
      case "WHILE":
      case "FOR": {
        const condition = node.children[node.type === "FOR" ? 1 : 0] ?? null;
        if (condition) {
          pushInsight(
            condition.line,
            "condition",
            `${node.type.toLowerCase()} condition`,
            "shotto",
            getExpressionType(condition),
            `Control flow conditions should resolve to shotto.`
          );
        }
        break;
      }

      case "RETURN": {
        const value = node.children[0] ?? null;
        const expected = functionName ? functionTypes.get(functionName) ?? "unknown" : "n/a";
        pushInsight(
          node.line,
          "return",
          `${functionName ?? "function"} return`,
          expected,
          getExpressionType(value),
          `Return expressions should match the surrounding function type.`
        );
        break;
      }

      case "FUNCTION_CALL": {
        const callSignature = symbols.find(
          (symbol) => symbol.name === node.text && symbol.kind === "function"
        );
        node.children[0]?.children.forEach((argument, index) => {
          pushInsight(
            argument.line,
            "argument",
            `${node.text ?? "call"} arg ${index + 1}`,
            callSignature?.paramTypes?.[index] ?? "n/a",
            getExpressionType(argument),
            `Function arguments are checked against the declared parameter list when available.`
          );
        });
        break;
      }

      case "BINARY_OP":
      case "UNARY_OP":
      case "ARRAY_REF":
      case "IDENTIFIER":
      case "INT_LITERAL":
      case "FLOAT_LITERAL":
      case "STRING_LITERAL":
      case "BOOL_LITERAL":
      case "EXPRESSION": {
        if (node.valueType && node.valueType !== "unknown") {
          pushInsight(
            node.line,
            "expression",
            node.text ?? node.type,
            "n/a",
            node.valueType,
            `The compiler inferred ${node.valueType} for this expression.`
          );
        }
        break;
      }
    }

    node.children.forEach((child) => visit(child, functionName));
  }

  visit(ast, null);

  return insights.sort((left, right) => {
    if (left.line === right.line) {
      return left.label.localeCompare(right.label);
    }
    return left.line - right.line;
  });
}

function formatType(type: DiamondValueType | "n/a") {
  return type === "n/a" ? "the expected type" : type;
}

function getWarningSuggestion(insight: TypeInsight): Pick<TypeSuggestion, "line" | "severity" | "title" | "body"> {
  switch (insight.kind) {
    case "condition":
      return {
        line: insight.line,
        severity: "warning",
        title: "Make the condition explicitly boolean",
        body: `Line ${insight.line} currently resolves to ${insight.inferredType}. Compare it against a value or store the result in a shotto variable before branching.`
      };
    case "assignment":
      return {
        line: insight.line,
        severity: "warning",
        title: "Align the assignment with its declaration",
        body: `${insight.label} expects ${formatType(insight.expectedType)} but is receiving ${insight.inferredType}. Convert the value or update the declaration so both sides agree.`
      };
    case "return":
      return {
        line: insight.line,
        severity: "warning",
        title: "Return the declared function type",
        body: `${insight.label} expects ${formatType(insight.expectedType)} but the current return path resolves to ${insight.inferredType}.`
      };
    case "argument":
      return {
        line: insight.line,
        severity: "warning",
        title: "Normalize the argument before the call",
        body: `${insight.label} is inferred as ${insight.inferredType}, but the callee expects ${formatType(insight.expectedType)}.`
      };
    default:
      return {
        line: insight.line,
        severity: "warning",
        title: "Strengthen the inferred type here",
        body: `${insight.label} is drifting away from ${formatType(insight.expectedType)}. Adding an explicit typed intermediate can make the analysis more stable.`
      };
  }
}

export function buildTypeSuggestions(ast: DiamondAstNode | null, symbols: DiamondSymbol[]) {
  const insights = buildTypeInsights(ast, symbols);
  const suggestions: TypeSuggestion[] = [];
  const seenKeys = new Set<string>();
  let counter = 0;

  function pushSuggestion(next: Pick<TypeSuggestion, "line" | "severity" | "title" | "body">) {
    const key = `${next.line ?? "none"}:${next.title}`;
    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    suggestions.push({
      id: `type-suggestion-${counter++}`,
      ...next
    });
  }

  for (const insight of insights) {
    if (suggestions.length >= 4) {
      break;
    }

    if (insight.status === "warning") {
      pushSuggestion(getWarningSuggestion(insight));
    }
  }

  if (suggestions.length < 4) {
    for (const insight of insights) {
      if (suggestions.length >= 4) {
        break;
      }

      if (insight.inferredType === "unknown") {
        pushSuggestion({
          line: insight.line,
          severity: "tip",
          title: "Anchor this expression with a typed value",
          body: `Line ${insight.line} is still inferred as unknown. Move the expression into a typed variable or pass a literal with a clearer type.`
        });
      }
    }
  }

  if (suggestions.length < 4) {
    const userVariables = symbols.filter(
      (symbol) => !symbol.builtin && symbol.kind !== "function" && symbol.type !== "unknown"
    );
    const userFunctions = symbols.filter(
      (symbol) => !symbol.builtin && symbol.kind === "function"
    );

    if (userVariables.length > 0) {
      pushSuggestion({
        line: userVariables[0]?.line ?? null,
        severity: "tip",
        title: "Typed declarations are stabilizing inference",
        body: `The compiler already has ${userVariables.length} typed symbol${userVariables.length === 1 ? "" : "s"} to work with. Keeping input and intermediate values declared early will make future suggestions more precise.`
      });
    }

    if (suggestions.length < 4 && userFunctions.length > 0) {
      pushSuggestion({
        line: userFunctions[0]?.line ?? null,
        severity: "tip",
        title: "Keep helper boundaries strongly typed",
        body: "Function declarations are giving the analyzer clean checkpoints. Matching parameter and return types will keep call-site hints readable as the program grows."
      });
    }
  }

  if (suggestions.length === 0) {
    pushSuggestion({
      line: null,
      severity: "tip",
      title: "Keep values anchored with explicit declarations",
      body: "Type inference gets sharper when input values and intermediate expressions are stored in clearly typed variables before they are reused."
    });
  }

  return suggestions.slice(0, 4);
}
