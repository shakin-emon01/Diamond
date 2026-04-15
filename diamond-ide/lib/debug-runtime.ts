import type { DiamondAstNode } from "./types";

/* ──────────────────── Public Types ──────────────────── */

export type MemoryEntry = {
    name: string;
    value: string;
    type: string;
    scope: string;
    changed: boolean;
};

export type CallStackFrame = {
    name: string;
    line: number;
};

export type DebugSnapshot = {
    stepIndex: number;
    line: number;
    astNodeType: string;
    astNodeText: string | null;
    action: string;
    memory: MemoryEntry[];
    callStack: CallStackFrame[];
    consoleLines: string[];
};

/* ──────────────────── Internal Types ──────────────────── */

type RuntimeValue = number | string | boolean | RuntimeValue[];
type Scope = Record<string, RuntimeValue>;
type FunctionEntry = { params: string[]; body: DiamondAstNode | null };

class ReturnSignal {
    constructor(readonly value: RuntimeValue) { }
}

/* ──────────────────── Helpers ──────────────────── */

function stripQuotes(value: string | null) {
    if (!value) return "";
    if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
    return value;
}

function defaultValueForType(type: string, arraySize = -1): RuntimeValue {
    const scalar = type === "lekha" ? "" : type === "shotto" ? false : 0;
    if (arraySize >= 0) return Array.from({ length: arraySize }, () => scalar);
    return scalar;
}

function toNumber(v: RuntimeValue) {
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    const p = Number(v);
    return Number.isNaN(p) ? 0 : p;
}

function valueToString(v: RuntimeValue): string {
    if (Array.isArray(v)) return `[${v.map(valueToString).join(", ")}]`;
    if (typeof v === "boolean") return v ? "shotto" : "mithya";
    return String(v);
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

function typeLabel(v: RuntimeValue): string {
    if (Array.isArray(v)) return "array";
    if (typeof v === "number") return Number.isInteger(v) ? "shonkha" : "doshomik";
    if (typeof v === "boolean") return "shotto";
    return "lekha";
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
        const n = raw.trim().toLowerCase();
        if (["shotto", "true", "1", "yes"].includes(n)) return true;
        if (["mithya", "false", "0", "no"].includes(n)) return false;
        throw new Error(`Runtime error: '${raw}' is not a valid boolean input for '${label}'.`);
    }
    return stripQuotes(raw);
}

/* ──────────────────── Debug Runtime ──────────────────── */

