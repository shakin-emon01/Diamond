import { buildScopeInsight } from "../../../lib/analysis/insights";
import type { DiamondResult } from "../../../lib/types";

import { EmptyState } from "../layout/empty-state";

function ScopeTree({
  node,
  totalLines
}: {
  node: ReturnType<typeof buildScopeInsight>["root"];
  totalLines: number;
}) {
  if (!node) {
    return null;
  }

  const width = `${Math.max(((node.endLine - node.startLine + 1) / Math.max(totalLines, 1)) * 100, 10)}%`;

  return (
    <div className="rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{node.label}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Depth {node.depth} • lines {node.startLine}-{node.endLine}
          </div>
        </div>
        <div className="rounded-full bg-[var(--panel-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {node.kind}
        </div>
      </div>

      <div className="mt-4 rounded-full bg-[var(--panel-bg)] p-1">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[var(--accent-strong)] to-[var(--success-strong)]"
          style={{ width }}
        />
      </div>

      {node.symbols.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {node.symbols.map((symbol) => (
            <span
              key={`${node.id}-${symbol.name}-${symbol.line}`}
              className="rounded-full border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs text-[var(--text-secondary)]"
            >
              {symbol.name} • {symbol.kind} • {symbol.type}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          No symbols were declared directly in this scope.
        </p>
      )}

      {node.children.length > 0 ? (
        <div className="mt-4 space-y-3 border-l border-[color:var(--panel-border)] pl-4">
          {node.children.map((child) => (
            <ScopeTree key={child.id} node={child} totalLines={totalLines} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ScopeExplorerPanel({
  result,
  source
}: {
  result: DiamondResult | null;
  source: string;
}) {
  if (!result?.ast) {
    return (
      <EmptyState
        title="No scope data yet"
        body="Compile the source to inspect nested scopes, line ranges, and symbol lifetimes."
      />
    );
  }

  const insight = buildScopeInsight(result.ast, result.symbolTable, source);

  return (
    <div className="h-full overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Nested Scope Explorer
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Each card shows a scope boundary, the line range where it remains active, and the
              symbols declared inside that lifetime.
            </p>
          </div>
          <ScopeTree node={insight.root} totalLines={insight.totalLines} />
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Lifetime Summary
            </div>
            <div className="mt-4 space-y-3">
              {insight.flat.map((scope) => {
                const width = `${Math.max(((scope.endLine - scope.startLine + 1) / Math.max(insight.totalLines, 1)) * 100, 10)}%`;
                return (
                  <div key={scope.id}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">{scope.label}</span>
                      <span className="text-[var(--text-muted)]">
                        {scope.startLine}-{scope.endLine}
                      </span>
                    </div>
                    <div className="mt-2 rounded-full bg-[var(--panel-bg)] p-1">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-[var(--accent-strong)] to-[var(--success-strong)]"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Builtins
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {insight.builtins.length > 0 ? (
                insight.builtins.map((symbol) => (
                  <span
                    key={`${symbol.name}-${symbol.line}`}
                    className="rounded-full border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                  >
                    {symbol.name} • {symbol.type}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[var(--text-muted)]">
                  No builtin signatures reported.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
