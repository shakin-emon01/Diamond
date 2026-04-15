export type DiamondValueType =
  | "shonkha"
  | "doshomik"
  | "lekha"
  | "shotto"
  | "khali"
  | "unknown";

export type DiamondError = {
  message: string;
  line: number | null;
  type: string;
};

export type DiamondAstNode = {
  type: string;
  text: string | null;
  line: number;
  valueType: DiamondValueType;
  arraySize: number;
  children: DiamondAstNode[];
};

export type DiamondSymbol = {
  name: string;
  kind: string;
  type: DiamondValueType;
  scope: number;
  line: number;
  arraySize: number;
  active: boolean;
  builtin?: boolean;
  paramCount?: number;
  paramTypes?: DiamondValueType[];
  memoryAddress?: number;
};

export type DiamondTacInstruction = {
  index: number;
  op: string | null;
  arg1: string | null;
  arg2: string | null;
  result: string | null;
};

export type DiamondToken = {
  type: string;
  lexeme: string | null;
  line: number;
};

export type DiamondResult = {
  success: boolean;
  output: string;
  errors: DiamondError[];
  ast: DiamondAstNode | null;
  symbolTable: DiamondSymbol[];
  rawTac?: DiamondTacInstruction[];
  tac: DiamondTacInstruction[];
  tokens: DiamondToken[];
  assembly?: string | null;
  parseTrace?: string | null;
  optimizations?: {
    constantFolds: number;
    strengthReductions: number;
    commonSubexpressions: number;
    deadCodeEliminated: number;
    unreachableRemoved: number;
  };
  meta?: {
    errorCount: number;
    symbolCount: number;
    rawTacCount?: number;
    tacCount: number;
    tokenCount?: number;
    preprocessImports?: number;
    preprocessRecordTypes?: number;
    preprocessRecordVariables?: number;
    mode?: "wasm" | "demo" | "server";
    engineStatus?: string;
  };
};
