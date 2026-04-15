import { DIAMOND_TEST_SUITE, type DiamondSuiteCaseResult } from "../../../lib/test-suite";
import { cn } from "../../../lib/ide-utils";

import { EmptyState } from "../layout/empty-state";

export function TestSuitePanel({
  onRunSuite,
  running,
  results,
  lastRunAt
}: {
  onRunSuite: () => void;
  running: boolean;
  results: DiamondSuiteCaseResult[];
  lastRunAt: string | null;
}) {
  if (!results.length) {
    return (
      <div className="h-full overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
        <div className="rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Automated Test Suite
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Run a built-in suite of Diamond programs covering syntax, control flow, arrays,
            functions, and expected diagnostics. This dashboard mirrors the kind of pass/fail view
            the project roadmap calls for.
          </p>
          <button
            onClick={onRunSuite}
            disabled={running}
            className="mt-4 rounded-2xl bg-[var(--accent-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-strong-ink)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Running suite..." : "Run Test Suite"}
          </button>
        </div>

        <div className="mt-4">
          <EmptyState
            title="No suite results yet"
            body="Run the embedded suite to see pass/fail status for the current compiler engine."
          />
        </div>
      </div>
    );
  }

  const passed = results.filter((item) => item.passed).length;

  return (
    <div className="h-full overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Automated Test Suite
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {passed}/{results.length} embedded cases passed. Last run: {lastRunAt ?? "not yet"}.
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
            Cases currently cover{" "}
            {DIAMOND_TEST_SUITE.map((testCase) => testCase.category)
              .filter((value, index, array) => array.indexOf(value) === index)
              .join(", ")}
            .
          </p>
        </div>
        <button
          onClick={onRunSuite}
          disabled={running}
          className="rounded-2xl bg-[var(--accent-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-strong-ink)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Running suite..." : "Run Again"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {results.map((result) => (
          <div
            key={result.caseId}
            className={cn(
              "rounded-[22px] border p-4",
              result.passed
                ? "border-[var(--success-border)] bg-[var(--success-soft)]"
                : "border-[var(--danger-border)] bg-[var(--danger-soft)]"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{result.title}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {result.category}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                  result.passed
                    ? "bg-[var(--success-strong)] text-[var(--success-strong-ink)]"
                    : "bg-[var(--danger-strong)] text-[var(--danger-strong-ink)]"
                )}
              >
                {result.passed ? "Passed" : "Failed"}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{result.summary}</p>
            {result.expectedLines.length > 0 || result.actualLines.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Expected
                  </div>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-[var(--text-primary)]">
                    {result.expectedLines.join("\n") || "[no output]"}
                  </pre>
                </div>
                <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Actual
                  </div>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-[var(--text-primary)]">
                    {result.actualLines.join("\n") || "[no output]"}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
