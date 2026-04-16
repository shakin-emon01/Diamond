# Building Diamond To WebAssembly

This guide explains how to build the compiler core into WebAssembly and make it available to the `diamond-ide` frontend.

## Purpose

The generated bundle lets the browser compile Diamond code without requiring a server for the normal classroom workflow.

Expected generated assets:

- `diamond-compiler/core/diamond.js`
- `diamond-compiler/core/diamond.wasm`
- `diamond-ide/public/wasm/diamond.js`
- `diamond-ide/public/wasm/diamond.wasm`
- `diamond-ide/public/workers/diamond-wasm-worker.js`

## Prerequisites

- Emscripten SDK with `emcc`
- Flex and Bison, or WinFlexBison on Windows
- Node.js for asset sync scripts

## Preferred Windows Build

From `diamond-compiler/`:

```powershell
.\build-wasm.ps1
```

If your toolchain is not on `PATH`, provide explicit locations:

```powershell
.\build-wasm.ps1 `
  -EmscriptenDir "C:\path\to\emsdk\upstream\emscripten" `
  -WinFlexBisonDir "C:\path\to\winflexbison"
```

## What The Script Does

1. regenerates `parser.tab.c` and `parser.tab.h` from `parser.y`
2. regenerates `lex.yy.c` from `lexer.l`
3. compiles the compiler with `emcc`
4. copies the generated WASM assets into `diamond-ide/public/wasm/`
5. copies the browser worker into `diamond-ide/public/workers/`

Use `-SkipCopy` if you only want the build artifacts inside `diamond-compiler/core/`.

## Sync An Existing Build Into The IDE

If `diamond.js` and `diamond.wasm` already exist under `diamond-compiler/core/`, run:

```powershell
cd ..\diamond-ide
npm run sync:wasm
```

This refreshes the frontend assets and removes stale root-level copies from `diamond-ide/public/`.

## Manual Build

From `diamond-compiler/core/`:

```bash
bison -d parser.y
flex lexer.l
emcc lex.yy.c parser.tab.c ast.c preprocess.c symtab.c tac.c driver.c \
  -O2 -DDIAMOND_WASM \
  -s EXPORTED_FUNCTIONS='["_diamond_compile","_diamond_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='"DiamondModule"' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT='web,worker' \
  -o diamond.js
```

After a manual build, sync the files into the IDE:

```powershell
cd ..\..\diamond-ide
npm run sync:wasm
```

## Verification

1. start the IDE with `npm run dev` inside `diamond-ide`
2. open the browser IDE
3. compile a template program
4. confirm the IDE reports real compiler output instead of demo fallback behavior

## Notes

- the IDE prefers a Web Worker WASM compiler first, then main-thread WASM
- if both WASM paths fail, the frontend can fall back to the backend API and then demo mode
- files inside `diamond-ide/public/wasm/` are generated assets and should not be edited manually
