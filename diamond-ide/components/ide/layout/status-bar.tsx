import type { ReactNode } from "react";

import { cn } from "../../../lib/ide-utils";

export function StatusBar({
  errorCount,
  symbolCount,
  tokenCount,
  usingWasm
}: {
  errorCount: number;
  symbolCount: number;
  tokenCount: number;
  usingWasm: boolean;
}) {
  return (
    <footer className="mx-4 mb-4 mt-3 flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-[color:var(--statusbar-border)] bg-[var(--statusbar-bg)] px-4 py-3 text-[11px] shadow-[0_18px_45px_rgba(3,3,12,0.24)] backdrop-blur-[18px]">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <StatusPill
          className={cn(
            usingWasm
              ? "bg-[var(--success-soft)] text-[var(--success-text)]"
              : "bg-[var(--warning-soft)] text-[var(--warning-text)]"
          )}
        >
          <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_12px_currentColor]" />
          {usingWasm ? "Status Wasm Ready" : "Status Demo Active"}
        </StatusPill>

        <StatusPill className="bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]">
          Tokens {tokenCount}
        </StatusPill>

        <StatusPill className="bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]">
          Symbols {symbolCount}
        </StatusPill>

        <StatusPill
          className={cn(
            errorCount > 0
              ? "bg-[var(--danger-soft)] text-[var(--danger-text)]"
              : "bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]"
          )}
        >
          Errors {errorCount}
        </StatusPill>
      </div>
    </footer>
  );
}

function StatusPill({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]",
        className
      )}
    >
      {children}
    </div>
  );
}
