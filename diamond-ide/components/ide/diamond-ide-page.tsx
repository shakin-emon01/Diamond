"use client";

import { useEffect, useRef, useState } from "react";

import { configureDiamondMonaco, getDiamondEditorTheme } from "../../lib/diamond-language";

import { BootSplash } from "./boot-splash";
import { useDiamondIde } from "./hooks/use-diamond-ide";
import { useWheelScrollRelay } from "./hooks/use-wheel-scroll-relay";
import { BottomConsole } from "./layout/bottom-console";
import { EditorPane } from "./layout/editor-pane";
import { StatusBar } from "./layout/status-bar";
import { WorkspaceHeader } from "./layout/workspace-header";
import { CheatsheetModal } from "./modals/cheatsheet-modal";
import { ShortcutsModal } from "./modals/shortcuts-modal";
import { AnalysisPane } from "./panels/analysis-pane";

export function DiamondIdePage() {
  const [showBootSplash, setShowBootSplash] = useState(true);
  const [bootSplashLeaving, setBootSplashLeaving] = useState(false);
  const analysisSectionRef = useRef<HTMLElement | null>(null);
  useWheelScrollRelay();

  const {
    actionBusy,
    activeChallenge,
    activeChallengeReport,
    activePanel,
    activeTabId,
    challengeReportStale,
    code,
    compileBusy,
    currentSnap,
    customTemplateSelected,
    dashboardTab,
    debugError,
    debugSnapshots,
    debugSpeed,
    debugStepIndex,
    displayLines,
    fileInputRef,
    handleChallengeSelect,
    handleDebugPlayPause,
    handleDebugReset,
    handleDebugStepBack,
    handleDebugStepForward,
    handleDebugStop,
    handleEditorMount,
    handleFormatCode,
    handleLoadChallenge,
    handleNewTab,
    handleOpenFile,
    handleRunProgram,
    handleStartDebug,
    handleTabClose,
    handleTabRename,
    handleTabSelect,
    handleTemplateChange,
    isDebugPlaying,
    isDebugging,
    openTabs,
    result,
    runBusy,
    showChallengeConfetti,
    showCheatsheet,
    showShortcuts,
    stdinText,
    suiteBusy,
    suiteLastRunAt,
    suiteResults,
    templateUndoStack,
    themeMode,
    usingWasm,
    closeModals,
    downloadSource,
    exportReportHtml,
    focusEditorLine,
    requestOpenFileDialog,
    runCompilation,
    runEmbeddedTestSuite,
    selectedTemplate,
    setActivePanel,
    setCode,
    setDashboardTab,
    setDebugSpeed,
    setShowCheatsheet,
    setShowShortcuts,
    setStdinText,
    toggleTheme,
    undoSourceReplace
  } = useDiamondIde();

  function scrollToAnalysisSection() {
    analysisSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fadeDelay = prefersReducedMotion ? 900 : 1900;
    const removeDelay = prefersReducedMotion ? 1200 : 2500;

    const fadeTimer = window.setTimeout(() => setBootSplashLeaving(true), fadeDelay);
    const removeTimer = window.setTimeout(() => setShowBootSplash(false), removeDelay);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return (
    <div suppressHydrationWarning className="studio-shell">
      <div aria-hidden className="studio-shell__orb studio-shell__orb--violet" />
      <div aria-hidden className="studio-shell__orb studio-shell__orb--teal" />
      <div aria-hidden className="studio-shell__mesh" />
      <div aria-hidden className="studio-shell__grain" />

      <div className="relative z-10 text-[var(--text-primary)]">
        <section className="flex min-h-screen flex-col pb-4">
          <WorkspaceHeader
            actionBusy={actionBusy}
            canUndoReplace={templateUndoStack.length > 0}
            compileBusy={compileBusy}
            customTemplateSelected={customTemplateSelected}
            onCompile={() => void runCompilation(code, "manual")}
            onFormat={handleFormatCode}
            onOpenCheatsheet={() => setShowCheatsheet(true)}
            onOpenFile={requestOpenFileDialog}
            onOpenShortcuts={() => setShowShortcuts(true)}
            onDownload={downloadSource}
            onExportHtml={exportReportHtml}
            onRun={() => void handleRunProgram()}
            onScrollToAnalysis={scrollToAnalysisSection}
            onStartDebug={() => void handleStartDebug()}
            onTemplateChange={handleTemplateChange}
            onToggleTheme={toggleTheme}
            onUndoReplace={undoSourceReplace}
            runBusy={runBusy}
            selectedTemplate={selectedTemplate}
            themeMode={themeMode}
          />

          <div className="grid min-h-0 flex-1 gap-4 px-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.6fr)]">
            <section className="min-h-[460px] lg:min-h-0">
              <EditorPane
                code={code}
                editorTheme={getDiamondEditorTheme(themeMode)}
                beforeMount={configureDiamondMonaco}
                onMount={handleEditorMount}
                onChange={setCode}
                tabs={openTabs}
                activeTabId={activeTabId}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
                onTabRename={handleTabRename}
              />
            </section>

            <section className="min-h-[460px] lg:min-h-0">
              <BottomConsole
                lines={displayLines}
                stdinText={stdinText}
                onStdinChange={setStdinText}
              />
            </section>
          </div>

          <StatusBar
            errorCount={result?.meta?.errorCount ?? 0}
            symbolCount={result?.meta?.symbolCount ?? 0}
            tokenCount={result?.meta?.tokenCount ?? 0}
            usingWasm={usingWasm}
          />
        </section>

        <section ref={analysisSectionRef} className="px-4 pb-6 pt-2">
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex h-11 items-center gap-2 rounded-[1rem] border border-[color:rgba(190,153,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition duration-200 hover:translate-y-[-2px] hover:border-[color:rgba(190,153,255,0.28)] hover:bg-[rgba(190,153,255,0.08)] hover:text-[var(--text-primary)]"
            >
              Back to Editor
            </button>
          </div>

          <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
            <main className="min-h-0 min-w-0 flex-1">
              <AnalysisPane
                actionBusy={actionBusy}
                activeChallenge={activeChallenge}
                activeChallengeReport={activeChallengeReport}
                activePanel={activePanel}
                challengeReportStale={challengeReportStale}
                code={code}
                currentSnap={currentSnap}
                dashboardTab={dashboardTab}
                debugError={debugError}
                debugSnapshots={debugSnapshots}
                debugSpeed={debugSpeed}
                debugStepIndex={debugStepIndex}
                isDebugPlaying={isDebugPlaying}
                isDebugging={isDebugging}
                onApplyChallengeInput={setStdinText}
                onDebugPlayPause={handleDebugPlayPause}
                onDebugReset={handleDebugReset}
                onDebugStepBack={handleDebugStepBack}
                onDebugStepForward={handleDebugStepForward}
                onDebugStop={handleDebugStop}
                onFocusEditorLine={focusEditorLine}
                onLoadChallenge={handleLoadChallenge}
                onRunChallenge={() => void handleRunProgram()}
                onRunSuite={() => void runEmbeddedTestSuite()}
                onSelectChallenge={handleChallengeSelect}
                onSetActivePanel={setActivePanel}
                onSetDashboardTab={setDashboardTab}
                onSetDebugSpeed={setDebugSpeed}
                result={result}
                showChallengeConfetti={showChallengeConfetti}
                suiteBusy={suiteBusy}
                suiteLastRunAt={suiteLastRunAt}
                suiteResults={suiteResults}
              />
            </main>
          </div>
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".diu,.txt,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleOpenFile(file);
        }}
      />

      {showCheatsheet ? <CheatsheetModal onClose={closeModals} /> : null}
      {showShortcuts ? <ShortcutsModal onClose={closeModals} /> : null}

      {showBootSplash ? <BootSplash overlay leaving={bootSplashLeaving} /> : null}
    </div>
  );
}
