import type { DiamondAstNode } from "./types";

type RuntimeValue = number | string | boolean | RuntimeValue[];

type RuntimeResult = {
  lines: string[];
  error: string | null;
  inputConsumed: number;
  inputRemaining: number;
};

type RuntimeOptions = {
  stdin?: string;
};

type Scope = Record<string, RuntimeValue>;

type FunctionEntry = {
  params: string[];
  body: DiamondAstNode | null;
};

class ReturnSignal {
  constructor(readonly value: RuntimeValue) {}
}

function stripQuotes(value: string | null) {
  if (!value) {
    return "";
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}

function defaultValueForType(type: string, arraySize = -1): RuntimeValue {
  const scalar =
    type === "lekha" ? "" : type === "shotto" ? false : 0;

  if (arraySize >= 0) {
    return Array.from({ length: arraySize }, () => scalar);
  }

  return scalar;
}

function toNumber(value: RuntimeValue) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function valueToString(value: RuntimeValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(valueToString).join(", ")}]`;
  }

  if (typeof value === "boolean") {
    return value ? "shotto" : "mithya";
  }

  return String(value);
}

function callBuiltinFunction(name: string, args: RuntimeValue[]): RuntimeValue | undefined {
  switch (name) {
    case "jora":
      return `${valueToString(args[0] ?? "")}${valueToString(args[1] ?? "")}`;
    case "dairgho":
      return valueToString(args[0] ?? "").length;
    case "ongsho": {
      const text = valueToString(args[0] ?? "");
      const start = Math.max(0, Math.trunc(toNumber(args[1] ?? 0)));
      const length = Math.max(0, Math.trunc(toNumber(args[2] ?? 0)));
      return text.substring(start, start + length);
    }
    case "tulona": {
      const left = valueToString(args[0] ?? "");
      const right = valueToString(args[1] ?? "");
      return left === right ? 0 : left < right ? -1 : 1;
    }
    case "boro":
      return Math.max(toNumber(args[0] ?? 0), toNumber(args[1] ?? 0));
    case "chhoto":
      return Math.min(toNumber(args[0] ?? 0), toNumber(args[1] ?? 0));
    case "porom":
      return Math.abs(toNumber(args[0] ?? 0));
    case "ulto":
      return valueToString(args[0] ?? "").split("").reverse().join("");
    case "vagshesh":
      return Math.trunc(toNumber(args[0] ?? 0)) % Math.trunc(toNumber(args[1] ?? 1));
    case "gol":
      return Math.round(toNumber(args[0] ?? 0));
    case "shonkhakor": {
      const parsed = Number(valueToString(args[0] ?? "").trim());
      return Number.isNaN(parsed) ? 0 : Math.trunc(parsed);
    }
    case "lekhakor":
      return valueToString(args[0] ?? 0);
    default:
      return undefined;
  }
}

function createInputQueue(stdin?: string) {
  if (!stdin || stdin.length === 0) {
    return [];
  }

  return stdin.split(/\r?\n/).map((line) => line.replace(/\r/g, ""));
}

function coerceInputValue(raw: string, currentValue: RuntimeValue, label: string): RuntimeValue {
  if (Array.isArray(currentValue)) {
    throw new Error(`Runtime error: nao(${label}) cannot assign directly to an array value.`);
  }

  if (typeof currentValue === "number") {
    const parsed = Number(raw.trim());
    if (Number.isNaN(parsed)) {
      throw new Error(`Runtime error: '${raw}' is not a valid numeric input for '${label}'.`);
    }
    return parsed;
  }

  if (typeof currentValue === "boolean") {
    const normalized = raw.trim().toLowerCase();

    if (["shotto", "true", "1", "yes"].includes(normalized)) {
      return true;
    }

    if (["mithya", "false", "0", "no"].includes(normalized)) {
      return false;
    }

    throw new Error(`Runtime error: '${raw}' is not a valid boolean input for '${label}'.`);
  }

  return stripQuotes(raw);
}

function createRuntime(ast: DiamondAstNode, options?: RuntimeOptions) {
  const functions = new Map<string, FunctionEntry>();
  const scopes: Scope[] = [];
  const lines: string[] = [];
  const inputQueue = createInputQueue(options?.stdin);
  let inputCursor = 0;
  let steps = 0;
  let currentLine = 1;
  const STEP_LIMIT = 5000;

  function tick() {
    steps += 1;
    if (steps > STEP_LIMIT) {
      throw new Error("Execution stopped: step limit reached. Possible infinite loop.");
    }
  }

  function currentScope() {
    return scopes[scopes.length - 1];
  }

  function pushScope(seed?: Scope) {
    scopes.push(seed ? { ...seed } : {});
  }

  function popScope() {
    scopes.pop();
  }

  function resolveSlot(name: string) {
    for (let index = scopes.length - 1; index >= 0; index -= 1) {
      if (name in scopes[index]) {
        return scopes[index];
      }
    }

    return null;
  }

  function readIdentifier(name: string) {
    const scope = resolveSlot(name);
    if (!scope) {
      throw new Error(`Runtime error: '${name}' is not defined.`);
    }

    return scope[name];
  }

  function writeIdentifier(name: string, value: RuntimeValue) {
    const scope = resolveSlot(name);
    if (!scope) {
      throw new Error(`Runtime error: cannot assign to undeclared identifier '${name}'.`);
    }

    scope[name] = value;
  }

  function readNextInput(currentValue: RuntimeValue, label: string) {
    if (inputCursor >= inputQueue.length) {
      throw new Error(
        `Runtime error: nao(${label}) requested more input, but no value was provided in Program Input.`
      );
    }

    const raw = inputQueue[inputCursor];
    inputCursor += 1;
    return coerceInputValue(raw, currentValue, label);
  }

  function evaluateExpression(node: DiamondAstNode | null): RuntimeValue {
    tick();

    if (!node) {
      return 0;
    }

    switch (node.type) {
      case "INT_LITERAL":
      case "FLOAT_LITERAL":
        return Number(node.text ?? 0);

      case "STRING_LITERAL":
        return stripQuotes(node.text);

      case "BOOL_LITERAL":
        return node.text === "shotto";

      case "IDENTIFIER":
        return readIdentifier(node.text ?? "");

      case "ARRAY_REF": {
        const target = readIdentifier(node.text ?? "");
        const index = toNumber(evaluateExpression(node.children[0] ?? null));

        if (!Array.isArray(target)) {
          throw new Error(`Runtime error: '${node.text}' is not an array.`);
        }

        return target[index] ?? 0;
      }

      case "UNARY_OP": {
        const value = evaluateExpression(node.children[0] ?? null);

        if (node.text === "-") {
          return -toNumber(value);
        }

        if (node.text === "na") {
          return !Boolean(value);
        }

        return value;
      }

      case "BINARY_OP": {
        const left = evaluateExpression(node.children[0] ?? null);
        const right = evaluateExpression(node.children[1] ?? null);

        switch (node.text) {
          case "+":
            if (typeof left === "string" || typeof right === "string") {
              return `${valueToString(left)}${valueToString(right)}`;
            }
            return toNumber(left) + toNumber(right);
          case "-":
            return toNumber(left) - toNumber(right);
          case "*":
            return toNumber(left) * toNumber(right);
          case "/":
            return toNumber(left) / toNumber(right);
          case "<":
            return toNumber(left) < toNumber(right);
          case ">":
            return toNumber(left) > toNumber(right);
          case "<=":
            return toNumber(left) <= toNumber(right);
          case ">=":
            return toNumber(left) >= toNumber(right);
          case "==":
            return valueToString(left) === valueToString(right);
          case "!=":
            return valueToString(left) !== valueToString(right);
          case "ebong":
            return Boolean(left) && Boolean(right);
          case "ba":
            return Boolean(left) || Boolean(right);
          default:
            return 0;
        }
      }

      case "FUNCTION_CALL":
        return callFunction(node);

      case "EXPRESSION":
        return node.text ?? "";

      default:
        return 0;
    }
  }

  function callFunction(node: DiamondAstNode) {
    const name = node.text ?? "";
    const entry = functions.get(name);
    const argList = node.children[0]?.children ?? [];
    const evaluatedArgs = argList.map((arg) => evaluateExpression(arg ?? null));
    const builtinResult = callBuiltinFunction(name, evaluatedArgs);

    if (builtinResult !== undefined) {
      return builtinResult;
    }

    if (!entry) {
      throw new Error(`Runtime error: function '${name}' is not declared.`);
    }

    const seed: Scope = {};
    entry.params.forEach((param, index) => {
      seed[param] = evaluatedArgs[index];
    });

    pushScope(seed);
    try {
      executeNode(entry.body);
    } catch (signal) {
      popScope();
      if (signal instanceof ReturnSignal) {
        return signal.value;
      }
      throw signal;
    }
    popScope();
    return 0;
  }

  function executeBlockLike(node: DiamondAstNode | null, createScope: boolean) {
    if (!node) {
      return;
    }

    if (createScope) {
      pushScope();
    }

    try {
      for (const child of node.children) {
        executeNode(child);
      }
    } finally {
      if (createScope) {
        popScope();
      }
    }
  }

  function executeNode(node: DiamondAstNode | null) {
    tick();

    if (!node) {
      return;
    }

    const previousLine = currentLine;
    if (node.line) {
      currentLine = node.line;
    }

    try {
      executeNodeInner(node);
    } catch (e) {
      if (e instanceof ReturnSignal) {
        throw e;
      }
      if (e instanceof Error && !e.message.startsWith("[Line")) {
        throw new Error(`[Line ${node.line || currentLine}] ${e.message}`);
      }
      throw e;
    } finally {
      currentLine = previousLine;
    }
  }

  function executeNodeInner(node: DiamondAstNode) {

    switch (node.type) {
      case "PROGRAM": {
        const children = [...node.children];
        let mainBlock: DiamondAstNode | null = null;

        for (const child of children) {
          if (child.type === "STATEMENT_LIST" && child.text === "functions") {
            for (const fn of child.children) {
              const params = fn.children[0]?.children.map((param) => param.text ?? "") ?? [];
              functions.set(fn.text ?? "", {
                params,
                body: fn.children[1] ?? null
              });
            }
          } else if (child.type === "BLOCK" && child.text === "main") {
            mainBlock = child;
          } else if (child.type === "FUNCTION_DECL") {
            const params = child.children[0]?.children.map((param) => param.text ?? "") ?? [];
            functions.set(child.text ?? "", {
              params,
              body: child.children[1] ?? null
            });
          }
        }

        pushScope();
        executeNode(mainBlock);
        popScope();
        return;
      }

      case "BLOCK":
        executeBlockLike(
          node.children[0]?.type === "STATEMENT_LIST" ? node.children[0] : node,
          node.text !== "main"
        );
        return;

      case "STATEMENT_LIST":
        executeBlockLike(node, false);
        return;

      case "DECLARATION": {
        const name = node.text ?? "";
        let value = defaultValueForType(node.valueType, node.arraySize);

        if (node.arraySize < 0 && node.children.length > 0) {
          value = evaluateExpression(node.children[node.children.length - 1]);
        }

        currentScope()[name] = value;
        return;
      }

      case "ASSIGNMENT": {
        const target = node.children[0];
        const value = evaluateExpression(node.children[1] ?? null);

        if (!target) {
          return;
        }

        if (target.type === "IDENTIFIER") {
          writeIdentifier(target.text ?? "", value);
          return;
        }

        if (target.type === "ARRAY_REF") {
          const arrayValue = readIdentifier(target.text ?? "");
          const index = toNumber(evaluateExpression(target.children[0] ?? null));

          if (!Array.isArray(arrayValue)) {
            throw new Error(`Runtime error: '${target.text}' is not an array.`);
          }

          arrayValue[index] = value;
          return;
        }

        return;
      }

      case "PRINT":
        lines.push(valueToString(evaluateExpression(node.children[0] ?? null)));
        return;

      case "INPUT":
        if (!node.children[0]) {
          throw new Error("Runtime error: malformed input statement.");
        }

        if (node.children[0].type === "IDENTIFIER") {
          const name = node.children[0].text ?? "";
          const currentValue = readIdentifier(name);
          const nextValue = readNextInput(currentValue, name);
          writeIdentifier(name, nextValue);
          return;
        }

        if (node.children[0].type === "ARRAY_REF") {
          const name = node.children[0].text ?? "";
          const arrayValue = readIdentifier(name);
          const index = toNumber(evaluateExpression(node.children[0].children[0] ?? null));

          if (!Array.isArray(arrayValue)) {
            throw new Error(`Runtime error: '${name}' is not an array.`);
          }

          const currentValue = arrayValue[index] ?? 0;
          arrayValue[index] = readNextInput(currentValue, `${name}[${index}]`);
          return;
        }

        throw new Error("Runtime error: nao() expects an identifier or array element.");

      case "IF":
        if (Boolean(evaluateExpression(node.children[0] ?? null))) {
          executeNode(node.children[1] ?? null);
        } else {
          executeNode(node.children[2] ?? null);
        }
        return;

      case "WHILE":
        while (Boolean(evaluateExpression(node.children[0] ?? null))) {
          executeNode(node.children[1] ?? null);
        }
        return;

      case "FOR":
        executeNode(node.children[0] ?? null);
        while (node.children[1]?.type === "EMPTY" || Boolean(evaluateExpression(node.children[1] ?? null))) {
          executeNode(node.children[3] ?? null);
          executeNode(node.children[2] ?? null);
        }
        return;

      case "RETURN":
        throw new ReturnSignal(evaluateExpression(node.children[0] ?? null));

      case "FUNCTION_DECL":
      case "EMPTY":
        return;

      case "FUNCTION_CALL":
        callFunction(node);
        return;

      default:
        return;
    }
  }

  return {
    run() {
      try {
        executeNode(ast);
        return {
          lines,
          error: null,
          inputConsumed: inputCursor,
          inputRemaining: Math.max(inputQueue.length - inputCursor, 0)
        };
      } catch (error) {
        return {
          lines,
          error: error instanceof Error ? error.message : "Unknown runtime error",
          inputConsumed: inputCursor,
          inputRemaining: Math.max(inputQueue.length - inputCursor, 0)
        };
      }
    }
  };
}

export function runDiamondProgram(ast: DiamondAstNode | null, options?: RuntimeOptions): RuntimeResult {
  if (!ast) {
    return {
      lines: [],
      error: "No AST available for execution.",
      inputConsumed: 0,
      inputRemaining: 0
    };
  }

  return createRuntime(ast, options).run();
}
