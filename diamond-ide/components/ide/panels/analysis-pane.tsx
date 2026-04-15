"use client";

import { useEffect } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  useNodesInitialized,
  useReactFlow
} from "reactflow";
import "reactflow/dist/style.css";

import { buildAstGraph } from "../../../lib/ast-graph";
import { buildFlowchartGraph, flowchartNodeTypes } from "../../../lib/flowchart";
import { PANEL_TABS, type DashboardTab, type PanelTab } from "../../../lib/ide-types";
import { cn } from "../../../lib/ide-utils";
import { DIAMOND_CHALLENGES, type ChallengeEvaluation, type DiamondChallenge } from "../../../lib/challenges";
import type { DiamondSuiteCaseResult } from "../../../lib/test-suite";
import type { DiamondResult } from "../../../lib/types";
import type { DebugSnapshot } from "../../../lib/debug-runtime";
import { DebugControls, MemoryPanel } from "../../../lib/memory-panel";

import { ChallengePanel } from "./challenge-panel";
import { CodegenPanel } from "./codegen-panel";
import { ConfettiBurst } from "./confetti-burst";
import { ScopeExplorerPanel } from "./scope-explorer-panel";
import { TestSuitePanel } from "./test-suite-panel";
import { TokenStreamPanel } from "./token-stream-panel";
import { TypeInferencePanel } from "./type-inference-panel";
import { DataTable } from "../layout/data-table";
import { EmptyState } from "../layout/empty-state";
import { GraphPanel } from "../layout/graph-panel";

const GRAPH_PANEL_MIN_HEIGHT = 520;
const GRAPH_PANEL_VERTICAL_PADDING = 220;

function getNumericStyleDimension(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getGraphCanvasHeight(nodes: Node[], defaultNodeHeight: number) {
  if (!nodes.length) {
    return GRAPH_PANEL_MIN_HEIGHT;
  }

  let maxBottom = 0;

  for (const node of nodes) {
    const style = (node.style ?? {}) as Record<string, unknown>;
    const nodeHeight = getNumericStyleDimension(style.height, defaultNodeHeight);
    maxBottom = Math.max(maxBottom, node.position.y + nodeHeight);
  }

  return Math.max(GRAPH_PANEL_MIN_HEIGHT, Math.ceil(maxBottom + GRAPH_PANEL_VERTICAL_PADDING));
}

function getGraphFitKey(nodes: Node[], edgesCount: number) {
  return `${edgesCount}:${nodes
    .map((node) => `${node.id}@${Math.round(node.position.x)}:${Math.round(node.position.y)}`)
    .join("|")}`;
}

function AutoFitGraphView({
  fitKey,
  padding = 0.12,
  maxZoom = 1
}: {
  fitKey: string;
  padding?: number;
  maxZoom?: number;
}) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    if (!nodesInitialized) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      void fitView({ duration: 250, maxZoom, padding });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [fitKey, fitView, maxZoom, nodesInitialized, padding]);

  return null;
}

