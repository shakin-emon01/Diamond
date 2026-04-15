"use client";

import Editor from "@monaco-editor/react";

import { FileTabs, type FileTab } from "./file-tabs";

export function EditorPane({
  code,
  editorTheme,
  onChange,
  onMount,
  beforeMount,
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onTabRename
}: {
  code: string;
  editorTheme: string;
  onChange: (value: string) => void;
  onMount: (editor: any, monaco: any) => void;
  beforeMount: (monaco: any) => void;
  tabs: FileTab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  onTabRename: (id: string, nextName: string) => void;
}) {
  return (
    <section
      data-wheel-relay-root
      className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[2rem] border border-[color:var(--editor-panel-border)] bg-[var(--editor-panel-bg)] shadow-[0_34px_90px_rgba(3,3,12,0.42)]"
    >
      <FileTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onNewTab={onNewTab}
        onTabRename={onTabRename}
      />

      <div className="relative min-h-0 flex-1 bg-[var(--editor-surface-bg)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-20 bg-[linear-gradient(180deg,rgba(190,153,255,0.08),rgba(190,153,255,0))]"
        />
        <Editor
          height="100%"
          language="diamond"
          theme={editorTheme}
          value={code}
          beforeMount={beforeMount}
          onMount={onMount}
          onChange={(value) => onChange(value ?? "")}
          options={{
            fontSize: 15,
            fontLigatures: true,
            minimap: { enabled: false },
            roundedSelection: true,
            padding: { top: 24, bottom: 28 },
            scrollBeyondLastLine: false,
            cursorBlinking: "smooth",
            smoothScrolling: true,
            quickSuggestions: { other: true, comments: false, strings: false },
            snippetSuggestions: "top",
            suggestOnTriggerCharacters: true,
            tabCompletion: "on",
            wordWrap: "on",
            glyphMargin: true,
            renderLineHighlight: "gutter",
            lineNumbersMinChars: 2,
            overviewRulerLanes: 0,
            scrollbar: {
              alwaysConsumeMouseWheel: false
            }
          }}
        />
      </div>

      <div className="border-t border-[color:var(--editor-panel-border)] bg-[var(--editor-footer-bg)] px-4 py-3 text-[11px] font-medium tracking-[0.03em] text-[var(--text-muted)]">
        Tip: Scroll down to inspect AST, flowchart, symbols, challenges, and export tools.
      </div>
    </section>
  );
}
