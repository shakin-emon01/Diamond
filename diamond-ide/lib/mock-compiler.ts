import type {
  DiamondAstNode,
  DiamondError,
  DiamondResult,
  DiamondSymbol,
  DiamondTacInstruction,
  DiamondToken,
  DiamondValueType
} from "./types";

const DECLARATION_RE =
  /^dhoro\s+(shonkha|doshomik|lekha|shotto)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?(?:\s*=\s*(.+))?;$/;
const ASSIGNMENT_RE =
  /^([A-Za-z_][A-Za-z0-9_]*)(?:\[(.+)\])?\s*=\s*(.+);$/;
const ASSIGNMENT_FRAGMENT_RE =
  /^([A-Za-z_][A-Za-z0-9_]*)(?:\[(.+)\])?\s*=\s*(.+)$/;
const PRINT_RE = /^dekhao\s*\((.+)\);$/;
const INPUT_RE = /^nao\s*\((.+)\);$/;
const IF_RE = /^jodi\s*\((.+)\)\s*\{$/;
const ELSE_RE = /^naile\s*\{$/;
const WHILE_RE = /^jotokhon\s*\((.+)\)\s*\{$/;
const FOR_RE = /^ghurao\s*\((.+);(.+);(.+)\)\s*\{$/;
const FUNCTION_RE = /^kaj\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{$/;
const RETURN_RE = /^ferot\s+(.+);$/;
const ARRAY_RE = /^([A-Za-z_][A-Za-z0-9_]*)\[(.+)\]$/;
const CALL_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/;

const KEYWORD_TOKENS: Record<string, string> = {
  shuru: "SHURU",
  shesh: "SHESH",
  dhoro: "DHORO",
  shonkha: "SHONKHA",
  doshomik: "DOSHOMIK",
  lekha: "LEKHA",
  shotto: "SHOTTO",
  khali: "KHALI",
  auto: "AUTO",
  mithya: "MITHYA",
  jodi: "JODI",
  naile: "NAILE",
  jotokhon: "JOTOKHON",
  ghurao: "GHURAO",
  kaj: "KAJ",
  ferot: "FEROT",
  dekhao: "DEKHAO",
  nao: "NAO",
  ebong: "EBONG",
  ba: "BA",
  na: "NA",
  amdani: "AMDANI",
  gothon: "GOTHON"
};

const BUILTIN_SYMBOLS: DiamondSymbol[] = [
  {
    name: "jora",
    kind: "function",
    type: "lekha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 2,
    paramTypes: ["lekha", "lekha"]
  },
  {
    name: "dairgho",
    kind: "function",
    type: "shonkha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 1,
    paramTypes: ["lekha"]
  },
  {
    name: "ongsho",
    kind: "function",
    type: "lekha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 3,
    paramTypes: ["lekha", "shonkha", "shonkha"]
  },
  {
    name: "tulona",
    kind: "function",
    type: "shonkha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 2,
    paramTypes: ["lekha", "lekha"]
  },
  {
    name: "boro",
    kind: "function",
    type: "doshomik",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 2,
    paramTypes: ["doshomik", "doshomik"]
  },
  {
    name: "chhoto",
    kind: "function",
    type: "doshomik",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 2,
    paramTypes: ["doshomik", "doshomik"]
  },
  {
    name: "porom",
    kind: "function",
    type: "doshomik",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 1,
    paramTypes: ["doshomik"]
  },
  {
    name: "ulto",
    kind: "function",
    type: "lekha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 1,
    paramTypes: ["lekha"]
  },
  {
    name: "vagshesh",
    kind: "function",
    type: "shonkha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 2,
    paramTypes: ["shonkha", "shonkha"]
  },
  {
    name: "gol",
    kind: "function",
    type: "shonkha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 1,
    paramTypes: ["doshomik"]
  },
  {
    name: "shonkhakor",
    kind: "function",
    type: "shonkha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 1,
    paramTypes: ["lekha"]
  },
  {
    name: "lekhakor",
    kind: "function",
    type: "lekha",
    scope: 0,
    line: 0,
    arraySize: -1,
    active: true,
    builtin: true,
    paramCount: 1,
    paramTypes: ["doshomik"]
  }
];

const DOUBLE_CHAR_TOKENS: Record<string, string> = {
  "<=": "LE",
  ">=": "GE",
  "==": "EQ",
  "!=": "NE"
};

const SINGLE_CHAR_TOKENS: Record<string, string> = {
  "+": "PLUS",
  "-": "MINUS",
  "*": "MUL",
  "/": "DIV",
  "=": "ASSIGN",
  "<": "LT",
  ">": "GT",
  "(": "LPAREN",
  ")": "RPAREN",
  "{": "LBRACE",
  "}": "RBRACE",
  "[": "LBRACKET",
  "]": "RBRACKET",
  ";": "SEMICOLON",
  ",": "COMMA"
};

type ExpressionToken =
  | { type: "number"; value: string }
  | { type: "string"; value: string }
  | { type: "identifier"; value: string }
  | { type: "boolean"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "bracket"; value: "[" | "]" }
  | { type: "comma"; value: "," }
  | { type: "eof"; value: "" };

function createNode(
  type: string,
  text: string | null,
  line: number,
  valueType: DiamondValueType = "unknown",
  arraySize = -1
): DiamondAstNode {
  return {
    type,
    text,
    line,
    valueType,
    arraySize,
    children: []
  };
}

function pushError(errors: DiamondError[], type: string, line: number, message: string) {
  errors.push({ type, line, message });
}

function deactivateScope(symbols: DiamondSymbol[], scope: number) {
  for (const symbol of symbols) {
    if (symbol.scope === scope) {
      symbol.active = false;
    }
  }
}

function findActiveSymbol(symbols: DiamondSymbol[], name: string) {
  for (let index = symbols.length - 1; index >= 0; index -= 1) {
    const symbol = symbols[index];
    if (symbol.active && symbol.name === name) {
      return symbol;
    }
  }

  return undefined;
}

function addTac(
  tac: DiamondTacInstruction[],
  op: string,
  arg1: string | null,
  arg2: string | null,
  result: string | null
) {
  tac.push({
    index: tac.length,
    op,
    arg1,
    arg2,
    result
  });
}

function tokenizeFallback(code: string) {
  const tokens: DiamondToken[] = [];
  const lines = code.split(/\r?\n/);
  let insideBlockComment = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;
    let cursor = 0;

    while (cursor < line.length) {
      const remaining = line.slice(cursor);

      if (insideBlockComment) {
        const closeIndex = remaining.indexOf("*/");
        if (closeIndex === -1) {
          cursor = line.length;
          continue;
        }

        cursor += closeIndex + 2;
        insideBlockComment = false;
        continue;
      }

      if (/^\s+/.test(remaining)) {
        cursor += remaining.match(/^\s+/)?.[0].length ?? 0;
        continue;
      }

      if (remaining.startsWith("#include")) {
        break;
      }

      if (remaining.startsWith("//")) {
        break;
      }

      if (remaining.startsWith("/*")) {
        insideBlockComment = true;
        cursor += 2;
        continue;
      }

      const stringMatch = remaining.match(/^"([^"\\]|\\.)*"/);
      if (stringMatch) {
        tokens.push({ type: "STRING", lexeme: stringMatch[0], line: lineNumber });
        cursor += stringMatch[0].length;
        continue;
      }

      const floatMatch = remaining.match(/^\d+\.\d+/);
      if (floatMatch) {
        tokens.push({ type: "NUMBER_FLOAT", lexeme: floatMatch[0], line: lineNumber });
        cursor += floatMatch[0].length;
        continue;
      }

      const intMatch = remaining.match(/^\d+/);
      if (intMatch) {
        tokens.push({ type: "NUMBER_INT", lexeme: intMatch[0], line: lineNumber });
        cursor += intMatch[0].length;
        continue;
      }

      const identifierMatch = remaining.match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (identifierMatch) {
        const lexeme = identifierMatch[0];
        tokens.push({
          type: KEYWORD_TOKENS[lexeme] ?? "ID",
          lexeme,
          line: lineNumber
        });
        cursor += lexeme.length;
        continue;
      }

      const twoChar = remaining.slice(0, 2);
      if (DOUBLE_CHAR_TOKENS[twoChar]) {
        tokens.push({ type: DOUBLE_CHAR_TOKENS[twoChar], lexeme: twoChar, line: lineNumber });
        cursor += 2;
        continue;
      }

      const oneChar = remaining[0];
      if (SINGLE_CHAR_TOKENS[oneChar]) {
        tokens.push({ type: SINGLE_CHAR_TOKENS[oneChar], lexeme: oneChar, line: lineNumber });
        cursor += 1;
        continue;
      }

      tokens.push({ type: "UNKNOWN", lexeme: oneChar, line: lineNumber });
      cursor += 1;
    }
  }

  return tokens;
}

function extractIdentifiers(expression: string) {
  const ids = expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];

  return ids.filter(
    (id) =>
      ![
        "shuru",
        "shesh",
        "dhoro",
        "shonkha",
        "doshomik",
        "lekha",
        "shotto",
        "khali",
        "auto",
        "mithya",
        "jodi",
        "naile",
        "jotokhon",
        "ghurao",
        "kaj",
        "ferot",
        "dekhao",
        "nao",
        "ebong",
        "ba",
        "na",
        "amdani",
        "gothon"
      ].includes(id)
  );
}

function splitArguments(raw: string) {
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function inferExpressionTypeFallback(expression: string, symbols: DiamondSymbol[]): DiamondValueType {
  const trimmed = expression.trim();
  const arrayMatch = ARRAY_RE.exec(trimmed);
  const callMatch = CALL_RE.exec(trimmed);

  if (/^".*"$/.test(trimmed)) {
    return "lekha";
  }

  if (/^\d+\.\d+$/.test(trimmed)) {
    return "doshomik";
  }

  if (/^\d+$/.test(trimmed)) {
    return "shonkha";
  }

  if (/^(shotto|mithya)$/.test(trimmed)) {
    return "shotto";
  }

  if (/[<>]=?|==|!=|\bebong\b|\bba\b|\bna\b/.test(trimmed)) {
    return "shotto";
  }

  if (arrayMatch) {
    return findActiveSymbol(symbols, arrayMatch[1])?.type ?? "unknown";
  }

  if (callMatch) {
    return findActiveSymbol(symbols, callMatch[1])?.type ?? "shonkha";
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return findActiveSymbol(symbols, trimmed)?.type ?? "unknown";
  }

  if (/[+\-*/]/.test(trimmed)) {
    const identifiers = extractIdentifiers(trimmed);
    const operandTypes = identifiers
      .map((identifier) => findActiveSymbol(symbols, identifier)?.type ?? "unknown")
      .filter((type) => type !== "unknown");

    if (operandTypes.includes("doshomik")) {
      return "doshomik";
    }

    if (operandTypes.includes("lekha")) {
      return "lekha";
    }

    return "shonkha";
  }

  return "unknown";
}

function isCompatibleType(target: DiamondValueType, value: DiamondValueType) {
  if (target === "unknown" || value === "unknown") {
    return true;
  }

  if (target === value) {
    return true;
  }

  return target === "doshomik" && value === "shonkha";
}

function resolveExpressionType(node: DiamondAstNode | null, symbols: DiamondSymbol[]): DiamondValueType {
  if (!node) {
    return "unknown";
  }

  switch (node.type) {
    case "INT_LITERAL":
      return "shonkha";
    case "FLOAT_LITERAL":
      return "doshomik";
    case "STRING_LITERAL":
      return "lekha";
    case "BOOL_LITERAL":
      return "shotto";
    case "IDENTIFIER":
      return findActiveSymbol(symbols, node.text ?? "")?.type ?? node.valueType ?? "unknown";
    case "ARRAY_REF":
      return findActiveSymbol(symbols, node.text ?? "")?.type ?? node.valueType ?? "unknown";
    case "FUNCTION_CALL":
      return findActiveSymbol(symbols, node.text ?? "")?.type ?? node.valueType ?? "shonkha";
    case "UNARY_OP": {
      const childType = resolveExpressionType(node.children[0] ?? null, symbols);

      if (node.text === "na") {
        return "shotto";
      }

      if (node.text === "-") {
        if (childType === "doshomik") {
          return "doshomik";
        }

        return childType === "unknown" ? "unknown" : "shonkha";
      }

      return childType;
    }
    case "BINARY_OP": {
      const leftType = resolveExpressionType(node.children[0] ?? null, symbols);
      const rightType = resolveExpressionType(node.children[1] ?? null, symbols);

      if (["<", ">", "<=", ">=", "==", "!=", "ebong", "ba"].includes(node.text ?? "")) {
        return "shotto";
      }

      if (node.text === "+") {
        if (leftType === "lekha" || rightType === "lekha") {
          return "lekha";
        }

        if (leftType === "doshomik" || rightType === "doshomik") {
          return "doshomik";
        }

        if (leftType === "shonkha" || rightType === "shonkha") {
          return "shonkha";
        }
      }

      if (["-", "*", "/"].includes(node.text ?? "")) {
        if (leftType === "doshomik" || rightType === "doshomik") {
          return "doshomik";
        }

        if (leftType === "shonkha" || rightType === "shonkha") {
          return "shonkha";
        }
      }

      return leftType !== "unknown" ? leftType : rightType;
    }
    case "EXPRESSION":
      return inferExpressionTypeFallback(node.text ?? "", symbols);
    default:
      return node.valueType ?? "unknown";
  }
}

function annotateExpressionTypes(node: DiamondAstNode | null, symbols: DiamondSymbol[]) {
  if (!node) {
    return;
  }

  node.children.forEach((child) => annotateExpressionTypes(child, symbols));
  node.valueType = resolveExpressionType(node, symbols);
}

function tokenizeExpression(expression: string): ExpressionToken[] | null {
  const tokens: ExpressionToken[] = [];
  let cursor = 0;

  while (cursor < expression.length) {
    const remaining = expression.slice(cursor);

    if (/^\s+/.test(remaining)) {
      cursor += remaining.match(/^\s+/)?.[0].length ?? 0;
      continue;
    }

    const stringMatch = remaining.match(/^"([^"\\]|\\.)*"/);
    if (stringMatch) {
      tokens.push({ type: "string", value: stringMatch[0] });
      cursor += stringMatch[0].length;
      continue;
    }

    const numberMatch = remaining.match(/^(\d+\.\d+|\d+)/);
    if (numberMatch) {
      tokens.push({ type: "number", value: numberMatch[0] });
      cursor += numberMatch[0].length;
      continue;
    }

    const operatorMatch = remaining.match(/^(<=|>=|==|!=|\+|-|\*|\/|<|>)/);
    if (operatorMatch) {
      tokens.push({ type: "operator", value: operatorMatch[0] });
      cursor += operatorMatch[0].length;
      continue;
    }

    const current = remaining[0];
    if (current === "(" || current === ")") {
      tokens.push({ type: "paren", value: current });
      cursor += 1;
      continue;
    }

    if (current === "[" || current === "]") {
      tokens.push({ type: "bracket", value: current });
      cursor += 1;
      continue;
    }

    if (current === ",") {
      tokens.push({ type: "comma", value: "," });
      cursor += 1;
      continue;
    }

    const identifierMatch = remaining.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifierMatch) {
      const value = identifierMatch[0];

      if (value === "shotto" || value === "mithya") {
        tokens.push({ type: "boolean", value });
      } else if (value === "ebong" || value === "ba" || value === "na") {
        tokens.push({ type: "operator", value });
      } else {
        tokens.push({ type: "identifier", value });
      }

      cursor += value.length;
      continue;
    }

    return null;
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

function buildParsedExpressionNode(
  expression: string,
  line: number,
  symbols: DiamondSymbol[]
): DiamondAstNode | null {
  const tokenStream = tokenizeExpression(expression);
  if (!tokenStream) {
    return null;
  }

  const tokens = tokenStream;
  let current = 0;

  function peek() {
    return tokens[current] ?? tokens.at(-1)!;
  }

  function advance() {
    if (peek().type !== "eof") {
      current += 1;
    }

    return tokens[Math.max(current - 1, 0)];
  }

  function check(type: ExpressionToken["type"], values?: string[]) {
    if (peek().type !== type) {
      return false;
    }

    if (!values) {
      return true;
    }

    return values.includes(peek().value);
  }

  function match(type: ExpressionToken["type"], values?: string[]) {
    if (!check(type, values)) {
      return false;
    }

    advance();
    return true;
  }

  function consume(type: ExpressionToken["type"], values?: string[]) {
    if (!check(type, values)) {
      return null;
    }

    return advance();
  }

  function parsePrimary(): DiamondAstNode | null {
    if (match("number")) {
      const value = tokens[current - 1].value;
      return value.includes(".")
        ? createNode("FLOAT_LITERAL", value, line, "doshomik")
        : createNode("INT_LITERAL", value, line, "shonkha");
    }

    if (match("string")) {
      return createNode("STRING_LITERAL", tokens[current - 1].value, line, "lekha");
    }

    if (match("boolean")) {
      return createNode("BOOL_LITERAL", tokens[current - 1].value, line, "shotto");
    }

    if (match("paren", ["("])) {
      const node = parseOr();
      if (!consume("paren", [")"])) {
        return null;
      }
      return node;
    }

    if (match("identifier")) {
      const name = tokens[current - 1].value;
      let node = createNode(
        "IDENTIFIER",
        name,
        line,
        findActiveSymbol(symbols, name)?.type ?? "unknown"
      );

      while (true) {
        if (match("paren", ["("])) {
          const argsNode = createNode("ARGUMENT_LIST", "args", line);

          if (!check("paren", [")"])) {
            while (true) {
              const arg = parseOr();
              if (!arg) {
                return null;
              }

              argsNode.children.push(arg);

              if (!match("comma")) {
                break;
              }
            }
          }

          if (!consume("paren", [")"])) {
            return null;
          }

          const functionNode = createNode(
            "FUNCTION_CALL",
            node.text ?? name,
            line,
            findActiveSymbol(symbols, node.text ?? name)?.type ?? "shonkha"
          );
          functionNode.children.push(argsNode);
          node = functionNode;
          continue;
        }

        if (match("bracket", ["["])) {
          const indexNode = parseOr();
          if (!indexNode || !consume("bracket", ["]"])) {
            return null;
          }

          const arrayNode = createNode(
            "ARRAY_REF",
            node.text ?? name,
            line,
            findActiveSymbol(symbols, node.text ?? name)?.type ?? "unknown"
          );
          arrayNode.children.push(indexNode);
          node = arrayNode;
          continue;
        }

        break;
      }

      return node;
    }

    return null;
  }

  function parseUnary(): DiamondAstNode | null {
    if (match("operator", ["na", "-"])) {
      const operator = tokens[current - 1].value;
      const operand = parseUnary();
      if (!operand) {
        return null;
      }

      const node = createNode("UNARY_OP", operator, line);
      node.children.push(operand);
      return node;
    }

    return parsePrimary();
  }

  function parseBinary(
    next: () => DiamondAstNode | null,
    operators: string[]
  ): DiamondAstNode | null {
    let node = next();
    if (!node) {
      return null;
    }

    while (match("operator", operators)) {
      const operator = tokens[current - 1].value;
      const right = next();
      if (!right) {
        return null;
      }

      const binary = createNode("BINARY_OP", operator, line);
      binary.children.push(node, right);
      node = binary;
    }

    return node;
  }

  const parseMultiplicative = () => parseBinary(parseUnary, ["*", "/"]);
  const parseAdditive = () => parseBinary(parseMultiplicative, ["+", "-"]);
  const parseComparison = () => parseBinary(parseAdditive, ["<", ">", "<=", ">="]);
  const parseEquality = () => parseBinary(parseComparison, ["==", "!="]);
  const parseAnd = () => parseBinary(parseEquality, ["ebong"]);
  const parseOr = () => parseBinary(parseAnd, ["ba"]);

  const node = parseOr();
  if (!node || !check("eof")) {
    return null;
  }

  annotateExpressionTypes(node, symbols);
  return node;
}

function inferExpressionType(expression: string, symbols: DiamondSymbol[]): DiamondValueType {
  return (
    buildParsedExpressionNode(expression, 0, symbols)?.valueType ??
    inferExpressionTypeFallback(expression, symbols)
  );
}

function buildExpressionNode(
  expression: string,
  line: number,
  symbols: DiamondSymbol[]
): DiamondAstNode {
  const trimmed = expression.trim();

  return (
    buildParsedExpressionNode(trimmed, line, symbols) ??
    createNode("EXPRESSION", trimmed, line, inferExpressionTypeFallback(trimmed, symbols))
  );
}

function buildStatementFragmentNode(
  statement: string,
  line: number,
  symbols: DiamondSymbol[]
): DiamondAstNode {
  const trimmed = statement.trim();
  if (!trimmed) {
    return createNode("EMPTY", "empty", line);
  }

  const assignmentMatch = ASSIGNMENT_FRAGMENT_RE.exec(trimmed);
  if (assignmentMatch) {
    const [, name, rawIndex, expression] = assignmentMatch;
    const symbol = findActiveSymbol(symbols, name);
    const assignmentNode = createNode("ASSIGNMENT", "=", line);
    const valueNode = buildExpressionNode(expression, line, symbols);

    if (rawIndex) {
      const arrayNode = createNode("ARRAY_REF", name, line, symbol?.type ?? "unknown");
      arrayNode.children.push(buildExpressionNode(rawIndex, line, symbols));
      assignmentNode.children.push(arrayNode, valueNode);
      return assignmentNode;
    }

    assignmentNode.children.push(
      createNode("IDENTIFIER", name, line, symbol?.type ?? "unknown"),
      valueNode
    );
    return assignmentNode;
  }

  const expressionNode = buildExpressionNode(trimmed, line, symbols);
  return expressionNode.type === "FUNCTION_CALL" ? expressionNode : createNode("EMPTY", "empty", line);
}

export function buildFallbackResult(code: string): DiamondResult {
  const source = code.replace(/}\s*naile/g, "}\nnaile");
  const tokens = tokenizeFallback(code);
  const lines = source.split(/\r?\n/);
  const errors: DiamondError[] = [];
  const symbols: DiamondSymbol[] = BUILTIN_SYMBOLS.map((symbol) => ({
    ...symbol,
    paramTypes: symbol.paramTypes ? [...symbol.paramTypes] : undefined
  }));
  const tac: DiamondTacInstruction[] = [];
  const root = createNode("PROGRAM", "program", 1);
  const functionsNode = createNode("STATEMENT_LIST", "functions", 1);
  const mainNode = createNode("BLOCK", "main", 1);
  const containerStack: DiamondAstNode[] = [functionsNode];
  let currentScope = 0;
  let insideMain = false;

  function currentContainer() {
    return containerStack[containerStack.length - 1];
  }

  function enterBlock(node: DiamondAstNode) {
    currentScope += 1;
    containerStack.push(node);
  }

  function leaveBlock() {
    deactivateScope(symbols, currentScope);
    currentScope = Math.max(0, currentScope - 1);
    if (containerStack.length > 1) {
      containerStack.pop();
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index];
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith("//")) {
      continue;
    }

    if (trimmed === "shuru") {
      insideMain = true;
      if (functionsNode.children.length > 0) {
        root.children.push(functionsNode);
      }
      root.children.push(mainNode);
      containerStack.length = 0;
      containerStack.push(mainNode);
      continue;
    }

    if (trimmed === "shesh") {
      while (containerStack.length > 1) {
        leaveBlock();
      }
      break;
    }

    if (trimmed === "}") {
      leaveBlock();
      continue;
    }

    if (ELSE_RE.test(trimmed)) {
      const siblings = currentContainer().children;
      const previous = siblings[siblings.length - 1];
      const elseBlock = createNode("BLOCK", "block", lineNumber);

      if (previous?.type === "IF") {
        previous.children.push(elseBlock);
        enterBlock(elseBlock);
      } else {
        pushError(errors, "syntax", lineNumber, "naile must follow a jodi block");
      }
      continue;
    }

    const functionMatch = FUNCTION_RE.exec(trimmed);
    if (functionMatch) {
      const [, name, rawParams] = functionMatch;
      const paramsNode = createNode("PARAM_LIST", "params", lineNumber);
      const functionNode = createNode("FUNCTION_DECL", name, lineNumber, "shonkha");
      const blockNode = createNode("BLOCK", "block", lineNumber);
      const params = splitArguments(rawParams);

      functionNode.children.push(paramsNode, blockNode);
      currentContainer().children.push(functionNode);
      symbols.push({
        name,
        kind: "function",
        type: "shonkha",
        scope: currentScope,
        line: lineNumber,
        arraySize: -1,
        active: true
      });
      addTac(tac, "func", name, String(params.length), null);

      enterBlock(blockNode);
      for (const param of params) {
        paramsNode.children.push(createNode("IDENTIFIER", param, lineNumber, "shonkha"));
        symbols.push({
          name: param,
          kind: "parameter",
          type: "shonkha",
          scope: currentScope,
          line: lineNumber,
          arraySize: -1,
          active: true
        });
      }
      continue;
    }

    const ifMatch = IF_RE.exec(trimmed);
    if (ifMatch) {
      const condition = buildExpressionNode(ifMatch[1], lineNumber, symbols);
      const ifNode = createNode("IF", "if", lineNumber);
      const blockNode = createNode("BLOCK", "block", lineNumber);

      ifNode.children.push(condition, blockNode);
      currentContainer().children.push(ifNode);

      if (inferExpressionType(ifMatch[1], symbols) !== "shotto") {
        pushError(errors, "semantic", lineNumber, "if condition should evaluate to shotto");
      }

      enterBlock(blockNode);
      continue;
    }

    const whileMatch = WHILE_RE.exec(trimmed);
    if (whileMatch) {
      const condition = buildExpressionNode(whileMatch[1], lineNumber, symbols);
      const whileNode = createNode("WHILE", "while", lineNumber);
      const blockNode = createNode("BLOCK", "block", lineNumber);

      whileNode.children.push(condition, blockNode);
      currentContainer().children.push(whileNode);

      if (inferExpressionType(whileMatch[1], symbols) !== "shotto") {
        pushError(errors, "semantic", lineNumber, "while condition should evaluate to shotto");
      }

      enterBlock(blockNode);
      continue;
    }

    const forMatch = FOR_RE.exec(trimmed);
    if (forMatch) {
      const forNode = createNode("FOR", "for", lineNumber);
      const blockNode = createNode("BLOCK", "block", lineNumber);
      const [, initClause, conditionClause, updateClause] = forMatch;

      forNode.children.push(
        buildStatementFragmentNode(initClause, lineNumber, symbols),
        conditionClause.trim()
          ? buildExpressionNode(conditionClause, lineNumber, symbols)
          : createNode("EMPTY", "empty", lineNumber),
        buildStatementFragmentNode(updateClause, lineNumber, symbols),
        blockNode
      );
      currentContainer().children.push(forNode);

      if (conditionClause.trim() && inferExpressionType(conditionClause, symbols) !== "shotto") {
        pushError(errors, "semantic", lineNumber, "for condition should evaluate to shotto");
      }

      enterBlock(blockNode);
      continue;
    }

    const declarationMatch = DECLARATION_RE.exec(trimmed);
    if (declarationMatch) {
      const [, type, name, rawArraySize, initializer] = declarationMatch;
      const arraySize = rawArraySize ? Number(rawArraySize) : -1;
      const declarationNode = createNode("DECLARATION", name, lineNumber, type as DiamondValueType, arraySize);

      if (symbols.some((symbol) => symbol.active && symbol.scope === currentScope && symbol.name === name)) {
        pushError(errors, "semantic", lineNumber, `redeclaration of '${name}' in the same scope`);
      } else {
        symbols.push({
          name,
          kind: arraySize >= 0 ? "array" : "variable",
          type: type as DiamondValueType,
          scope: currentScope,
          line: lineNumber,
          arraySize,
          active: true
        });
      }

      if (arraySize >= 0) {
        declarationNode.children.push(createNode("INT_LITERAL", String(arraySize), lineNumber, "shonkha"));
        addTac(tac, "decl_array", type, String(arraySize), name);
      } else {
        addTac(tac, "decl", type, null, name);
      }

      if (initializer) {
        const exprNode = buildExpressionNode(initializer, lineNumber, symbols);
        declarationNode.children.push(exprNode);
        addTac(tac, "=", initializer.trim(), null, name);

        if (!isCompatibleType(type as DiamondValueType, inferExpressionType(initializer, symbols))) {
          pushError(errors, "semantic", lineNumber, `type mismatch while initializing '${name}'`);
        }
      }

      currentContainer().children.push(declarationNode);
      continue;
    }

    const assignmentMatch = ASSIGNMENT_RE.exec(trimmed);
    if (assignmentMatch) {
      const [, name, rawIndex, expression] = assignmentMatch;
      const symbol = findActiveSymbol(symbols, name);
      const assignmentNode = createNode("ASSIGNMENT", "=", lineNumber);
      const valueNode = buildExpressionNode(expression, lineNumber, symbols);

      if (!symbol) {
        pushError(errors, "semantic", lineNumber, `undeclared identifier '${name}'`);
      } else if (!isCompatibleType(symbol.type, inferExpressionType(expression, symbols))) {
        pushError(errors, "semantic", lineNumber, "assignment type mismatch");
      }

      if (rawIndex) {
        const arrayNode = createNode("ARRAY_REF", name, lineNumber, symbol?.type ?? "unknown");
        arrayNode.children.push(buildExpressionNode(rawIndex, lineNumber, symbols));
        assignmentNode.children.push(arrayNode, valueNode);
        addTac(tac, "store_index", expression.trim(), rawIndex.trim(), name);
      } else {
        assignmentNode.children.push(createNode("IDENTIFIER", name, lineNumber, symbol?.type ?? "unknown"), valueNode);
        addTac(tac, "=", expression.trim(), null, name);
      }

      currentContainer().children.push(assignmentNode);
      continue;
    }

    const printMatch = PRINT_RE.exec(trimmed);
    if (printMatch) {
      const printNode = createNode("PRINT", "print", lineNumber);
      printNode.children.push(buildExpressionNode(printMatch[1], lineNumber, symbols));
      currentContainer().children.push(printNode);
      addTac(tac, "print", printMatch[1].trim(), null, null);
      continue;
    }

    const inputMatch = INPUT_RE.exec(trimmed);
    if (inputMatch) {
      const inputNode = createNode("INPUT", "input", lineNumber);
      inputNode.children.push(buildExpressionNode(inputMatch[1], lineNumber, symbols));
      currentContainer().children.push(inputNode);
      addTac(tac, "input", null, null, inputMatch[1].trim());
      continue;
    }

    const returnMatch = RETURN_RE.exec(trimmed);
    if (returnMatch) {
      const returnNode = createNode("RETURN", "return", lineNumber, inferExpressionType(returnMatch[1], symbols));
      returnNode.children.push(buildExpressionNode(returnMatch[1], lineNumber, symbols));
      currentContainer().children.push(returnNode);
      addTac(tac, "return", returnMatch[1].trim(), null, null);
      continue;
    }

    if (trimmed.endsWith("{")) {
      pushError(errors, "syntax", lineNumber, "unsupported block header in demo mode");
      continue;
    }

    if (!trimmed.endsWith(";")) {
      pushError(errors, "syntax", lineNumber, "missing semicolon");
    } else {
      pushError(errors, "syntax", lineNumber, "unrecognized statement in demo mode");
    }
  }

  if (!root.children.length) {
    root.children.push(mainNode);
  }

  const success = errors.length === 0;

  return {
    success,
    output: success
      ? "Demo analysis completed. Add diamond.js and diamond.wasm under /public/wasm to use the real Flex/Bison compiler in-browser."
      : `Demo analysis found ${errors.length} issue(s). Build the WASM bundle for full compiler validation.`,
    errors,
    tokens,
    ast: root,
    symbolTable: [...symbols].reverse(),
    tac,
    meta: {
      errorCount: errors.length,
      tokenCount: tokens.length,
      symbolCount: symbols.length,
      tacCount: tac.length,
      mode: "demo",
      engineStatus: insideMain
        ? "WASM bundle missing. Showing demo analysis."
        : "Source missing shuru/shesh or WASM bundle missing. Showing demo analysis."
    }
  };
}
