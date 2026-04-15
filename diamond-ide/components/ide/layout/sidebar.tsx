"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  FileInput,
  FileText,
  FolderOpen,
  Plus,
  Printer,
  Share2,
  SquareTerminal,
  X
} from "lucide-react";

import type { DiamondSymbol } from "../../../lib/types";
import { cn } from "../../../lib/ide-utils";

export type SidebarSection = "files" | "symbols" | "share";

export type SidebarTab = {
  id: string;
  filename: string;
  isDirty: boolean;
};

const NAV_ITEMS: {
  id: SidebarSection;
  label: string;
  caption: string;
  icon: ReactNode;
}[] = [
  {
    id: "files",
    label: "Editor",
    caption: "Open files and active buffers",
    icon: <FolderOpen size={18} />
  },
  {
    id: "symbols",
    label: "Analysis",
    caption: "Functions, variables, and scope hints",
    icon: <Code2 size={18} />
  },
  {
    id: "share",
    label: "Library",
    caption: "Download and export reports",
    icon: <Share2 size={18} />
  }
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  symbols,
  onSymbolClick,
  onDownload,
  onExportHtml,
  onExportPdf
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  tabs: SidebarTab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  symbols: DiamondSymbol[];
  onSymbolClick: (line: number) => void;
  onDownload: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
}) {
  const [activeSection, setActiveSection] = useState<SidebarSection>("files");

  const functionSymbols = useMemo(
    () => symbols.filter((symbol) => symbol.kind === "function" && !symbol.builtin),
    [symbols]
  );
  const variableSymbols = useMemo(
    () => symbols.filter((symbol) => symbol.kind !== "function" || symbol.builtin),
    [symbols]
  );

  function handleSectionSelect(section: SidebarSection) {
    if (collapsed) {
      onToggleCollapse();
    }
    setActiveSection(section);
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col rounded-[2rem] border border-[color:rgba(190,153,255,0.12)] bg-[linear-gradient(180deg,rgba(18,16,41,0.96),rgba(10,10,27,0.96))] shadow-[0_28px_80px_rgba(3,3,12,0.42)] backdrop-blur-[26px] transition-[width] duration-300",
        collapsed ? "w-[84px]" : "w-[290px]"
      )}
    >
      <div className={cn("border-b border-[color:rgba(190,153,255,0.1)]", collapsed ? "px-3 py-4" : "px-5 py-5")}>
        <div className={cn("flex items-start justify-between gap-3", collapsed && "flex-col items-center")}>
          <div className={cn("flex items-center gap-4", collapsed && "flex-col gap-3")}>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[color:rgba(190,153,255,0.18)] bg-[linear-gradient(180deg,rgba(35,31,73,0.98),rgba(21,18,48,0.98))] text-[var(--accent-strong)] shadow-[0_0_28px_rgba(190,153,255,0.18)]">
              <SquareTerminal size={20} />
            </div>

            {!collapsed ? (
              <div className="min-w-0">
                <p className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Compiler
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">V2.0.4</p>
              </div>
            ) : null}
          </div>

          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:rgba(190,153,255,0.14)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)] transition hover:border-[color:rgba(190,153,255,0.24)] hover:text-[var(--text-primary)]"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      <div className={cn("flex-1", collapsed ? "px-3 py-4" : "px-4 py-5")}>
        <div className={cn("flex", collapsed ? "h-full flex-col items-center gap-3" : "h-full flex-col gap-4")}>
          {!collapsed ? (
            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Workspace
              </p>
              <div className="mt-3 space-y-2">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionSelect(item.id)}
                      className={cn(
                        "relative flex w-full items-center gap-3 overflow-hidden rounded-[1rem] px-4 py-3 text-left transition duration-200 hover:translate-y-[-1px]",
                        isActive
                          ? "bg-[linear-gradient(90deg,rgba(65,62,121,0.88),rgba(43,40,88,0.88))] text-[var(--text-primary)] shadow-[0_14px_32px_rgba(8,8,25,0.22)]"
                          : "text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-secondary)]"
                      )}
                    >
                      {isActive ? (
                        <span className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-[var(--success-strong)] shadow-[0_0_18px_rgba(102,217,204,0.6)]" />
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border transition",
                          isActive
                            ? "border-[color:rgba(102,217,204,0.18)] bg-[rgba(102,217,204,0.08)] text-[var(--success-strong)]"
                            : "border-[color:rgba(190,153,255,0.1)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)]"
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[1.04rem] font-medium tracking-[-0.02em]">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-[11px] leading-5 text-[var(--text-muted)]">
                          {item.caption}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionSelect(item.id)}
                    title={item.label}
                    aria-label={item.label}
                    className={cn(
                      "inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border transition duration-200 hover:translate-y-[-1px]",
                      isActive
                        ? "border-[color:rgba(102,217,204,0.22)] bg-[rgba(68,61,121,0.9)] text-[var(--success-strong)] shadow-[0_14px_32px_rgba(8,8,25,0.22)]"
                        : "border-[color:rgba(190,153,255,0.12)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {item.icon}
                  </button>
                );
              })}
            </>
          )}

          {!collapsed ? (
            <div className="min-h-0 flex-1 overflow-hidden rounded-[1.7rem] border border-[color:rgba(190,153,255,0.1)] bg-[rgba(12,12,31,0.92)]">
              {activeSection === "files" ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-center justify-between border-b border-[color:rgba(190,153,255,0.08)] px-5 py-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--success-strong)]">
                        Active Files
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Studio buffers and source snapshots</p>
                    </div>
                    <button
                      onClick={onNewTab}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[0.9rem] border border-[color:rgba(190,153,255,0.14)] bg-[rgba(255,255,255,0.03)] text-[var(--accent-strong)] transition duration-200 hover:translate-y-[-1px] hover:border-[color:rgba(190,153,255,0.28)]"
                      title="New script"
                      aria-label="New script"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    <div className="space-y-2">
                      {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        return (
                          <div
                            key={tab.id}
                            onClick={() => onTabSelect(tab.id)}
                            className={cn(
                              "group flex cursor-pointer items-center gap-3 rounded-[1.05rem] border px-3 py-3 transition",
                              isActive
                                ? "border-[color:rgba(190,153,255,0.18)] bg-[rgba(57,52,109,0.8)] text-[var(--text-primary)]"
                                : "border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[color:rgba(190,153,255,0.1)] hover:bg-[rgba(255,255,255,0.025)] hover:text-[var(--text-primary)]"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem]",
                                isActive
                                  ? "bg-[rgba(190,153,255,0.14)] text-[var(--accent-strong)]"
                                  : "bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]"
                              )}
                            >
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{tab.filename}</p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                {tab.isDirty ? "Unsaved changes" : "Synced to workspace"}
                              </p>
                            </div>
                            {tabs.length > 1 ? (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onTabClose(tab.id);
                                }}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)] group-hover:opacity-100"
                                title={`Close ${tab.filename}`}
                                aria-label={`Close ${tab.filename}`}
                              >
                                <X size={14} />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {activeSection === "symbols" ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-[color:rgba(190,153,255,0.08)] px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--success-strong)]">
                      Symbol Table
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Functions, variables, and inferred types</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    {symbols.length === 0 ? (
                      <p className="rounded-[1.25rem] border border-dashed border-[color:rgba(190,153,255,0.12)] px-4 py-5 text-sm leading-6 text-[var(--text-muted)]">
                        Compile the program to populate semantic symbols here.
                      </p>
                    ) : (
                      <div className="space-y-5">
                        {functionSymbols.length > 0 ? (
                          <div>
                            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                              Functions
                            </p>
                            <div className="space-y-2">
                              {functionSymbols.map((symbol) => (
                                <button
                                  key={`${symbol.name}-${symbol.line}`}
                                  onClick={() => onSymbolClick(symbol.line)}
                                  className="flex w-full items-center gap-3 rounded-[1rem] border border-[color:rgba(190,153,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-3 text-left transition hover:border-[color:rgba(102,217,204,0.18)] hover:bg-[rgba(102,217,204,0.06)]"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem] bg-[rgba(102,217,204,0.08)] text-[var(--success-strong)]">
                                    <Code2 size={16} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                                      {symbol.name}
                                    </p>
                                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                      Line {symbol.line}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-[rgba(190,153,255,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                                    {symbol.type}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {variableSymbols.length > 0 ? (
                          <div>
                            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--success-strong)]">
                              Variables
                            </p>
                            <div className="space-y-2">
                              {variableSymbols.map((symbol) => (
                                <button
                                  key={`${symbol.name}-${symbol.line}-${symbol.scope}`}
                                  onClick={() => onSymbolClick(symbol.line)}
                                  className="flex w-full items-center gap-3 rounded-[1rem] border border-[color:rgba(190,153,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-3 text-left transition hover:border-[color:rgba(190,153,255,0.18)] hover:bg-[rgba(190,153,255,0.05)]"
                                >
                                  <span
                                    className={cn(
                                      "inline-flex h-3 w-3 shrink-0 rounded-full shadow-[0_0_12px_currentColor]",
                                      symbol.type === "shonkha"
                                        ? "bg-[#66d9cc] text-[#66d9cc]"
                                        : symbol.type === "lekha"
                                          ? "bg-[#be99ff] text-[#be99ff]"
                                          : symbol.type === "shotto"
                                            ? "bg-[#ff7ab6] text-[#ff7ab6]"
                                            : "bg-[#9aa0c8] text-[#9aa0c8]"
                                    )}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                                      {symbol.name}
                                    </p>
                                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                      Scope {symbol.scope}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-[rgba(102,217,204,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--success-strong)]">
                                    {symbol.type}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {activeSection === "share" ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-[color:rgba(190,153,255,0.08)] px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--success-strong)]">
                      Export Hub
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Download source or package analysis output</p>
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-4 px-4 py-4">
                    <div className="space-y-3">
                      <SidebarAction
                        icon={<Download size={16} />}
                        label="Download Source"
                        caption="Save the current Diamond file locally"
                        onClick={onDownload}
                      />
                      <SidebarAction
                        icon={<FileInput size={16} />}
                        label="Export HTML Report"
                        caption="Capture the studio output as a browser report"
                        onClick={onExportHtml}
                      />
                      <SidebarAction
                        icon={<Printer size={16} />}
                        label="Print PDF Report"
                        caption="Open the printable version for PDF export"
                        onClick={onExportPdf}
                      />
                    </div>

                    <div className="rounded-[1.35rem] border border-[color:rgba(102,217,204,0.14)] bg-[rgba(102,217,204,0.06)] px-4 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--success-strong)]">
                        Share-Ready
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        Exports preserve the compiler visuals and diagnostics without changing your workspace state.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-auto">
              <button
                onClick={onNewTab}
                title="New script"
                aria-label="New script"
                className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#9f7aff,#be99ff)] text-[var(--accent-strong-ink)] shadow-[0_14px_32px_rgba(190,153,255,0.26)] transition duration-200 hover:translate-y-[-1px]"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {!collapsed ? (
        <div className="border-t border-[color:rgba(190,153,255,0.1)] px-4 py-4">
          <button
            onClick={onNewTab}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[linear-gradient(135deg,#9f7aff,#be99ff)] px-4 py-3.5 text-sm font-semibold tracking-[-0.02em] text-[var(--accent-strong-ink)] shadow-[0_18px_38px_rgba(190,153,255,0.22)] transition duration-200 hover:translate-y-[-1px]"
          >
            <Plus size={18} />
            New Script
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function SidebarAction({
  caption,
  icon,
  label,
  onClick
}: {
  caption: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[1.15rem] border border-[color:rgba(190,153,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-left transition hover:border-[color:rgba(190,153,255,0.18)] hover:bg-[rgba(190,153,255,0.06)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(190,153,255,0.12)] text-[var(--accent-strong)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{caption}</p>
      </div>
    </button>
  );
}
