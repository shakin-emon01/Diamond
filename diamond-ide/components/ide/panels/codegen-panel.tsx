"use client";

import { useState } from "react";

import { cn } from "../../../lib/ide-utils";
import type { DiamondResult, DiamondTacInstruction } from "../../../lib/types";

import { EmptyState } from "../layout/empty-state";

type CodegenView = "optimized" | "raw" | "assembly";

const EMPTY_OPTIMIZATION_STATS = {
  constantFolds: 0,
  strengthReductions: 0,
  commonSubexpressions: 0,
  deadCodeEliminated: 0,
  unreachableRemoved: 0
};

function SummaryCard({
  label,
  value,
  accent = "accent"
}: {
  label: string;
  value: string;
  accent?: "accent" | "success" | "warning";
}) {
  const accentClassName =
    accent === "success"
      ? "border-[var(--success-border)] bg-[var(--success-soft)]"
      : accent === "warning"
        ? "border-[var(--warning-border)] bg-[var(--warning-soft)]"
        : "border-[var(--accent-border)] bg-[var(--accent-soft)]";

  return (
    <div className={cn("rounded-[20px] border p-4", accentClassName)}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function InstructionTable({
  instructions,
  emptyTitle,
  emptyBody
}: {
  instructions: DiamondTacInstruction[];
  emptyTitle: string;
  emptyBody: string;
}) {
  if (!instructions.length) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95">
      <table className="min-w-full text-left text-sm text-[var(--text-primary)]">
        <thead className="sticky top-0 bg-[var(--panel-muted-bg)]/95 text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <tr>
            {["#", "Op", "Arg1", "Arg2", "Result"].map((header) => (
              <th key={header} className="border-b border-[color:var(--panel-border)] px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {instructions.map((instruction) => (
            <tr
              key={`${instruction.index}-${instruction.op ?? "noop"}-${instruction.result ?? "nil"}`}
              className="border-b border-[color:var(--panel-border-soft)] last:border-b-0"
            >
              <td className="px-4 py-3 text-[var(--text-muted)]">{instruction.index}</td>
              <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{instruction.op ?? "-"}</td>
              <td className="px-4 py-3 text-[var(--text-primary)]/90">{instruction.arg1 ?? "-"}</td>
              <td className="px-4 py-3 text-[var(--text-primary)]/90">{instruction.arg2 ?? "-"}</td>
              <td className="px-4 py-3 text-[var(--text-primary)]/90">{instruction.result ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCompilerMode(mode?: string) {
  if (mode === "wasm") {
    return "WebAssembly front-end";
  }

  if (mode === "server") {
    return "Backend compiler service";
  }

  if (mode === "demo") {
    return "Demo/mock compiler";
  }

  return "Unknown engine";
}

export function CodegenPanel({
  result
}: {
  result: DiamondResult | null;
}) {
  const [view, setView] = useState<CodegenView>("optimized");

  if (!result) {
    return (
      <EmptyState
        title="No IR output yet"
        body="Compile the source to inspect raw TAC, optimized TAC, and the pseudo-assembly target."
      />
    );
  }

  const rawTac = result.rawTac ?? [];
  const optimizedTac = result.tac ?? [];
  const assembly = result.assembly ?? "";
  const optimizations = result.optimizations ?? EMPTY_OPTIMIZATION_STATS;
  const totalOptimizations =
    optimizations.constantFolds +
    optimizations.strengthReductions +
    optimizations.commonSubexpressions +
    optimizations.deadCodeEliminated +
    optimizations.unreachableRemoved;
  const instructionSavings = Math.max(rawTac.length - optimizedTac.length, 0);
  const modeLabel = formatCompilerMode(result.meta?.mode);
  const engineStatus = result.meta?.engineStatus ?? modeLabel;

  return (
    <div className="h-full overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(300px,0.78fr)]">
        <div className="space-y-4">
          <div className="rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Intermediate Representation
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Raw TAC is emitted directly from the AST. Optimized TAC then applies constant
              folding, strength reduction, common subexpression elimination, dead code removal,
              and unreachable code cleanup before the compiler formats the result as an educational
              pseudo-assembly listing.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: "optimized" as const, label: "Optimized TAC" },
                { id: "raw" as const, label: "Raw TAC" },
                { id: "assembly" as const, label: "Assembly" }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setView(option.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    view === option.id
                      ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                      : "border-[color:var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {view === "assembly" ? (
            assembly.length > 0 ? (
              <div className="rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95">
                <div className="border-b border-[color:var(--panel-border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Pseudo-Assembly Target
                </div>
                <pre className="overflow-auto p-4 text-sm leading-6 text-[var(--text-primary)]">
                  {assembly}
                </pre>
              </div>
            ) : (
              <EmptyState
                title="No assembly yet"
                body="Assembly is generated after a successful TAC pass. Resolve compilation errors to inspect it here."
              />
            )
          ) : (
            <InstructionTable
              instructions={view === "raw" ? rawTac : optimizedTac}
              emptyTitle={view === "raw" ? "No raw TAC yet" : "No optimized TAC yet"}
              emptyBody={
                view === "raw"
                  ? "Compile the source successfully to inspect the first IR lowering pass."
                  : "Compile the source successfully to inspect the optimized IR listing."
              }
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Codegen Target
            </div>
            <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center justify-between gap-3">
                <span>Compiler engine</span>
                <span className="font-semibold text-[var(--text-primary)]">{engineStatus}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>IR stages</span>
                <span className="font-semibold text-[var(--text-primary)]">{"AST -> TAC -> Assembly"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Assembly flavor</span>
                <span className="font-semibold text-[var(--text-primary)]">Educational pseudo-assembly</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Preprocess imports</span>
                <span className="font-semibold text-[var(--text-primary)]">{result.meta?.preprocessImports ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Record declarations</span>
                <span className="font-semibold text-[var(--text-primary)]">{result.meta?.preprocessRecordVariables ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Raw TAC" value={String(rawTac.length)} accent="warning" />
            <SummaryCard label="Optimized TAC" value={String(optimizedTac.length)} accent="success" />
            <SummaryCard label="Instruction Savings" value={String(instructionSavings)} />
            <SummaryCard label="Optimization Hits" value={String(totalOptimizations)} />
          </div>

          <div className="rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Optimization Breakdown
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["Constant folds", optimizations.constantFolds],
                ["Strength reductions", optimizations.strengthReductions],
                ["Common subexpressions", optimizations.commonSubexpressions],
                ["Dead code eliminated", optimizations.deadCodeEliminated],
                ["Unreachable removed", optimizations.unreachableRemoved]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="rounded-full bg-[var(--panel-bg)] px-3 py-1 font-semibold text-[var(--text-primary)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
