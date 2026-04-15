import { cn } from "../../../lib/ide-utils";
import type { ChallengeEvaluation, DiamondChallenge } from "../../../lib/challenges";

export function ChallengePanel({
  challenges,
  activeChallenge,
  challengeReport,
  challengeReportStale,
  actionBusy,
  onSelectChallenge,
  onLoadChallenge,
  onRunChallenge,
  onApplyExampleInput
}: {
  challenges: DiamondChallenge[];
  activeChallenge: DiamondChallenge;
  challengeReport: ChallengeEvaluation | null;
  challengeReportStale: boolean;
  actionBusy: boolean;
  onSelectChallenge: (challengeId: string) => void;
  onLoadChallenge: (challenge: DiamondChallenge) => void;
  onRunChallenge: () => void;
  onApplyExampleInput: (value: string) => void;
}) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="min-h-0 overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95">
        <div className="border-b border-[color:var(--panel-border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Challenge List
        </div>
        <div className="p-2">
          {challenges.map((challenge) => {
            const selected = challenge.id === activeChallenge.id;
            const passed = challengeReport?.challengeId === challenge.id && challengeReport.passed;

            return (
              <button
                key={challenge.id}
                onClick={() => onSelectChallenge(challenge.id)}
                className={cn(
                  "mb-2 w-full rounded-[18px] border px-3 py-3 text-left transition last:mb-0",
                  selected
                    ? "border-[var(--accent-border-strong)] bg-[var(--accent-soft)]"
                    : "border-transparent bg-[var(--panel-muted-bg)] hover:border-[var(--panel-border)] hover:bg-[var(--panel-hover-bg)]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {challenge.difficulty}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                      {challenge.title}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                      passed
                        ? "bg-[var(--success-soft)] text-[var(--success-text)]"
                        : selected
                          ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                          : "bg-[var(--panel-bg)] text-[var(--text-muted)]"
                    )}
                  >
                    {passed ? "Passed" : selected ? "Selected" : "Open"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  {challenge.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-text)]">
              {activeChallenge.difficulty}
            </div>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {activeChallenge.title}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {activeChallenge.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onLoadChallenge(activeChallenge)}
              disabled={actionBusy}
              className="rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--panel-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Load Starter
            </button>
            <button
              onClick={() => onApplyExampleInput(activeChallenge.tests[0]?.stdin ?? "")}
              disabled={actionBusy}
              className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[var(--accent-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sample Input
            </button>
            <button
              onClick={onRunChallenge}
              disabled={actionBusy}
              className="rounded-xl bg-[var(--success-strong)] px-3 py-2 text-xs font-semibold text-[var(--success-strong-ink)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Run Challenge
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-[20px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Hint
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{activeChallenge.hint}</p>
          </section>

          <section className="rounded-[20px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Structural Checks
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeChallenge.requirements.map((requirement) => {
                const check = challengeReport?.checks.find((item) => item.label === requirement.label);
                return (
                  <span
                    key={requirement.label}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      check?.passed ? "bg-[var(--success-soft)] text-[var(--success-text)]" : "bg-[var(--panel-bg)] text-[var(--text-secondary)]"
                    )}
                  >
                    {requirement.label}
                  </span>
                );
              })}
            </div>
          </section>

          <section className="rounded-[20px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Hidden Test Flow
              </div>
              <div className={cn("rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]", challengeReport?.passed ? "bg-[var(--success-soft)] text-[var(--success-text)]" : "bg-[var(--panel-bg)] text-[var(--text-muted)]")}>
                {challengeReport?.passed ? "Passed" : "Pending"}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {activeChallenge.tests.map((test) => {
                const matchingCheck = challengeReport?.checks.find((check) => check.label === test.label);
                return (
                  <div key={test.id} className="rounded-2xl border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)]/90 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{test.label}</div>
                      <div className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]", matchingCheck?.passed ? "bg-[var(--success-soft)] text-[var(--success-text)]" : "bg-[var(--panel-bg)] text-[var(--text-muted)]")}>
                        {matchingCheck?.passed ? "ok" : "pending"}
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                      Sample input:{" "}
                      <span className="font-mono text-[var(--accent-text)]">
                        {test.stdin.length > 0 ? JSON.stringify(test.stdin) : "[no input]"}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[20px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)]/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Last Evaluation
              </div>
              {challengeReportStale ? (
                <div className="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--warning-text)]">
                  Source changed after this result
                </div>
              ) : null}
            </div>
            {challengeReport ? (
              <div className="mt-4 space-y-3">
                <div className={cn("rounded-2xl border px-4 py-3 text-sm leading-6", challengeReport.passed ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-text)]" : "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)]")}>
                  {challengeReport.summary}
                </div>
                {challengeReport.checks.map((check) => (
                  <div key={check.label} className={cn("rounded-2xl border px-4 py-3", check.passed ? "border-[var(--success-border)] bg-[var(--success-soft)]" : "border-[var(--danger-border)] bg-[var(--danger-soft)]")}>
                    <div className={cn("text-xs font-semibold uppercase tracking-[0.18em]", check.passed ? "text-[var(--success-text)]" : "text-[var(--danger-text)]")}>
                      {check.label}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{check.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                Load the starter code or write your own solution, then use Run to execute the hidden tests.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
