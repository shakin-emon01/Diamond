"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DIAMOND_CHALLENGES,
  evaluateDiamondChallenge,
  type ChallengeEvaluation,
  type DiamondChallenge
} from "../../../lib/challenges";
import { debugExecute, type DebugSnapshot } from "../../../lib/debug-runtime";
import { formatDiamondCode } from "../../../lib/diamond-format";
import {
  AUTO_COMPILE_DELAY_MS,
  type CompileReason,
  type DashboardTab,
  type PanelTab,
  type ReportExportPayload,
  type TemplateUndoEntry,
  type ThemeMode
} from "../../../lib/ide-types";
import { downloadTextFile, readTextFile } from "../../../lib/ide-utils";
import { printDiamondReportPdf, downloadDiamondReportHtml } from "../../../lib/report-export";
import {
  DIAMOND_TEST_SUITE,
  type DiamondSuiteCaseResult
} from "../../../lib/test-suite";
import { runDiamondProgram } from "../../../lib/diamond-runtime";
import { DEFAULT_TEMPLATE, DIAMOND_TEMPLATES } from "../../../lib/templates";
import type { DiamondResult } from "../../../lib/types";
import { compileDiamond } from "../../../lib/wasm-client";

import type { FileTab } from "../layout/file-tabs";

const CUSTOM_TEMPLATE_ID = "__custom__";
const THEME_STORAGE_KEY = "diamond-ide-theme";
const DIAMOND_FILE_EXTENSION = ".diu";
const EMPTY_PROGRAM_SOURCE = "shuru\n\n\nshesh\n";

let tabIdCounter = 1;
function nextTabId() {
  return `tab-${tabIdCounter++}`;
}

function normalizeLines(lines: string[]) {
  const normalized = lines.map((line) => line.trimEnd());

  while (normalized.length > 0 && normalized[normalized.length - 1] === "") {
    normalized.pop();
  }

  return normalized;
}

function createDiamondFilename(label: string) {
  return `${label.replace(/\s+/g, "_").toLowerCase()}${DIAMOND_FILE_EXTENSION}`;
}

function stripFilenameExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "");
}

function normalizeTabFilename(filename: string, fallback: string) {
  const sanitized = filename.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");

  if (!sanitized) {
    return fallback;
  }

  if (/\.[A-Za-z0-9]+$/.test(sanitized)) {
    return sanitized;
  }

  return `${sanitized}${DIAMOND_FILE_EXTENSION}`;
}

function makeDefaultTab(id?: string): FileTab {
  return {
    id: id ?? nextTabId(),
    filename: createDiamondFilename(DEFAULT_TEMPLATE.label),
    code: DEFAULT_TEMPLATE.code,
    savedCode: DEFAULT_TEMPLATE.code,
    result: null,
    stdinText: "",
    isDirty: false,
    sourceLabel: DEFAULT_TEMPLATE.label,
    selectedTemplate: DEFAULT_TEMPLATE.id
  };
}

