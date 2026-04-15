import {
  Bug,
  Cpu,
  Download,
  FileText,
  FileInput,
  FolderOpen,
  Keyboard,
  LayoutDashboard,
  MoonStar,
  Play,
  RefreshCcw,
  SunMedium,
  Wand2
} from "lucide-react";
import Image from "next/image";

import type { ThemeMode } from "../../../lib/ide-types";
import { DIAMOND_TEMPLATES } from "../../../lib/templates";

import { ToolbarIconButton } from "./toolbar-icon-button";

export function WorkspaceHeader({
  actionBusy,
  canUndoReplace,
  compileBusy,
  customTemplateSelected,
  onCompile,
  onFormat,
  onOpenCheatsheet,
  onOpenFile,
  onOpenShortcuts,
  onDownload,
  onExportHtml,
  onRun,
  onScrollToAnalysis,
  onStartDebug,
  onTemplateChange,
  onToggleTheme,
  onUndoReplace,
  runBusy,
  selectedTemplate,
  themeMode
}: {
  actionBusy: boolean;
  canUndoReplace: boolean;
  compileBusy: boolean;
  customTemplateSelected: boolean;
  onCompile: () => void;
  onFormat: () => void;
  onOpenCheatsheet: () => void;
  onOpenFile: () => void;
  onOpenShortcuts: () => void;
  onDownload: () => void;
  onExportHtml: () => void;
  onRun: () => void;
  onScrollToAnalysis: () => void;
  onStartDebug: () => void;
  onTemplateChange: (templateId: string) => void;
  onToggleTheme: () => void;
  onUndoReplace: () => void;
  runBusy: boolean;
  selectedTemplate: string;
  themeMode: ThemeMode;
}) {
  return (
    <header className="mx-4 mb-4 mt-4 rounded-[2rem] border border-[color:var(--header-shell-border)] bg-[var(--header-shell-bg)] px-4 py-4 shadow-[0_22px_70px_rgba(4,3,17,0.34)] backdrop-blur-[24px]">
      <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-4 rounded-[1.6rem] border border-[color:var(--header-brand-border)] bg-[var(--header-brand-bg)] px-4 py-3 shadow-[0_18px_48px_rgba(3,3,12,0.28)]">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] bg-[var(--header-brand-icon-bg)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_rgba(0,0,0,0.22)]">
            <div className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[var(--header-brand-icon-inner-bg)] p-1.5">
              <Image
                src="/diamond-logo.png"
                alt="Diamond Compiler logo"
                width={44}
                height={40}
                priority
                className="h-auto w-full object-contain"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="diamond-brand diamond-brand--header" aria-label="Diamond Compiler">
              <span className="diamond-brand-word diamond-brand-word--light">Diamond</span>
              <span className="diamond-brand-word diamond-brand-word--accent">Compiler</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-pressed={themeMode === "light"}
            title={themeMode === "dark" ? "Switch to light theme (Ctrl+J)" : "Switch to dark theme (Ctrl+J)"}
            aria-label={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[color:var(--toolbar-ghost-border)] bg-[var(--toolbar-ghost-bg)] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition duration-200 hover:translate-y-[-2px] hover:border-[color:var(--toolbar-ghost-hover-border)] hover:bg-[var(--toolbar-ghost-hover-bg)] hover:text-[var(--text-primary)]"
          >
            {themeMode === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
          </button>
        </div>

        <label className="flex h-14 min-w-[15rem] items-center gap-3 rounded-[1.2rem] border border-[color:var(--toolbar-ghost-border)] bg-[var(--header-select-bg)] px-4 text-xs text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <span className="shrink-0 uppercase tracking-[0.24em] text-[var(--text-muted)]">Template</span>
          <select
            value={customTemplateSelected ? "" : selectedTemplate}
            onChange={(event) => onTemplateChange(event.target.value)}
            className="min-w-0 flex-1 truncate bg-transparent text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)] outline-none"
          >
            {customTemplateSelected ? (
              <option value="" className="bg-[var(--select-bg)]">
                Custom file
              </option>
            ) : null}
            {DIAMOND_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id} className="bg-[var(--select-bg)]">
                {template.label}
              </option>
            ))}
          </select>
        </label>

        {canUndoReplace ? (
          <button
            onClick={onUndoReplace}
            title="Restore the previous source snapshot"
            className="inline-flex h-12 items-center gap-2 rounded-[1rem] border border-[color:rgba(200,71,93,0.14)] bg-[rgba(88,38,60,0.28)] px-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--warning-text)] transition duration-200 hover:translate-y-[-2px] hover:border-[color:rgba(200,71,93,0.28)] hover:bg-[rgba(88,38,60,0.4)]"
          >
            <RefreshCcw size={13} />
            Undo
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          <ToolbarIconButton title="Format Code (Alt+Shift+F)" onClick={onFormat}>
            <Wand2 size={14} />
          </ToolbarIconButton>
          <ToolbarIconButton title="Debug current program" onClick={onStartDebug} disabled={actionBusy}>
            <Bug size={14} />
          </ToolbarIconButton>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCompile}
            disabled={actionBusy}
            title="Compile source (Ctrl+Shift+Enter)"
            className="inline-flex h-12 items-center gap-2 rounded-[1.2rem] bg-[linear-gradient(90deg,#a97eff,#be99ff)] px-5 text-sm font-semibold text-[var(--accent-strong-ink)] shadow-[0_0_24px_rgba(190,153,255,0.22)] transition duration-200 hover:translate-y-[-2px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Cpu size={14} />
            {compileBusy ? "Compiling…" : "Compile"}
          </button>
          <button
            onClick={onRun}
            disabled={actionBusy}
            title="Run program (Ctrl+Enter)"
            className="inline-flex h-12 items-center gap-2 rounded-[1.2rem] bg-[linear-gradient(90deg,#2aa79b,#66d9cc)] px-5 text-sm font-semibold text-[var(--success-strong-ink)] shadow-[0_0_24px_rgba(102,217,204,0.16)] transition duration-200 hover:translate-y-[-2px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={14} />
            {runBusy ? "Running…" : "Run"}
          </button>
        </div>

        <button
          onClick={onScrollToAnalysis}
          className="inline-flex h-12 items-center gap-2 rounded-[1.1rem] border border-[color:var(--toolbar-ghost-border)] bg-[var(--toolbar-ghost-bg)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition duration-200 hover:translate-y-[-2px] hover:border-[color:var(--toolbar-ghost-hover-border)] hover:bg-[var(--toolbar-ghost-hover-bg)] hover:text-[var(--text-primary)]"
          title="Jump to analysis tools"
        >
          <LayoutDashboard size={14} />
          Analysis
        </button>

        <div className="ml-auto flex items-center gap-2">
          <ToolbarIconButton title="Open source file (Ctrl+O)" onClick={onOpenFile}>
            <FolderOpen size={14} />
          </ToolbarIconButton>
          <ToolbarIconButton title="Download source (Ctrl+S)" onClick={onDownload}>
            <Download size={14} />
          </ToolbarIconButton>
          <ToolbarIconButton title="Export HTML report (Ctrl+Shift+E)" onClick={onExportHtml}>
            <FileInput size={14} />
          </ToolbarIconButton>
          <ToolbarIconButton title="Cheatsheet" onClick={onOpenCheatsheet}>
            <FileText size={14} />
          </ToolbarIconButton>
          <ToolbarIconButton title="Keyboard Shortcuts (Ctrl+/)" onClick={onOpenShortcuts}>
            <Keyboard size={14} />
          </ToolbarIconButton>
        </div>
      </div>
    </header>
  );
}
