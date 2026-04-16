# WASM Asset Folder

This directory is managed automatically by the Diamond asset sync workflow.

## Purpose

It stores the browser-deliverable WebAssembly compiler bundle used by the IDE.

## Expected Files

- `diamond.js`
- `diamond.wasm`

## How To Refresh The Bundle

```powershell
# Preferred: rebuild the compiler and copy assets
cd diamond-compiler
.\build-wasm.ps1

# Or resync an existing build into the IDE
npm --prefix diamond-ide run sync:wasm
```

The matching worker file is stored separately at `diamond-ide/public/workers/diamond-wasm-worker.js`.
