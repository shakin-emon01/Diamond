export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/90 px-6 text-center">
      <div className="max-w-sm space-y-3">
        <div className="text-lg font-semibold text-[var(--text-primary)]">{title}</div>
        <p className="text-sm leading-6 text-[var(--text-muted)]">{body}</p>
      </div>
    </div>
  );
}
