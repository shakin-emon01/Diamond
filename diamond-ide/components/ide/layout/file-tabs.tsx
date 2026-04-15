"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Pencil, Plus, X } from "lucide-react";

import { cn } from "../../../lib/ide-utils";

export type FileTab = {
  id: string;
  filename: string;
  code: string;
  savedCode: string;
  result: any;
  stdinText: string;
  isDirty: boolean;
  sourceLabel: string;
  selectedTemplate: string;
};

export function FileTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onTabRename
}: {
  tabs: FileTab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  onTabRename: (id: string, nextName: string) => void;
}) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editingTabId) {
      return;
    }

    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [editingTabId]);

  function beginRename(tab: FileTab) {
    setEditingTabId(tab.id);
    setDraftName(tab.filename);
  }

  function cancelRename() {
    setEditingTabId(null);
    setDraftName("");
  }

  function commitRename(tab: FileTab) {
    onTabRename(tab.id, draftName || tab.filename);
    cancelRename();
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--tab-strip-border)] bg-[var(--tab-strip-bg)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;

          return (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              onDoubleClick={() => beginRename(tab)}
              className={cn(
                "group relative flex shrink-0 cursor-pointer items-center gap-2 rounded-[0.95rem] border px-3 py-2 text-sm transition",
                isActive
                  ? "border-[color:var(--tab-active-border)] bg-[var(--tab-active-bg)] text-[var(--text-primary)] shadow-[0_12px_28px_rgba(0,0,0,0.2)]"
                  : "border-transparent bg-[var(--tab-inactive-bg)] text-[var(--tab-inactive-text)] hover:bg-[var(--tab-inactive-hover-bg)] hover:text-[var(--text-secondary)]"
              )}
            >
              {isActive ? (
                <span className="absolute inset-x-2 top-0 h-[2px] rounded-full bg-[var(--accent-strong)] shadow-[0_0_18px_rgba(190,153,255,0.45)]" />
              ) : null}

              <FileText
                size={13}
                className={cn(isActive ? "text-[var(--accent-strong)]" : "text-[var(--tab-inactive-text)]")}
              />
              {isEditing ? (
                <input
                  ref={renameInputRef}
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={() => commitRename(tab)}
                  onKeyDown={(event) => {
                    event.stopPropagation();

                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitRename(tab);
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelRename();
                    }
                  }}
                  className="w-[11rem] max-w-[11rem] rounded-md border border-[color:var(--tab-active-border)] bg-[var(--editor-surface-bg)] px-2 py-1 text-sm font-semibold text-[var(--text-primary)] outline-none"
                  aria-label={`Rename ${tab.filename}`}
                />
              ) : (
                <span className="max-w-[10rem] truncate font-semibold uppercase tracking-[0.12em]">{tab.filename}</span>
              )}
              {tab.isDirty ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-strong)] shadow-[0_0_14px_rgba(190,153,255,0.6)]" />
              ) : null}

              {!isEditing ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    beginRename(tab);
                  }}
                  title={`Rename ${tab.filename}`}
                  aria-label={`Rename ${tab.filename}`}
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
                    isActive
                      ? "text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-text)]"
                      : "text-[var(--tab-inactive-text)] opacity-0 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-text)] group-hover:opacity-100"
                  )}
                >
                  <Pencil size={11} />
                </button>
              ) : null}

              {tabs.length > 1 && !isEditing ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  title={`Close ${tab.filename}`}
                  aria-label={`Close ${tab.filename}`}
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
                    isActive
                      ? "text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)]"
                      : "text-[var(--tab-inactive-text)] opacity-0 hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)] group-hover:opacity-100"
                  )}
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)] md:inline-flex">
          Diamond Source
        </span>
        <button
          onClick={onNewTab}
          title="New file"
          aria-label="New file"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[0.9rem] border border-[color:rgba(190,153,255,0.14)] bg-[rgba(255,255,255,0.04)] text-[var(--accent-strong)] transition duration-200 hover:translate-y-[-1px] hover:border-[color:rgba(190,153,255,0.28)] hover:bg-[rgba(190,153,255,0.08)]"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
