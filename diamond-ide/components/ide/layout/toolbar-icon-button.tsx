import type { ReactNode } from "react";

export function ToolbarIconButton({
  title,
  onClick,
  children,
  disabled
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[color:var(--toolbar-ghost-border)] bg-[var(--toolbar-ghost-bg)] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition duration-200 hover:translate-y-[-2px] hover:border-[color:var(--toolbar-ghost-hover-border)] hover:bg-[var(--toolbar-ghost-hover-bg)] hover:text-[var(--text-primary)] hover:shadow-[0_12px_24px_rgba(190,153,255,0.12)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
