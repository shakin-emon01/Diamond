"use client";

import type { MemoryEntry, CallStackFrame } from "./debug-runtime";

/* ──────────────── Memory Panel ──────────────── */

export function MemoryPanel({
    memory,
    callStack
}: {
    memory: MemoryEntry[];
    callStack: CallStackFrame[];
}) {
    return (
        <div className="flex h-full flex-col gap-4 overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
            {/* Call Stack */}
            <div>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Call Stack
                </div>
                <div className="flex flex-col gap-1.5">
                    {callStack.map((frame, i) => (
                        <div
                            key={`${frame.name}-${i}`}
                            className="callstack-frame flex items-center justify-between rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] px-3 py-2"
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                                <span className="text-sm font-medium text-[var(--text-primary)]">{frame.name}()</span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">line {frame.line}</span>
                        </div>
                    ))}
                    {callStack.length === 0 && (
                        <div className="text-xs italic text-[var(--text-muted)]">No active frames</div>
                    )}
                </div>
            </div>

            {/* Memory Table */}
            <div className="flex-1 min-h-0">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Variables
                </div>
                {memory.length > 0 ? (
                    <div className="grid gap-2">
                        {memory.map((entry, i) => (
                            <div
                                key={`${entry.scope}-${entry.name}-${i}`}
                                className={`memory-box rounded-xl border px-3 py-2.5 transition-all duration-300 ${entry.changed
                                        ? "border-[color:var(--warning-border)] bg-[var(--warning-soft)] memory-glow"
                                        : "border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)]"
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{entry.name}</span>
                                        <span className="shrink-0 rounded-lg bg-[var(--panel-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                                            {entry.type}
                                        </span>
                                    </div>
                                    <span className="shrink-0 rounded-lg bg-[var(--panel-bg)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                                        {entry.scope}
                                    </span>
                                </div>
                                <div className="mt-1.5 break-all font-mono text-sm text-[var(--success-text)]">
                                    {entry.value || <span className="italic text-[var(--text-muted)]">empty</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)]/60 p-8 text-center">
                        <div>
                            <div className="text-sm font-semibold text-[var(--text-primary)]">No variables yet</div>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                                Step through the program to see variables appear here.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ──────────────── Debug Controls ──────────────── */

export function DebugControls({
    stepIndex,
    totalSteps,
    isPlaying,
    onStepBack,
    onStepForward,
    onPlayPause,
    onReset,
    onStop,
    speed,
    onSpeedChange,
    currentAction
}: {
    stepIndex: number;
    totalSteps: number;
    isPlaying: boolean;
    onStepBack: () => void;
    onStepForward: () => void;
    onPlayPause: () => void;
    onReset: () => void;
    onStop: () => void;
    speed: number;
    onSpeedChange: (speed: number) => void;
    currentAction: string;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] px-4 py-3 backdrop-blur">
            {/* Title & Progress */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)] animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-primary)]">
                        Debugger
                    </span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                    Step <span className="font-semibold text-[var(--text-primary)]">{stepIndex + 1}</span>{" "}
                    <span>of</span>{" "}
                    <span className="font-semibold text-[var(--text-primary)]">{totalSteps}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-bg)]">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-amber-400 transition-all duration-300"
                    style={{ width: totalSteps > 0 ? `${((stepIndex + 1) / totalSteps) * 100}%` : "0%" }}
                />
            </div>

            {/* Action description */}
            <div className="min-h-[32px] rounded-xl bg-[var(--panel-bg)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
                {currentAction || "Ready to step through code..."}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={onReset}
                    className="rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--panel-hover-bg)]"
                    title="Reset to start"
                >
                    ⏮ Reset
                </button>
                <button
                    onClick={onStepBack}
                    disabled={stepIndex <= 0}
                    className="rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--panel-hover-bg)] disabled:opacity-40"
                    title="Step back"
                >
                    ◀ Back
                </button>
                <button
                    onClick={onPlayPause}
                    className="rounded-xl bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-400"
                    title={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? "⏸ Pause" : "▶ Play"}
                </button>
                <button
                    onClick={onStepForward}
                    disabled={stepIndex >= totalSteps - 1}
                    className="rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--panel-hover-bg)] disabled:opacity-40"
                    title="Step forward"
                >
                    Next ▶
                </button>
                <button
                    onClick={onStop}
                    className="rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-3 py-1.5 text-xs font-medium text-[var(--danger-text)] transition hover:opacity-90"
                    title="Exit debugger"
                >
                    ✕ Exit
                </button>
            </div>

            {/* Speed slider */}
            <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Speed</span>
                <input
                    type="range"
                    min={100}
                    max={2000}
                    step={100}
                    value={2100 - speed}
                    onChange={(e) => onSpeedChange(2100 - Number(e.target.value))}
                    className="h-1 flex-1 appearance-none rounded-full bg-[var(--panel-bg)] accent-violet-400"
                />
                <span className="w-12 text-right text-[10px] text-[var(--text-muted)]">{speed}ms</span>
            </div>
        </div>
    );
}