export function useDiamondIde() {
  const startTab = makeDefaultTab("tab-0");

  const [openTabs, setOpenTabs] = useState<FileTab[]>([startTab]);
  const [activeTabId, setActiveTabId] = useState(startTab.id);

  const activeTab = openTabs.find((t) => t.id === activeTabId) ?? openTabs[0];

  const [code, setCodeInternal] = useState(activeTab.code);
  const [selectedTemplate, setSelectedTemplate] = useState(activeTab.selectedTemplate);
  const [sourceLabel, setSourceLabel] = useState(activeTab.sourceLabel);
  const [result, setResult] = useState<DiamondResult | null>(null);
  const [activePanel, setActivePanel] = useState<PanelTab>("ast");
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("analysis");
  const [compileBusy, setCompileBusy] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [stdinText, setStdinTextInternal] = useState("");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [executionStatus, setExecutionStatus] = useState(
    "Program has not been executed yet. Use Run to open the terminal flow."
  );
  const [lastCompileReason, setLastCompileReason] = useState<CompileReason>("initial");
  const [activeChallengeId, setActiveChallengeId] = useState(DIAMOND_CHALLENGES[0]?.id ?? "");
  const [challengeReport, setChallengeReport] = useState<ChallengeEvaluation | null>(null);
  const [showChallengeConfetti, setShowChallengeConfetti] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [templateUndoStack, setTemplateUndoStack] = useState<TemplateUndoEntry[]>([]);
  const [suiteBusy, setSuiteBusy] = useState(false);
  const [suiteResults, setSuiteResults] = useState<DiamondSuiteCaseResult[]>([]);
  const [suiteLastRunAt, setSuiteLastRunAt] = useState<string | null>(null);

  const [isDebugging, setIsDebugging] = useState(false);
  const [debugSnapshots, setDebugSnapshots] = useState<DebugSnapshot[]>([]);
  const [debugStepIndex, setDebugStepIndex] = useState(0);
  const [isDebugPlaying, setIsDebugPlaying] = useState(false);
  const [debugSpeed, setDebugSpeed] = useState(600);
  const [debugError, setDebugError] = useState<string | null>(null);

  // Cursor position tracking
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const debugDecorIdsRef = useRef<string[]>([]);
  const errorDecorIdsRef = useRef<string[]>([]);
  const activeTabIdRef = useRef(activeTabId);
  const compileSequenceRef = useRef(0);
  const lastRequestedSourceRef = useRef("");
  const lastCompiledSourceRef = useRef("");
  const lastExecutedSourceRef = useRef("");
  const lastChallengeSourceRef = useRef("");
  const lastCelebratedChallengeRunRef = useRef("");

  // --- Tab helpers ---

  function updateTabField(tabId: string, fields: Partial<FileTab>) {
    setOpenTabs((tabs) => tabs.map((tab) => (tab.id === tabId ? { ...tab, ...fields } : tab)));
  }

  function updateActiveTabField(fields: Partial<FileTab>) {
    updateTabField(activeTabId, fields);
  }

  function syncEditorState(tab: FileTab) {
    setCodeInternal(tab.code);
    setResult(tab.result);
    setStdinTextInternal(tab.stdinText);
    setSourceLabel(tab.sourceLabel);
    setSelectedTemplate(tab.selectedTemplate);
  }

  function setCode(value: string) {
    setCodeInternal(value);
    updateActiveTabField({
      code: value,
      isDirty: value !== (activeTab?.savedCode ?? value)
    });
  }

  function setStdinText(value: string) {
    setStdinTextInternal(value);
    updateActiveTabField({ stdinText: value });
  }

  function handleTabSelect(tabId: string) {
    // Save current tab state
    updateActiveTabField({
      code,
      result,
      stdinText,
      isDirty: code !== (activeTab?.savedCode ?? code)
    });

    const tab = openTabs.find((t) => t.id === tabId);
    if (!tab) return;

    setActiveTabId(tabId);
    syncEditorState(tab);

    applyEditorDiagnostics(tab.result);
  }

  function handleTabClose(tabId: string) {
    if (openTabs.length <= 1) return;
    const idx = openTabs.findIndex((t) => t.id === tabId);
    const nextTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(nextTabs);

    if (tabId === activeTabId) {
      const nextIdx = Math.min(idx, nextTabs.length - 1);
      const next = nextTabs[nextIdx];
      setActiveTabId(next.id);
      syncEditorState(next);
      applyEditorDiagnostics(next.result);
    }
  }

  function handleNewTab() {
    const tabNum = openTabs.length + 1;
    const newTab: FileTab = {
      id: nextTabId(),
      filename: `untitled_${tabNum}${DIAMOND_FILE_EXTENSION}`,
      code: EMPTY_PROGRAM_SOURCE,
      savedCode: EMPTY_PROGRAM_SOURCE,
      result: null,
      stdinText: "",
      isDirty: false,
      sourceLabel: `Untitled ${tabNum}`,
      selectedTemplate: CUSTOM_TEMPLATE_ID
    };
    // Save current before switching
    updateActiveTabField({
      code,
      result,
      stdinText,
      isDirty: code !== (activeTab?.savedCode ?? code)
    });
    setOpenTabs((tabs) => [...tabs, newTab]);
    setActiveTabId(newTab.id);
    syncEditorState(newTab);
    clearEditorDiagnostics();
  }

  function handleTabRename(tabId: string, nextName: string) {
    const tab = openTabs.find((item) => item.id === tabId);
    if (!tab) {
      return;
    }

    const filename = normalizeTabFilename(nextName, tab.filename);
    const sourceLabel = stripFilenameExtension(filename);

    updateTabField(tabId, {
      filename,
      sourceLabel
    });

    if (tabId === activeTabId) {
      setSourceLabel(sourceLabel);
    }
  }

  // --- Original IDE logic ---

  function closeModals() {
    setShowCheatsheet(false);
    setShowShortcuts(false);
  }

  function setDocumentTheme(nextTheme: ThemeMode) {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = nextTheme;
  }

  function toggleTheme() {
    setThemeMode((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";

      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }

      setDocumentTheme(nextTheme);
      return nextTheme;
    });
  }

  function toggleSidebar() {
    setSidebarCollapsed((c) => !c);
  }

  function focusEditorLine(lineNumber: number | null | undefined) {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    const safeLine = Math.min(Math.max(lineNumber ?? 1, 1), model.getLineCount());
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [
      {
        range: new monaco.Range(safeLine, 1, safeLine, model.getLineMaxColumn(safeLine)),
        options: {
          isWholeLine: true,
          className: "diamond-line-highlight",
          marginClassName: "diamond-line-highlight-margin"
        }
      }
    ]);
    editor.focus();
    editor.revealLineInCenter(safeLine);
    editor.setPosition({ lineNumber: safeLine, column: 1 });
    editor.setSelection({
      startLineNumber: safeLine,
      startColumn: 1,
      endLineNumber: safeLine,
      endColumn: model.getLineMaxColumn(safeLine)
    });
  }

  function clearEditorDiagnostics() {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, "diamond", []);
    }

    errorDecorIdsRef.current = editor.deltaDecorations(errorDecorIdsRef.current, []);
  }

  function applyEditorDiagnostics(nextResult: DiamondResult | null) {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    if (!nextResult) {
      clearEditorDiagnostics();
      return;
    }

    const markers = nextResult.errors.map((error) => ({
      startLineNumber: Math.max(error.line ?? 1, 1),
      startColumn: 1,
      endLineNumber: Math.max(error.line ?? 1, 1),
      endColumn: model.getLineMaxColumn(Math.max(error.line ?? 1, 1)),
      message: error.message,
      severity:
        error.type === "semantic" || error.type === "syntax"
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning
    }));

    monaco.editor.setModelMarkers(model, "diamond", markers);
    applyInlineErrorDecorations(nextResult);
  }

  function handleEditorMount(editor: any, monaco: any) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor position
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorLine(e.position.lineNumber);
      setCursorCol(e.position.column);
    });
  }

  function recordSourceSnapshot(label: string) {
    setTemplateUndoStack((current) => [
      {
        code,
        filename: activeTab?.filename ?? "program.diu",
        templateId: selectedTemplate,
        stdinText,
        label,
        savedCode: activeTab?.savedCode ?? code
      },
      ...current
    ]);
  }

  function confirmSourceReplace(nextLabel: string) {
    if (typeof window === "undefined") {
      return true;
    }

    const hasMeaningfulChanges =
      code.trim().length > 0 && code !== (activeTab?.savedCode ?? "");

    if (!hasMeaningfulChanges) {
      return true;
    }

    return window.confirm(
      `Replace the current editor contents with ${nextLabel}? You can undo this from the toolbar after the swap.`
    );
  }

  function resetRunState(status: string) {
    setChallengeReport(null);
    setShowChallengeConfetti(false);
    lastExecutedSourceRef.current = "";
    lastChallengeSourceRef.current = "";
    setHasExecuted(false);
    setConsoleLines([]);
    setRuntimeError(null);
    setExecutionStatus(status);
    clearEditorDiagnostics();
  }

  function downloadSource() {
    const filename = activeTab.filename || "program.diu";
    downloadTextFile(code, filename);
  }

  function handleFormatCode() {
    const formatted = formatDiamondCode(code);
    setCode(formatted);
    setExecutionStatus("Code formatted. Compile or run again to refresh the reports and terminal.");
  }

  function applyInlineErrorDecorations(nextResult: DiamondResult) {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const decorations = nextResult.errors.map((error) => {
      const line = Math.max(error.line ?? 1, 1);
      const maxCol = model.getLineMaxColumn(line);
      return {
        range: new monaco.Range(line, 1, line, maxCol),
        options: {
          className: "diamond-error-inline",
          linesDecorationsClassName: "diamond-error-line-decoration",
          glyphMarginClassName: "diamond-error-gutter",
          glyphMarginHoverMessage: {
            value: `${error.type.toUpperCase()}: ${error.message}`
          },
          hoverMessage: {
            value: `${error.type.toUpperCase()}: ${error.message}`
          },
          overviewRuler: {
            color: "rgba(248, 113, 113, 0.8)",
            position: monaco.editor.OverviewRulerLane.Right
          }
        }
      };
    });

    errorDecorIdsRef.current = editor.deltaDecorations(errorDecorIdsRef.current, decorations);
  }

  async function runCompilation(source: string, reason: CompileReason, tabId = activeTabIdRef.current) {
    const compileId = ++compileSequenceRef.current;
    lastRequestedSourceRef.current = source;
    setCompileBusy(true);
    setLastCompileReason(reason);
    try {
      const nextResult = await compileDiamond(source);
      if (compileId !== compileSequenceRef.current) return null;
      updateTabField(tabId, { result: nextResult });

      if (activeTabIdRef.current === tabId) {
        setResult(nextResult);
        lastCompiledSourceRef.current = source;
        applyEditorDiagnostics(nextResult);
      }

      return nextResult;
    } finally {
      if (compileId === compileSequenceRef.current) setCompileBusy(false);
    }
  }

  function executeCompiledProgram(compiledResult: DiamondResult, source: string) {
    setHasExecuted(true);
    if (!compiledResult.success || compiledResult.errors.length > 0) {
      setConsoleLines([]);
      setRuntimeError("Execution blocked until all syntax and semantic issues are resolved.");
      setExecutionStatus("Run blocked because the latest compilation still has errors.");
      return;
    }
    const runtime = runDiamondProgram(compiledResult.ast, { stdin: stdinText });
    const nextStatus = runtime.error
      ? `Program stopped with a runtime error. Consumed ${runtime.inputConsumed} input value(s).`
      : runtime.inputRemaining > 0
        ? `Program executed successfully. Consumed ${runtime.inputConsumed} input value(s) and left ${runtime.inputRemaining} unused.`
        : `Program executed successfully. Consumed ${runtime.inputConsumed} input value(s).`;
    setConsoleLines(runtime.lines);
    setRuntimeError(runtime.error);
    setExecutionStatus(nextStatus);
    
    if (runtime.error) {
      const match = runtime.error.match(/\[Line (\d+)\]/);
      if (match && match[1]) {
        const lineStr = match[1];
        if (lineStr) {
            focusEditorLine(parseInt(lineStr, 10));
        }
      }
    }
    
    lastExecutedSourceRef.current = source;
  }

  function evaluateActiveChallenge(compiledResult: DiamondResult, source: string) {
    if (dashboardTab !== "challenges") return;
    const challenge = DIAMOND_CHALLENGES.find((item) => item.id === activeChallengeId);
    if (!challenge) return;
    const nextReport = evaluateDiamondChallenge(challenge, compiledResult);
    setChallengeReport(nextReport);
    lastChallengeSourceRef.current = source;
    if (nextReport.passed) {
      const runId = `${challenge.id}:${source}`;
      if (lastCelebratedChallengeRunRef.current !== runId) {
        lastCelebratedChallengeRunRef.current = runId;
        setShowChallengeConfetti(true);
      }
    }
  }

  async function handleRunProgram() {
    setRunBusy(true);
    setRuntimeError(null);
    setExecutionStatus("Running the latest compiled Diamond program...");
    try {
      const needsFreshCompile = !result || lastCompiledSourceRef.current !== code;
      const compiledResult = needsFreshCompile ? await runCompilation(code, "run") : result;
      if (!compiledResult) {
        setExecutionStatus("Run was cancelled because a newer compilation request replaced it.");
        return;
      }
      executeCompiledProgram(compiledResult, code);
      evaluateActiveChallenge(compiledResult, code);
    } finally {
      setRunBusy(false);
    }
  }

  function applyTemplateSource(templateId: string, label: string, source: string, nextStdin = "") {
    setDashboardTab("analysis");
    setSelectedTemplate(templateId);
    setSourceLabel(label);
    setCodeInternal(source);
    setStdinTextInternal(nextStdin);

    // Update tab filename
    const filename = createDiamondFilename(label);
    updateActiveTabField({
      filename,
      sourceLabel: label,
      selectedTemplate: templateId,
      code: source,
      savedCode: source,
      stdinText: nextStdin,
      result: null,
      isDirty: false
    });

    resetRunState("Source updated. Compile or run it to refresh the terminal output.");
    void runCompilation(source, "template");
  }

  function handleTemplateChange(templateId: string) {
    const nextTemplate = DIAMOND_TEMPLATES.find((item) => item.id === templateId) ?? DEFAULT_TEMPLATE;
    if (!confirmSourceReplace(nextTemplate.label)) {
      return;
    }

    recordSourceSnapshot(sourceLabel);
    applyTemplateSource(nextTemplate.id, nextTemplate.label, nextTemplate.code);
  }

  function handleChallengeSelect(challengeId: string) {
    setDashboardTab("challenges");
    setActiveChallengeId(challengeId);
    setChallengeReport((current) => (current?.challengeId === challengeId ? current : null));
  }

  function handleLoadChallenge(challenge: DiamondChallenge) {
    if (!confirmSourceReplace(challenge.title)) {
      return;
    }

    recordSourceSnapshot(sourceLabel);
    setDashboardTab("challenges");
    setActiveChallengeId(challenge.id);
    setSelectedTemplate(CUSTOM_TEMPLATE_ID);
    setSourceLabel(challenge.title);
    setCodeInternal(challenge.starterCode);
    setStdinTextInternal(challenge.tests[0]?.stdin ?? "");

    updateActiveTabField({
      filename: createDiamondFilename(challenge.title),
      sourceLabel: challenge.title,
      selectedTemplate: CUSTOM_TEMPLATE_ID,
      code: challenge.starterCode,
      savedCode: challenge.starterCode,
      stdinText: challenge.tests[0]?.stdin ?? "",
      result: null,
      isDirty: false
    });

    resetRunState("Challenge starter loaded. Run the program to validate the hidden testcases.");
    void runCompilation(challenge.starterCode, "challenge");
  }

  function undoSourceReplace() {
    setTemplateUndoStack((current) => {
      const [latest, ...rest] = current;
      if (!latest) {
        return current;
      }

      setSelectedTemplate(latest.templateId);
      setSourceLabel(latest.label);
      setCodeInternal(latest.code);
      setStdinTextInternal(latest.stdinText);
      updateActiveTabField({
        filename: latest.filename,
        sourceLabel: latest.label,
        selectedTemplate: latest.templateId,
        code: latest.code,
        savedCode: latest.savedCode,
        stdinText: latest.stdinText,
        result: null,
        isDirty: latest.code !== latest.savedCode
      });
      resetRunState("Previous editor contents restored from the undo stack.");
      void runCompilation(latest.code, "template");
      return rest;
    });
  }

  function requestOpenFileDialog() {
    fileInputRef.current?.click();
  }

  async function handleOpenFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!confirmSourceReplace(file.name)) {
      fileInputRef.current && (fileInputRef.current.value = "");
      return;
    }

    recordSourceSnapshot(sourceLabel);
    const contents = await readTextFile(file);
    setDashboardTab("analysis");
    setSelectedTemplate(CUSTOM_TEMPLATE_ID);
    setSourceLabel(file.name);
    setCodeInternal(contents);
    setStdinTextInternal("");

    updateActiveTabField({
      filename: file.name,
      sourceLabel: file.name,
      selectedTemplate: CUSTOM_TEMPLATE_ID,
      code: contents,
      savedCode: contents,
      stdinText: "",
      result: null,
      isDirty: false
    });

    resetRunState(`Opened ${file.name}. Compile or run it to refresh the analysis views.`);
    await runCompilation(contents, "template");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function buildReportPayload(): ReportExportPayload {
    return {
      code,
      result,
      consoleLines,
      executionStatus,
      runtimeError,
      stdinText,
      generatedAt: new Date().toLocaleString(),
      challengeReport
    };
  }

  function exportReportHtml() {
    downloadDiamondReportHtml(buildReportPayload());
  }

  function exportReportPdf() {
    printDiamondReportPdf(buildReportPayload());
  }

  async function runEmbeddedTestSuite() {
    setSuiteBusy(true);
    setDashboardTab("analysis");
    setActivePanel("suite");

    try {
      const nextResults: DiamondSuiteCaseResult[] = [];

      for (const testCase of DIAMOND_TEST_SUITE) {
        const compiled = await compileDiamond(testCase.source);
        const errorCount = compiled.errors.length;

        if (!testCase.expectedSuccess) {
          const passed = !compiled.success || errorCount > 0;
          nextResults.push({
            caseId: testCase.id,
            title: testCase.title,
            category: testCase.category,
            passed,
            summary: passed
              ? "Diagnostics were reported as expected."
              : "This case was expected to fail but compiled successfully.",
            expectedLines: [],
            actualLines: [],
            errorCount
          });
          continue;
        }

        if (!compiled.success || errorCount > 0 || !compiled.ast) {
          nextResults.push({
            caseId: testCase.id,
            title: testCase.title,
            category: testCase.category,
            passed: false,
            summary: "Compilation failed before runtime verification could start.",
            expectedLines: testCase.expectedLines ?? [],
            actualLines: [],
            errorCount
          });
          continue;
        }

        const runtime = runDiamondProgram(compiled.ast, { stdin: testCase.stdin });
        const actualLines = normalizeLines(runtime.lines);
        const expectedLines = normalizeLines(testCase.expectedLines ?? []);
        const passed = !runtime.error && actualLines.join("\n") === expectedLines.join("\n");

        nextResults.push({
          caseId: testCase.id,
          title: testCase.title,
          category: testCase.category,
          passed,
          summary: runtime.error
            ? runtime.error
            : passed
              ? "Output matched the expected runtime snapshot."
              : `Expected ${expectedLines.join(" | ") || "[no output]"}, got ${actualLines.join(" | ") || "[no output]"}.`,
          expectedLines,
          actualLines,
          errorCount
        });
      }

      setSuiteResults(nextResults);
      setSuiteLastRunAt(new Date().toLocaleTimeString());
    } finally {
      setSuiteBusy(false);
    }
  }

  async function handleStartDebug() {
    const needsCompile = !result || lastCompiledSourceRef.current !== code;
    const compiled = needsCompile ? await runCompilation(code, "run") : result;
    if (!compiled || !compiled.ast) return;
    const { snapshots, error } = debugExecute(compiled.ast, stdinText);
    setDebugSnapshots(snapshots);
    setDebugStepIndex(0);
    setDebugError(error);
    setIsDebugging(true);
    setIsDebugPlaying(false);
    setDashboardTab("analysis");
    setActivePanel("memory");
  }

  function handleDebugStepForward() {
    setDebugStepIndex((index) => Math.min(index + 1, debugSnapshots.length - 1));
  }

  function handleDebugStepBack() {
    setDebugStepIndex((index) => Math.max(index - 1, 0));
  }

  function handleDebugPlayPause() {
    setIsDebugPlaying((playing) => !playing);
  }

  function handleDebugReset() {
    setDebugStepIndex(0);
    setIsDebugPlaying(false);
  }

  function handleDebugStop() {
    setIsDebugging(false);
    setIsDebugPlaying(false);
    setDebugSnapshots([]);
    setDebugStepIndex(0);
    setDebugError(null);
    if (editorRef.current) {
      debugDecorIdsRef.current = editorRef.current.deltaDecorations(debugDecorIdsRef.current, []);
    }
  }

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const nextTheme = storedTheme === "light" ? "light" : "dark";
    setThemeMode(nextTheme);
    setDocumentTheme(nextTheme);
    void runCompilation(DEFAULT_TEMPLATE.code, "initial");
  // The IDE bootstraps once on mount with the default template snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!code || code === lastRequestedSourceRef.current) return;
    const timeoutId = window.setTimeout(() => {
      if (code !== lastRequestedSourceRef.current) {
        void runCompilation(code, "auto");
      }
    }, AUTO_COMPILE_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  // Auto-compile intentionally keys off the latest editor text instead of the unstable compile handler reference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!lastExecutedSourceRef.current || code === lastExecutedSourceRef.current || runBusy) return;
    setExecutionStatus("Source changed after the last run. Run the program again to refresh the terminal.");
  }, [code, runBusy]);

  useEffect(() => {
    if (!showChallengeConfetti) return;
    const timeoutId = window.setTimeout(() => setShowChallengeConfetti(false), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [showChallengeConfetti]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    setDocumentTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        closeModals();
        return;
      }

      if (modifier && event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        void runCompilation(code, "manual");
        return;
      }

      if (modifier && event.key === "Enter") {
        event.preventDefault();
        void handleRunProgram();
        return;
      }

      if (modifier && key === "o") {
        event.preventDefault();
        requestOpenFileDialog();
        return;
      }

      if (modifier && key === "s") {
        event.preventDefault();
        downloadSource();
        return;
      }

      if (modifier && event.shiftKey && key === "e") {
        event.preventDefault();
        exportReportHtml();
        return;
      }

      if (modifier && key === "j") {
        event.preventDefault();
        toggleTheme();
        return;
      }

      if (modifier && key === "/") {
        event.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if (event.altKey && event.shiftKey && key === "f") {
        event.preventDefault();
        handleFormatCode();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // The shortcut listener intentionally captures the latest state snapshots used by the actions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, themeMode, result, stdinText]);

  useEffect(() => {
    if (!isDebugPlaying || debugStepIndex >= debugSnapshots.length - 1) {
      if (isDebugPlaying && debugStepIndex >= debugSnapshots.length - 1) {
        setIsDebugPlaying(false);
      }
      return;
    }
    const timerId = window.setTimeout(() => setDebugStepIndex((index) => index + 1), debugSpeed);
    return () => window.clearTimeout(timerId);
  }, [debugSnapshots.length, debugSpeed, debugStepIndex, isDebugPlaying]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !isDebugging || debugSnapshots.length === 0) return;
    const snapshot = debugSnapshots[debugStepIndex];
    if (!snapshot) return;
    const model = editor.getModel();
    if (!model) return;
    const safeLine = Math.min(Math.max(snapshot.line, 1), model.getLineCount());
    debugDecorIdsRef.current = editor.deltaDecorations(debugDecorIdsRef.current, [
      {
        range: new monaco.Range(safeLine, 1, safeLine, model.getLineMaxColumn(safeLine)),
        options: {
          isWholeLine: true,
          className: "debug-line-highlight",
          marginClassName: "debug-line-highlight-margin"
        }
      }
    ]);
    editor.revealLineInCenter(safeLine);
  }, [debugSnapshots, debugStepIndex, isDebugging]);

  const currentSnap = isDebugging && debugSnapshots.length > 0 ? debugSnapshots[debugStepIndex] : null;
  const activeChallenge =
    DIAMOND_CHALLENGES.find((challenge) => challenge.id === activeChallengeId) ?? null;
  const activeChallengeReport =
    challengeReport?.challengeId === activeChallenge?.id ? challengeReport : null;
  const challengeReportStale =
    Boolean(activeChallengeReport) && lastChallengeSourceRef.current !== code;
  const usingWasm = result?.meta?.mode === "wasm";
  const actionBusy = compileBusy || runBusy;
  const displayLines =
    runtimeError && consoleLines.length === 0
      ? [`$ ${runtimeError}`]
      : [
          ...(consoleLines.length > 0
            ? consoleLines
            : [hasExecuted ? "[program executed with no console output]" : "[run output will appear here]"]),
          ...(runtimeError ? ["", `$ ${runtimeError}`] : [])
        ];
  const suitePassedCount = suiteResults.filter((item) => item.passed).length;
  const customTemplateSelected = selectedTemplate === CUSTOM_TEMPLATE_ID;

  return {
    actionBusy,
    activeChallenge,
    activeChallengeId,
    activeChallengeReport,
    activePanel,
    challengeReport,
    challengeReportStale,
    code,
    compileBusy,
    consoleLines,
    currentSnap,
    cursorCol,
    cursorLine,
    customTemplateSelected,
    dashboardTab,
    debugError,
    debugSnapshots,
    debugSpeed,
    debugStepIndex,
    displayLines,
    editorRef,
    executionStatus,
    fileInputRef,
    hasExecuted,
    isDebugPlaying,
    isDebugging,
    lastCompileReason,
    monacoRef,
    openTabs,
    activeTabId,
    result,
    runBusy,
    runtimeError,
    selectedTemplate,
    showChallengeConfetti,
    showCheatsheet,
    showShortcuts,
    sidebarCollapsed,
    sourceLabel,
    stdinText,
    suiteBusy,
    suiteLastRunAt,
    suitePassedCount,
    suiteResults,
    templateUndoStack,
    themeMode,
    usingWasm,
    AUTO_COMPILE_DELAY_MS,
    handleChallengeSelect,
    handleDebugPlayPause,
    handleDebugReset,
    handleDebugStepBack,
    handleDebugStepForward,
    handleDebugStop,
    handleFormatCode,
    handleLoadChallenge,
    handleNewTab,
    handleOpenFile,
    handleRunProgram,
    handleTabRename,
    handleStartDebug,
    handleTabClose,
    handleTabSelect,
    handleTemplateChange,
    closeModals,
    downloadSource,
    exportReportHtml,
    exportReportPdf,
    focusEditorLine,
    handleEditorMount,
    requestOpenFileDialog,
    runCompilation,
    runEmbeddedTestSuite,
    setActivePanel,
    setActiveChallengeId,
    setCode,
    setDashboardTab,
    setDebugSpeed,
    setSelectedTemplate,
    setShowCheatsheet,
    setShowShortcuts,
    setStdinText,
    setThemeMode,
    toggleSidebar,
    toggleTheme,
    undoSourceReplace
  };
}