export function AnalysisPane({
  actionBusy,
  activeChallenge,
  activeChallengeReport,
  activePanel,
  challengeReportStale,
  code,
  currentSnap,
  dashboardTab,
  debugError,
  debugSnapshots,
  debugSpeed,
  debugStepIndex,
  isDebugPlaying,
  isDebugging,
  onApplyChallengeInput,
  onDebugPlayPause,
  onDebugReset,
  onDebugStepBack,
  onDebugStepForward,
  onDebugStop,
  onFocusEditorLine,
  onLoadChallenge,
  onRunChallenge,
  onRunSuite,
  onSelectChallenge,
  onSetActivePanel,
  onSetDashboardTab,
  onSetDebugSpeed,
  result,
  showChallengeConfetti,
  suiteBusy,
  suiteLastRunAt,
  suiteResults
}: {
  actionBusy: boolean;
  activeChallenge: DiamondChallenge | null;
  activeChallengeReport: ChallengeEvaluation | null;
  activePanel: PanelTab;
  challengeReportStale: boolean;
  code: string;
  currentSnap: DebugSnapshot | null;
  dashboardTab: DashboardTab;
  debugError: string | null;
  debugSnapshots: DebugSnapshot[];
  debugSpeed: number;
  debugStepIndex: number;
  isDebugPlaying: boolean;
  isDebugging: boolean;
  onApplyChallengeInput: (value: string) => void;
  onDebugPlayPause: () => void;
  onDebugReset: () => void;
  onDebugStepBack: () => void;
  onDebugStepForward: () => void;
  onDebugStop: () => void;
  onFocusEditorLine: (line: number | null | undefined) => void;
  onLoadChallenge: (challenge: DiamondChallenge) => void;
  onRunChallenge: () => void;
  onRunSuite: () => void;
  onSelectChallenge: (challengeId: string) => void;
  onSetActivePanel: (panel: PanelTab) => void;
  onSetDashboardTab: (tab: DashboardTab) => void;
  onSetDebugSpeed: (speed: number) => void;
  result: DiamondResult | null;
  showChallengeConfetti: boolean;
  suiteBusy: boolean;
  suiteLastRunAt: string | null;
  suiteResults: DiamondSuiteCaseResult[];
}) {
  const graph = buildAstGraph(result?.ast ?? null, currentSnap?.astNodeType, currentSnap?.astNodeText);
  const flowchart = buildFlowchartGraph(result?.ast ?? null);
  const isGraphPanel = dashboardTab === "analysis" && (activePanel === "ast" || activePanel === "flow");
  const astGraphHeight = getGraphCanvasHeight(graph.nodes, 104);
  const flowchartGraphHeight = getGraphCanvasHeight(flowchart.nodes, 176);
  const astFitKey = getGraphFitKey(graph.nodes, graph.edges.length);
  const flowchartFitKey = getGraphFitKey(flowchart.nodes, flowchart.edges.length);

  return (
    <section className="relative flex min-h-[540px] flex-col overflow-hidden rounded-[2rem] border border-[color:rgba(190,153,255,0.12)] bg-[linear-gradient(180deg,rgba(18,16,41,0.96),rgba(10,10,27,0.98))] shadow-[0_34px_90px_rgba(3,3,12,0.42)] lg:min-h-[620px]">
      {dashboardTab === "challenges" && showChallengeConfetti ? <ConfettiBurst /> : null}

      <div className="border-b border-[color:rgba(190,153,255,0.1)] bg-[linear-gradient(180deg,rgba(38,34,78,0.7),rgba(24,22,52,0.45))] px-5 py-4">
        <div className="flex items-center gap-6 overflow-x-auto border-b border-[color:rgba(190,153,255,0.08)]">
          {[
            { id: "analysis" as const, label: "Analysis" },
            { id: "challenges" as const, label: "Challenges" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSetDashboardTab(tab.id)}
              className={cn(
                "relative shrink-0 px-1 py-2.5 text-sm font-medium tracking-[-0.02em] transition",
                dashboardTab === tab.id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.label}
              {dashboardTab === tab.id ? (
                <span
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-[2px] rounded-full",
                    tab.id === "analysis" ? "bg-[var(--accent-strong)]" : "bg-[var(--success-strong)]"
                  )}
                />
              ) : null}
            </button>
          ))}
        </div>

        {dashboardTab === "analysis" ? (
          <div className="mt-4 flex items-center gap-5 overflow-x-auto">
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSetActivePanel(tab.id)}
                className={cn(
                  "relative shrink-0 px-1 py-2 text-[11px] font-medium uppercase tracking-[0.2em] transition",
                  activePanel === tab.id
                    ? "text-[var(--success-strong)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {tab.label}
                {activePanel === tab.id ? (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[var(--success-strong)] shadow-[0_0_18px_rgba(102,217,204,0.45)]" />
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            Pick a challenge, load the starter if needed, then use Run to execute the hidden
            structural checks and runtime tests.
          </p>
        )}
      </div>

      {isDebugging ? (
        <div className="border-b border-[color:rgba(190,153,255,0.08)] px-5 py-4">
          <DebugControls
            stepIndex={debugStepIndex}
            totalSteps={debugSnapshots.length}
            isPlaying={isDebugPlaying}
            onStepBack={onDebugStepBack}
            onStepForward={onDebugStepForward}
            onPlayPause={onDebugPlayPause}
            onReset={onDebugReset}
            onStop={onDebugStop}
            speed={debugSpeed}
            onSpeedChange={onSetDebugSpeed}
            currentAction={currentSnap?.action ?? ""}
          />
          {debugError ? (
            <div className="mt-2 rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-text)]">
              {debugError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn(isGraphPanel ? "p-5" : "min-h-0 flex-1 overflow-hidden p-5")}>
        {dashboardTab === "analysis" && activePanel === "ast" ? (
          <GraphPanel
            title="AST pending"
            body="Compile the program to build the abstract syntax tree graph."
            className="min-h-[520px]"
          >
            {graph.nodes.length > 0 ? (
              <div style={{ height: `${astGraphHeight}px` }}>
                <ReactFlow
                  nodes={graph.nodes}
                  edges={graph.edges}
                  minZoom={0.2}
                  maxZoom={1.5}
                  zoomOnScroll={false}
                  panOnScroll={false}
                  preventScrolling={false}
                  proOptions={{ hideAttribution: true }}
                  nodesConnectable={false}
                  elementsSelectable
                  onNodeClick={(_event, node) => onFocusEditorLine((node.data as { line?: number } | undefined)?.line)}
                >
                  <AutoFitGraphView fitKey={astFitKey} padding={0.08} />
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148, 163, 184, 0.18)" />
                  <MiniMap
                    nodeColor={() => "rgba(240, 180, 41, 0.8)"}
                    maskColor="rgba(2, 6, 23, 0.72)"
                    style={{ background: "rgba(9, 19, 31, 0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <Controls
                    style={{ background: "rgba(9, 19, 31, 0.88)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </ReactFlow>
              </div>
            ) : null}
          </GraphPanel>
        ) : null}

        {dashboardTab === "analysis" && activePanel === "flow" ? (
          <GraphPanel
            title="Flowchart pending"
            body="Compile the program to turn the AST into an algorithm flowchart."
            className="min-h-[520px]"
          >
            {flowchart.nodes.length > 0 ? (
              <div style={{ height: `${flowchartGraphHeight}px` }}>
                <ReactFlow
                  nodes={flowchart.nodes}
                  edges={flowchart.edges}
                  nodeTypes={flowchartNodeTypes}
                  minZoom={0.2}
                  maxZoom={1.35}
                  zoomOnScroll={false}
                  panOnScroll={false}
                  preventScrolling={false}
                  proOptions={{ hideAttribution: true }}
                  nodesConnectable={false}
                  elementsSelectable
                  onNodeClick={(_event, node) => onFocusEditorLine((node.data as { line?: number } | undefined)?.line)}
                >
                  <AutoFitGraphView fitKey={flowchartFitKey} padding={0.08} />
                  <Background variant={BackgroundVariant.Lines} gap={22} size={1} color="rgba(148, 163, 184, 0.11)" />
                  <MiniMap
                    nodeColor={(node) => {
                      const kind = (node.data as { kind?: string } | undefined)?.kind;
                      if (kind === "decision") return "rgba(245, 158, 11, 0.85)";
                      if (kind === "io") return "rgba(34, 211, 238, 0.85)";
                      if (kind === "terminal") return "rgba(52, 211, 153, 0.85)";
                      return "rgba(148, 163, 184, 0.82)";
                    }}
                    maskColor="rgba(2, 6, 23, 0.72)"
                    style={{ background: "rgba(9, 19, 31, 0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <Controls
                    style={{ background: "rgba(9, 19, 31, 0.88)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </ReactFlow>
              </div>
            ) : null}
          </GraphPanel>
        ) : null}

        {dashboardTab === "analysis" && activePanel === "tokens" ? (
          <TokenStreamPanel tokens={result?.tokens ?? []} />
        ) : null}

        {dashboardTab === "analysis" && activePanel === "symbols" ? (
          <DataTable
            headers={["Name", "Kind", "Type", "Scope", "Line", "Mem Addr", "Active"]}
            rows={(result?.symbolTable ?? []).map((symbol) => [
              symbol.name,
              symbol.kind,
              symbol.type,
              String(symbol.scope),
              String(symbol.line),
              symbol.memoryAddress !== undefined ? `0x${symbol.memoryAddress.toString(16).toUpperCase()}` : "-",
              symbol.active ? "yes" : "no"
            ])}
            emptyTitle="No symbols yet"
            emptyBody="Declarations and parameters will appear here after compilation."
          />
        ) : null}

        {dashboardTab === "analysis" && activePanel === "scopes" ? (
          <ScopeExplorerPanel result={result} source={code} />
        ) : null}

        {dashboardTab === "analysis" && activePanel === "types" ? (
          <TypeInferencePanel result={result} onFocusEditorLine={onFocusEditorLine} />
        ) : null}

        {dashboardTab === "analysis" && activePanel === "tac" ? (
          <CodegenPanel result={result} />
        ) : null}

        {dashboardTab === "analysis" && activePanel === "errors" ? (
          <div className="h-full overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
            {(result?.errors.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {result?.errors.map((error, index) => (
                  <div
                    key={`${error.line}-${index}`}
                    onClick={() => onFocusEditorLine(error.line)}
                    className={cn(
                      "rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] p-4 transition",
                      error.line ? "cursor-pointer hover:opacity-90" : ""
                    )}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--danger-text)]">
                      {error.type} {error.line ? `• line ${error.line}` : ""}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{error.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Diagnostics clear"
                body="No syntax or semantic issues were reported for the latest compilation."
              />
            )}
          </div>
        ) : null}

        {dashboardTab === "analysis" && activePanel === "memory" ? (
          currentSnap ? (
            <MemoryPanel memory={currentSnap.memory} callStack={currentSnap.callStack} />
          ) : (
            <EmptyState
              title="Start the Debugger"
              body="Use the debug action from the toolbar to step through the program and inspect memory here."
            />
          )
        ) : null}

        {dashboardTab === "analysis" && activePanel === "suite" ? (
          <TestSuitePanel
            onRunSuite={onRunSuite}
            running={suiteBusy}
            results={suiteResults}
            lastRunAt={suiteLastRunAt}
          />
        ) : null}

        {dashboardTab === "challenges" && activeChallenge ? (
          <ChallengePanel
            challenges={DIAMOND_CHALLENGES}
            activeChallenge={activeChallenge}
            challengeReport={activeChallengeReport}
            challengeReportStale={challengeReportStale}
            actionBusy={actionBusy}
            onSelectChallenge={onSelectChallenge}
            onLoadChallenge={onLoadChallenge}
            onRunChallenge={onRunChallenge}
            onApplyExampleInput={onApplyChallengeInput}
          />
        ) : null}
      </div>
    </section>
  );
}
