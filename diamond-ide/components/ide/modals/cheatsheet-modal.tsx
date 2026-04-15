import { DIAMOND_CHEATSHEET } from "../../../lib/diamond-cheatsheet";

export function CheatsheetModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[30px] border border-[color:var(--panel-border)] bg-[var(--shell-surface)] shadow-[0_32px_80px_rgba(2,8,16,0.32)]">
        <div className="flex items-center justify-between border-b border-[color:var(--panel-border)] px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-text)]">
              Diamond Cheatsheet
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Quick syntax guide for arrays, functions, conditions, and demos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--panel-hover-bg)]"
          >
            Close
          </button>
        </div>
        <div className="grid max-h-[calc(88vh-112px)] gap-4 overflow-auto p-6 md:grid-cols-2">
          {DIAMOND_CHEATSHEET.map((entry) => (
            <div
              key={entry.title}
              className="rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-5"
            >
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
                {entry.title}
              </div>
              <pre className="mt-4 overflow-auto rounded-2xl bg-[var(--console-bg)] p-4 text-sm leading-6 text-[var(--console-text)]">
                {entry.example}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
