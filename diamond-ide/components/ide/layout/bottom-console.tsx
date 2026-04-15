"use client";

import { cn } from "../../../lib/ide-utils";

const EMPTY_OUTPUT_MARKERS = new Set([
  "[run output will appear here]",
  "[program executed with no console output]"
]);

function getOutputLineTone(line: string) {
  const trimmed = line.trim();

  if (!trimmed) {
    return "empty";
  }

  if (/:\s*$/.test(trimmed)) {
    return "label";
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return "number";
  }

  return "value";
}

export function BottomConsole({
  lines,
  stdinText,
  onStdinChange
}: {
  lines: string[];
  stdinText: string;
  onStdinChange: (value: string) => void;
}) {
  const visibleLines =
    lines.length === 1 && EMPTY_OUTPUT_MARKERS.has(lines[0].trim()) ? [] : lines;

  return (
    <section
      data-wheel-relay-root
      className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[2rem] border border-[color:var(--editor-panel-border)] bg-[var(--editor-panel-bg)] p-3 shadow-[0_34px_90px_rgba(3,3,12,0.42)]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <textarea
          value={stdinText}
          onChange={(event) => onStdinChange(event.target.value)}
          spellCheck={false}
          placeholder="Enter Input here"
          className="console-box console-input min-h-[92px] w-full resize-none rounded-[0.85rem] border px-3 py-3 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />

        <div className="console-note rounded-[0.9rem] border border-[color:var(--editor-panel-border)] px-3 py-2 text-sm">
          If your code takes input, add it in the above box before running.
        </div>

        <div className="px-1 text-sm font-semibold text-[var(--text-primary)]">Output</div>

        <div className="console-box min-h-0 flex-1 rounded-[0.85rem] border p-3">
          <div
            aria-live="polite"
            className="h-full overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-7"
          >
            {visibleLines.map((line, index) => {
              const tone = getOutputLineTone(line);

              if (tone === "empty") {
                return <div key={`gap-${index}`} className="h-3" />;
              }

              return (
                <div
                  key={`${index}-${line}`}
                  className={cn(
                    "console-output-line",
                    tone === "label" && "console-output-line--label",
                    tone === "number" && "console-output-line--number",
                    tone === "value" && "console-output-line--value"
                  )}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