export function debugExecute(
    ast: DiamondAstNode | null,
    stdin?: string
): { snapshots: DebugSnapshot[]; error: string | null } {
    if (!ast) {
        return { snapshots: [], error: "No AST available for debugging." };
    }

    const functions = new Map<string, FunctionEntry>();
    const scopes: Scope[] = [];
    const callStack: CallStackFrame[] = [{ name: "main", line: 1 }];
    const snapshots: DebugSnapshot[] = [];
    const consoleLines: string[] = [];

    const inputQueue = stdin ? stdin.split(/\r?\n/).map((l) => l.replace(/\r/g, "")) : [];
    let inputCursor = 0;
    let steps = 0;
    const STEP_LIMIT = 5000;
    let prevMemoryKeys = new Set<string>();

    function tick() {
        steps += 1;
        if (steps > STEP_LIMIT) throw new Error("Execution stopped: step limit reached.");
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
        for (let i = scopes.length - 1; i >= 0; i--) {
            if (name in scopes[i]) return scopes[i];
        }
        return null;
    }

    function readId(name: string) {
        const s = resolveSlot(name);
        if (!s) throw new Error(`Runtime error: '${name}' is not defined.`);
        return s[name];
    }

    function writeId(name: string, value: RuntimeValue) {
        const s = resolveSlot(name);
        if (!s) throw new Error(`Runtime error: cannot assign to undeclared identifier '${name}'.`);
        s[name] = value;
    }

    function readNextInput(currentValue: RuntimeValue, label: string) {
        if (inputCursor >= inputQueue.length) {
            throw new Error(`Runtime error: nao(${label}) requested more input, but none provided.`);
        }
        const raw = inputQueue[inputCursor];
        inputCursor += 1;
        return coerceInputValue(raw, currentValue, label);
    }

    /* ──── Snapshot builder ──── */

    function captureMemory(): MemoryEntry[] {
        const entries: MemoryEntry[] = [];
        const currentKeys = new Set<string>();

        scopes.forEach((scope, depth) => {
            const scopeLabel = depth === 0 ? "global" : callStack[callStack.length - 1]?.name ?? `scope-${depth}`;
            for (const [name, val] of Object.entries(scope)) {
                const key = `${scopeLabel}::${name}`;
                currentKeys.add(key);
                entries.push({
                    name,
                    value: valueToString(val),
                    type: typeLabel(val),
                    scope: scopeLabel,
                    changed: !prevMemoryKeys.has(key)
                });
            }
        });

        return entries;
    }

    function snap(line: number, nodeType: string, nodeText: string | null, action: string) {
        const mem = captureMemory();
        const currentKeys = new Set(mem.map((m) => `${m.scope}::${m.name}`));

        // Mark changed entries by comparing with previous snapshot
        if (snapshots.length > 0) {
            const prevSnap = snapshots[snapshots.length - 1];
            const prevMap = new Map(prevSnap.memory.map((m) => [`${m.scope}::${m.name}`, m.value]));

            for (const entry of mem) {
                const key = `${entry.scope}::${entry.name}`;
                const prevVal = prevMap.get(key);
                entry.changed = prevVal === undefined || prevVal !== entry.value;
            }
        } else {
            for (const entry of mem) {
                entry.changed = true;
            }
        }

        prevMemoryKeys = currentKeys;

        snapshots.push({
            stepIndex: snapshots.length,
            line,
            astNodeType: nodeType,
            astNodeText: nodeText,
            action,
            memory: mem,
            callStack: [...callStack],
            consoleLines: [...consoleLines]
        });
    }

    /* ──── Expression evaluation ──── */

    function evalExpr(node: DiamondAstNode | null): RuntimeValue {
        tick();
        if (!node) return 0;

        switch (node.type) {
            case "INT_LITERAL":
            case "FLOAT_LITERAL":
                return Number(node.text ?? 0);
            case "STRING_LITERAL":
                return stripQuotes(node.text);
            case "BOOL_LITERAL":
                return node.text === "shotto";
            case "IDENTIFIER":
                return readId(node.text ?? "");
            case "ARRAY_REF": {
                const target = readId(node.text ?? "");
                const idx = toNumber(evalExpr(node.children[0] ?? null));
                if (!Array.isArray(target)) throw new Error(`Runtime error: '${node.text}' is not an array.`);
                return target[idx] ?? 0;
            }
            case "UNARY_OP": {
                const v = evalExpr(node.children[0] ?? null);
                if (node.text === "-") return -toNumber(v);
                if (node.text === "na") return !Boolean(v);
                return v;
            }
            case "BINARY_OP": {
                const L = evalExpr(node.children[0] ?? null);
                const R = evalExpr(node.children[1] ?? null);
                switch (node.text) {
                    case "+":
                        return typeof L === "string" || typeof R === "string"
                            ? `${valueToString(L)}${valueToString(R)}`
                            : toNumber(L) + toNumber(R);
                    case "-": return toNumber(L) - toNumber(R);
                    case "*": return toNumber(L) * toNumber(R);
                    case "/": return toNumber(L) / toNumber(R);
                    case "<": return toNumber(L) < toNumber(R);
                    case ">": return toNumber(L) > toNumber(R);
                    case "<=": return toNumber(L) <= toNumber(R);
                    case ">=": return toNumber(L) >= toNumber(R);
                    case "==": return valueToString(L) === valueToString(R);
                    case "!=": return valueToString(L) !== valueToString(R);
                    case "ebong": return Boolean(L) && Boolean(R);
                    case "ba": return Boolean(L) || Boolean(R);
                    default: return 0;
                }
            }
            case "FUNCTION_CALL":
                return callFn(node);
            case "EXPRESSION":
                return node.text ?? "";
            default:
                return 0;
        }
    }

    /* ──── Function calls ──── */

    function callFn(node: DiamondAstNode) {
        const name = node.text ?? "";
        const entry = functions.get(name);
        const argList = node.children[0]?.children ?? [];
        const evaluatedArgs = argList.map((arg) => evalExpr(arg ?? null));
        const builtinResult = callBuiltinFunction(name, evaluatedArgs);

        if (builtinResult !== undefined) {
            snap(node.line, "FUNCTION_CALL", name, `Builtin ${name}() returned ${valueToString(builtinResult)}`);
            return builtinResult;
        }

        if (!entry) throw new Error(`Runtime error: function '${name}' is not declared.`);

        const seed: Scope = {};
        entry.params.forEach((param, i) => {
            seed[param] = evaluatedArgs[i];
        });

        callStack.push({ name, line: node.line });
        snap(node.line, "FUNCTION_CALL", name, `Calling function ${name}()`);

        pushScope(seed);
        try {
            execNode(entry.body);
        } catch (signal) {
            popScope();
            callStack.pop();
            if (signal instanceof ReturnSignal) {
                snap(node.line, "RETURN", name, `Function ${name}() returned ${valueToString(signal.value)}`);
                return signal.value;
            }
            throw signal;
        }
        popScope();
        callStack.pop();
        return 0;
    }

    /* ──── Statement execution ──── */

    function execBlock(node: DiamondAstNode | null, createScope: boolean) {
        if (!node) return;
        if (createScope) pushScope();
        try {
            for (const child of node.children) execNode(child);
        } finally {
            if (createScope) popScope();
        }
    }

    function execNode(node: DiamondAstNode | null) {
        tick();
        if (!node) return;

        switch (node.type) {
            case "PROGRAM": {
                const children = [...node.children];
                let mainBlock: DiamondAstNode | null = null;

                for (const child of children) {
                    if (child.type === "STATEMENT_LIST" && child.text === "functions") {
                        for (const fn of child.children) {
                            const params = fn.children[0]?.children.map((p) => p.text ?? "") ?? [];
                            functions.set(fn.text ?? "", { params, body: fn.children[1] ?? null });
                        }
                    } else if (child.type === "BLOCK" && child.text === "main") {
                        mainBlock = child;
                    } else if (child.type === "FUNCTION_DECL") {
                        const params = child.children[0]?.children.map((p) => p.text ?? "") ?? [];
                        functions.set(child.text ?? "", { params, body: child.children[1] ?? null });
                    }
                }

                pushScope();
                snap(node.line || 1, "PROGRAM", "shuru", "Program started");
                execNode(mainBlock);
                snap(node.line || 1, "PROGRAM", "shesh", "Program finished");
                popScope();
                return;
            }

            case "BLOCK":
                execBlock(node.children[0]?.type === "STATEMENT_LIST" ? node.children[0] : node, node.text !== "main");
                return;

            case "STATEMENT_LIST":
                execBlock(node, false);
                return;

            case "DECLARATION": {
                const name = node.text ?? "";
                let value = defaultValueForType(node.valueType, node.arraySize);
                if (node.arraySize < 0 && node.children.length > 0) {
                    value = evalExpr(node.children[node.children.length - 1]);
                }
                currentScope()[name] = value;
                snap(node.line, "DECLARATION", name, `Declared ${name} = ${valueToString(value)}`);
                return;
            }

            case "ASSIGNMENT": {
                const target = node.children[0];
                const value = evalExpr(node.children[1] ?? null);
                if (!target) return;

                if (target.type === "IDENTIFIER") {
                    writeId(target.text ?? "", value);
                    snap(node.line, "ASSIGNMENT", target.text, `${target.text} = ${valueToString(value)}`);
                    return;
                }

                if (target.type === "ARRAY_REF") {
                    const arr = readId(target.text ?? "");
                    const idx = toNumber(evalExpr(target.children[0] ?? null));
                    if (!Array.isArray(arr)) throw new Error(`Runtime error: '${target.text}' is not an array.`);
                    arr[idx] = value;
                    snap(node.line, "ASSIGNMENT", `${target.text}[${idx}]`, `${target.text}[${idx}] = ${valueToString(value)}`);
                    return;
                }
                return;
            }

            case "PRINT": {
                const val = evalExpr(node.children[0] ?? null);
                consoleLines.push(valueToString(val));
                snap(node.line, "PRINT", null, `Output: ${valueToString(val)}`);
                return;
            }

            case "INPUT": {
                if (!node.children[0]) throw new Error("Runtime error: malformed input statement.");
                if (node.children[0].type === "IDENTIFIER") {
                    const name = node.children[0].text ?? "";
                    const cur = readId(name);
                    const next = readNextInput(cur, name);
                    writeId(name, next);
                    snap(node.line, "INPUT", name, `Read input: ${name} = ${valueToString(next)}`);
                    return;
                }
                if (node.children[0].type === "ARRAY_REF") {
                    const name = node.children[0].text ?? "";
                    const arr = readId(name);
                    const idx = toNumber(evalExpr(node.children[0].children[0] ?? null));
                    if (!Array.isArray(arr)) throw new Error(`Runtime error: '${name}' is not an array.`);
                    const cur = arr[idx] ?? 0;
                    arr[idx] = readNextInput(cur, `${name}[${idx}]`);
                    snap(node.line, "INPUT", `${name}[${idx}]`, `Read input: ${name}[${idx}] = ${valueToString(arr[idx])}`);
                    return;
                }
                throw new Error("Runtime error: nao() expects an identifier or array element.");
            }

            case "IF": {
                const cond = Boolean(evalExpr(node.children[0] ?? null));
                snap(node.line, "IF", null, `Condition: ${cond ? "shotto (true)" : "mithya (false)"}`);
                if (cond) {
                    execNode(node.children[1] ?? null);
                } else {
                    execNode(node.children[2] ?? null);
                }
                return;
            }

            case "WHILE": {
                while (Boolean(evalExpr(node.children[0] ?? null))) {
                    snap(node.line, "WHILE", null, "Loop iteration");
                    execNode(node.children[1] ?? null);
                }
                snap(node.line, "WHILE", null, "Loop ended");
                return;
            }

            case "FOR": {
                execNode(node.children[0] ?? null);
                while (
                    node.children[1]?.type === "EMPTY" ||
                    Boolean(evalExpr(node.children[1] ?? null))
                ) {
                    snap(node.line, "FOR", null, "Loop iteration");
                    execNode(node.children[3] ?? null);
                    execNode(node.children[2] ?? null);
                }
                snap(node.line, "FOR", null, "Loop ended");
                return;
            }

            case "RETURN":
                throw new ReturnSignal(evalExpr(node.children[0] ?? null));

            case "FUNCTION_DECL":
            case "EMPTY":
                return;

            case "FUNCTION_CALL":
                callFn(node);
                return;

            default:
                return;
        }
    }

    try {
        execNode(ast);
        return { snapshots, error: null };
    } catch (err) {
        return {
            snapshots,
            error: err instanceof Error ? err.message : "Unknown runtime error"
        };
    }
}
