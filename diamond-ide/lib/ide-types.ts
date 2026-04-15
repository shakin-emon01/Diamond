import type { ChallengeEvaluation } from "./challenges";
import type { DiamondResult } from "./types";

export type PanelTab =
  | "ast"
  | "flow"
  | "tokens"
  | "symbols"
  | "scopes"
  | "types"
  | "tac"
  | "errors"
  | "memory"
  | "suite";

export type DashboardTab = "analysis" | "challenges";

export type CompileReason =
  | "initial"
  | "manual"
  | "auto"
  | "template"
  | "run"
  | "challenge"
  | "suite";

export type ThemeMode = "dark" | "light";

export type PanelDefinition = {
  id: PanelTab;
  label: string;
};

export type ShortcutDefinition = {
  id: string;
  keys: string[];
  description: string;
};

export type TemplateUndoEntry = {
  code: string;
  filename: string;
  templateId: string;
  stdinText: string;
  label: string;
  savedCode: string;
};

export type ReportExportPayload = {
  code: string;
  result: DiamondResult | null;
  consoleLines: string[];
  executionStatus: string;
  runtimeError: string | null;
  stdinText: string;
  generatedAt: string;
  challengeReport: ChallengeEvaluation | null;
};

export const AUTO_COMPILE_DELAY_MS = 700;

export const PANEL_TABS: PanelDefinition[] = [
  { id: "ast", label: "AST" },
  { id: "flow", label: "Flowchart" },
  { id: "tokens", label: "Tokens" },
  { id: "symbols", label: "Symbols" },
  { id: "scopes", label: "Scopes" },
  { id: "types", label: "Type Inference" },
  { id: "tac", label: "IR / Codegen" },
  { id: "errors", label: "Diagnostics" },
  { id: "memory", label: "Memory" },
  { id: "suite", label: "Test Suite" }
];

export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "run-program",
    keys: ["Ctrl", "Enter"],
    description: "Run the current program with the latest compilation result."
  },
  {
    id: "compile-program",
    keys: ["Ctrl", "Shift", "Enter"],
    description: "Compile the current source without executing it."
  },
  {
    id: "format-source",
    keys: ["Alt", "Shift", "F"],
    description: "Format the current Diamond source."
  },
  {
    id: "open-file",
    keys: ["Ctrl", "O"],
    description: "Open a local `.diu` file into the editor."
  },
  {
    id: "download-file",
    keys: ["Ctrl", "S"],
    description: "Download the editor contents as `program.diu`."
  },
  {
    id: "export-report",
    keys: ["Ctrl", "Shift", "E"],
    description: "Download the current compilation report as HTML."
  },
  {
    id: "toggle-theme",
    keys: ["Ctrl", "J"],
    description: "Switch between the dark and light IDE themes."
  },
  {
    id: "show-shortcuts",
    keys: ["Ctrl", "/"],
    description: "Open the keyboard shortcuts reference."
  },
  {
    id: "close-modal",
    keys: ["Esc"],
    description: "Close the cheatsheet or shortcuts modal."
  }
];
