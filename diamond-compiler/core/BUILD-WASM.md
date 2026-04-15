## Building the Diamond compiler to WebAssembly

The WebAssembly bundle is consumed by the production IDE in `diamond-ide`. The preferred flow is:

1. Build the compiler bundle from `diamond-compiler/core`
2. Let the scripts copy the generated files into each frontend automatically

Current frontend targets:

```text
diamond-ide/public/wasm/diamond.js
diamond-ide/public/wasm/diamond.wasm
diamond-ide/public/workers/diamond-wasm-worker.js
```

If the bundle is missing, the frontends fall back to demo analysis mode.

## 1. Install prerequisites

You need:

- **Emscripten SDK** with `emcc`
- **Flex / Bison** or **winflexbison**

Official Emscripten install guide:

https://emscripten.org/docs/getting_started/downloads.html

After activation, `emcc` should be available in your shell.

## 2. One-command Windows build

From `diamond-compiler/`:

```powershell
.\build-wasm.ps1 `
  -EmscriptenDir "C:\path\to\emsdk\upstream\emscripten" `
  -WinFlexBisonDir "C:\path\to\winflexbison"
```

If your tools are already on `PATH`, you can simply run:

```powershell
.\build-wasm.ps1
```

What the script does:

1. Regenerates `parser.tab.c/.h` from `parser.y`
2. Regenerates `lex.yy.c` from `lexer.l`
3. Compiles the compiler core with `emcc`
4. Copies `diamond.js` and `diamond.wasm` into the active frontend `public/wasm/` target
5. Copies `diamond-wasm-worker.js` into `diamond-ide/public/workers/`

Use `-SkipCopy` if you only want the artifacts in `diamond-compiler/core/`.

## 3. Sync an existing compiler build into `diamond-ide`

If `diamond-compiler/core/diamond.js` and `diamond-compiler/core/diamond.wasm` already exist:

```powershell
cd ..\diamond-ide
npm run sync:wasm
```

This copies the WASM bundle into `diamond-ide/public/wasm/`, installs the worker into `diamond-ide/public/workers/`, and removes stale duplicate root-level files from `diamond-ide/public/`.

## 4. Manual build

From `diamond-compiler/core/`:

```bash
bison -d parser.y
flex lexer.l
emcc lex.yy.c parser.tab.c ast.c symtab.c tac.c driver.c \
  -O2 -DDIAMOND_WASM \
  -s EXPORTED_FUNCTIONS='["_diamond_compile","_diamond_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='"DiamondModule"' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT='web,worker' \
  -o diamond.js
```

After a manual build, either copy the files into the frontend targets yourself or run:

```powershell
cd ..\..\diamond-ide
npm run sync:wasm
```

## 5. Verifying the WASM path

After building the bundle:

1. Start the IDE:

```powershell
cd ..\..\diamond-ide
npm run dev
```

2. Open the browser workspace.
3. Compile any template.
4. Confirm the UI reports that the WASM compiler is active instead of demo mode.
