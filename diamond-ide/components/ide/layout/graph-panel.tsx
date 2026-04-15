import type { ReactNode } from "react";

import { cn } from "../../../lib/ide-utils";

export function GraphPanel({
  children,
  title,
  body,
  className
}: {
  children: ReactNode;
  title: string;
  body: string;
  className?: string;
}) {
  if (!children) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 px-6 py-12 text-center",
          className
        )}
      >
        <div className="max-w-sm space-y-3">
          <div className="text-lg font-semibold text-[var(--text-primary)]">{title}</div>
          <p className="text-sm leading-6 text-[var(--text-muted)]">{body}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95",
        className
      )}
    >
      {children}
    </div>
  );
}
