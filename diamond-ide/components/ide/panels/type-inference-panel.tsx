import { Lightbulb, TriangleAlert } from "lucide-react";

import { buildTypeInsights, buildTypeSuggestions } from "../../../lib/analysis/insights";
import type { DiamondResult } from "../../../lib/types";
import { cn } from "../../../lib/ide-utils";

import { EmptyState } from "../layout/empty-state";

export function TypeInferencePanel({
  result,
  onFocusEditorLine
}: {
  result: DiamondResult | null;
  onFocusEditorLine?: (line: number | null | undefined) => void;
}) {
  if (!result?.ast) {
    return (
      <EmptyState
        title="No type inference data yet"
        body="Compile the program to inspect expected types, inferred types, and possible mismatches."
      />
    );
  }

  const insights = buildTypeInsights(result.ast, result.symbolTable);
  const suggestions = buildTypeSuggestions(result.ast, result.symbolTable);

  if (!insights.length) {
    return (
      <EmptyState
        title="No typed expressions yet"
        body="Add declarations, assignments, or function calls to populate the type inference panel."
      />
    );
  }

  return (
    <div className="h-full overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
      <div className="mb-4 rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)]/50 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Suggestions
        </div>
        <div className="mt-3 space-y-2.5">
          {suggestions.map((suggestion) => {
            const interactive = Boolean(onFocusEditorLine && suggestion.line);
            const cardClassName = cn(
              "flex items-start gap-3 rounded-[18px] border px-4 py-3",
              interactive && "w-full text-left transition hover:opacity-90",
              suggestion.severity === "warning"
                ? "border-[var(--warning-border)] bg-[var(--warning-soft)]"
                : "border-[var(--accent-border)] bg-[var(--accent-soft)]"
            );

            const content = (
              <>
                <span
                  className={cn(
                    "mt-0.5 inline-flex rounded-xl p-2",
                    suggestion.severity === "warning"
                      ? "bg-[var(--warning-strong)] text-[var(--warning-strong-ink)]"
                      : "bg-[var(--accent-strong)] text-[var(--accent-strong-ink)]"
                  )}
                >
                  {suggestion.severity === "warning" ? <TriangleAlert size={14} /> : <Lightbulb size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {suggestion.title}
                    </span>
                    {suggestion.line ? (
                      <span className="rounded-full border border-[color:var(--panel-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        Line {suggestion.line}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
                    {suggestion.body}
                  </span>
                </span>
              </>
            );

            return interactive ? (
              <button
                key={suggestion.id}
                onClick={() => onFocusEditorLine?.(suggestion.line)}
                className={cardClassName}
              >
                {content}
              </button>
            ) : (
              <div key={suggestion.id} className={cardClassName}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Expected vs Inferred
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          This table highlights the type the compiler expected in each context and the type it
          inferred for the attached expression or argument.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "rounded-[22px] border p-4",
              insight.status === "ok"
                ? "border-[var(--success-border)] bg-[var(--success-soft)]"
                : "border-[var(--warning-border)] bg-[var(--warning-soft)]"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{insight.label}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {insight.kind} • line {insight.line}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                  insight.status === "ok"
                    ? "bg-[var(--success-strong)] text-[var(--success-strong-ink)]"
                    : "bg-[var(--warning-strong)] text-[var(--warning-strong-ink)]"
                )}
              >
                {insight.status === "ok" ? "Aligned" : "Check"}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Expected
                </div>
                <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {insight.expectedType}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Inferred
                </div>
                <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {insight.inferredType}
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{insight.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
