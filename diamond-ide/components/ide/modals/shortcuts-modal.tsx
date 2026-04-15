import { KEYBOARD_SHORTCUTS } from "../../../lib/ide-types";

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-[color:var(--panel-border)] bg-[var(--shell-surface)] shadow-[0_32px_80px_rgba(2,8,16,0.32)]">
        <div className="flex items-center justify-between border-b border-[color:var(--panel-border)] px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-text)]">
              Keyboard Shortcuts
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Faster ways to compile, run, format, and navigate
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--panel-hover-bg)]"
          >
            Close
          </button>
        </div>
        <div className="space-y-3 p-6">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex flex-col gap-3 rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {shortcut.description}
              </div>
              <div className="flex flex-wrap gap-2">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={`${shortcut.id}-${key}`}
                    className="rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 font-mono text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
