<p align="center">
  <img src="https://img.shields.io/badge/Language-Diamond-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Compiler-Flex%20%2B%20Bison-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/IDE-Next.js-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Runtime-WebAssembly-blueviolet?style=for-the-badge&logo=webassembly" />
</p>

# 💎 Diamond — A Bengali-Flavoured Programming Language & Compiler

**Diamond** is a custom-designed, beginner-friendly educational programming language with **Bengali-inspired keywords** and a clean, consistent syntax. The project encompasses a full **compiler front-end** built with **Flex** (lexical analysis) and **Bison** (parsing), a **web-based IDE** powered by **Next.js** and **Monaco Editor**, and a **WebAssembly** compilation target for zero-install, in-browser compilation.

> **Project Title:** Designing a Programming Language with a Compiler  
> **Source Extension:** `.diu`

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Repository Structure](#-repository-structure)
- [Technology Stack](#-technology-stack)
- [The Diamond Language](#-the-diamond-language)
- [Compiler Architecture](#-compiler-architecture)
- [Web IDE Features](#-web-ide-features)
- [Getting Started](#-getting-started)
- [Build Instructions](#-build-instructions)
- [Running the Project](#-running-the-project)
- [Sample Programs](#-sample-programs)
- [Roadmap](#-roadmap)

---

## 🔭 Project Overview

This project demonstrates the design and implementation of a complete programming language ecosystem:

1. **Language Design** — A specification for Diamond with Bengali keywords, inferred variables via `auto`, typed functions, arrays, strings, and a small built-in standard library.
2. **Compiler Core** — Lexical analysis (Flex), parsing & AST construction (Bison), semantic analysis, symbol table management, raw/optimized Three-Address Code (TAC), pseudo-assembly generation, and JSON export — all written in **C**.
3. **Web IDE** — A Next.js workspace with Monaco Editor, offering syntax highlighting, AST visualization, flowchart rendering, token stream inspection, symbol table display, TAC viewer, diagnostics panel, memory debugger, challenge mode, and more.
4. **WebAssembly Target** — The C compiler core is compiled to WASM via **Emscripten**, enabling in-browser compilation with no server required.
5. **Backend API** — An Express.js server that can invoke the compiler binary and normalize the returned analysis artifacts.

---

## 📁 Repository Structure

```
Compiler Project/
├── diamond-compiler/           # Compiler core, backend API, and docs
│   ├── core/                   # C source files for the compiler
│   │   ├── lexer.l             # Flex lexer specification (88 rules)
│   │   ├── parser.y            # Bison grammar (743 lines, 60+ productions)
│   │   ├── ast.c / ast.h       # Abstract Syntax Tree (24 node types)
│   │   ├── symtab.c / symtab.h # Symbol table with scope tracking
│   │   ├── tac.c / tac.h       # Three-Address Code generator
│   │   ├── driver.c            # Compiler entry point & JSON serializer
│   │   ├── lex.yy.c            # Generated lexer (from Flex)
│   │   ├── parser.tab.c/.h     # Generated parser (from Bison)
│   │   ├── diamond.js          # Emscripten-compiled WASM glue
│   │   ├── diamond.wasm        # WebAssembly binary
│   │   └── BUILD-WASM.md       # WASM build instructions
│   │
│   ├── backend/                # Express.js API server
│   │   ├── src/app.js          # Express app factory with /health and /compile
│   │   ├── src/server.js       # Runtime boot entry point
│   │   ├── tests/              # Node test runner coverage for the API
│   │   └── package.json        # Express, CORS, Helmet, Morgan
│   │
│   ├── docs/                   # Documentation
│   │   ├── language-spec.md    # Full Diamond language specification
│   │   ├── compiler-architecture.md # Phase-by-phase compiler and runtime design
│   │   └── project-roadmap.md  # Feature roadmap & delivery phases
│   │
│   ├── build.ps1               # Native build script (Windows)
│   ├── build-wasm.ps1          # WASM build script (Emscripten)
│   ├── run.ps1                 # Run compiler on a .diu file
│   ├── diamond.exe             # Pre-built native compiler binary
│   ├── test.diu                # Basic test program
│   ├── tmp.diu                 # Feature-rich test program
│   └── invalid.diu             # Intentionally broken program (error testing)
│
├── diamond-ide/                # Next.js web IDE (latest version)
│   ├── app/
│   │   ├── page.tsx            # Thin page entry that renders the IDE shell
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Shared theme tokens and responsive styling
│   ├── components/ide/         # Modular IDE layout, panels, modals, and hooks
│   ├── lib/
│   │   ├── wasm-client.ts      # WASM compiler integration
│   │   ├── mock-compiler.ts    # Fallback mock compiler for demo mode
│   │   ├── diamond-runtime.ts  # Client-side AST interpreter
│   │   ├── debug-runtime.ts    # Step-through debugger engine
│   │   ├── diamond-language.ts # Monaco language definition & highlighting
│   │   ├── diamond-format.ts   # Code formatter
│   │   ├── diamond-cheatsheet.ts # Quick reference data
│   │   ├── report-export.ts    # HTML/PDF export helpers
│   │   ├── test-suite.ts       # Embedded IDE regression suite
│   │   ├── ast-graph.ts        # AST → ReactFlow graph converter
│   │   ├── flowchart.tsx       # Control-flow graph visualization
│   │   ├── memory-panel.tsx    # Debug memory inspector
│   │   ├── challenges.ts       # Built-in coding challenges
│   │   ├── templates.ts        # Starter code templates
│   │   └── types.ts            # Shared TypeScript types
│   ├── public/
│   │   ├── wasm/               # Synced compiler bundle
│   │   └── workers/            # Synced Web Worker entry point
│   ├── scripts/                # WASM worker template + asset sync automation
│   ├── tests/                  # Vitest unit/integration + Playwright E2E coverage
│   └── package.json            # Dependencies (Next 16, React 18, Monaco, ReactFlow)
│
├── .github/workflows/          # CI pipeline for lint, unit tests, backend tests, E2E
├── package.json                # Workspace-level test/lint convenience scripts
│
└── README.md                   # ← You are here
```

---

## 🛠️ Technology Stack

### Compiler Core

| Component | Technology | Purpose |
|---|---|---|
| **Lexer** | Flex (C) | Tokenizes Diamond source into 40+ token types |
| **Parser** | Bison (C) | LALR(1) grammar with 60+ productions, builds AST |
| **AST** | C (custom) | 24 node types covering all language constructs |
| **Symbol Table** | C (linked list) | Scoped symbol tracking with 4 symbol kinds |
| **TAC Generator** | C (custom) | Three-Address Code with temporaries and labels |
| **Driver** | C | JSON serialization of all compiler artifacts |
| **WASM Build** | Emscripten | Compiles the entire compiler to WebAssembly |
| **Native Build** | GCC / MinGW | Produces `diamond.exe` for local CLI usage |

### Web IDE (`diamond-ide`)

| Component | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 | React-based web application |
| **Editor** | Monaco Editor | VS Code-grade editing with Diamond syntax support |
| **AST Viewer** | ReactFlow | Interactive tree visualization of the AST |
| **Flowchart** | ReactFlow | Control-flow graph rendering |
| **Styling** | Tailwind CSS 3 | Responsive workspace with shared light/dark theme tokens |
| **Icons** | Lucide React | UI icon library |
| **Language** | TypeScript | Full type safety across the IDE |

### Backend API (`backend`)

| Component | Technology | Purpose |
|---|---|---|
| **Server** | Express.js 4 | REST API for server-side compilation |
| **Middleware** | CORS, Morgan | Cross-origin requests, request logging |
| **Port** | 4000 | Default development port |

---

## 💎 The Diamond Language

Diamond uses **Bengali-inspired keywords** with standard mathematical operators and C-style delimiters.

### Keywords

| Keyword | Meaning | Category |
|---|---|---|
| `shuru` / `shesh` | Program start / end | Structure |
| `dhoro` | Declare (variable) | Declaration |
| `shonkha` | Integer type | Type |
| `doshomik` | Float type | Type |
| `lekha` | String type | Type |
| `shotto` / `mithya` | Boolean true / false | Type & Literal |
| `jodi` / `naile` | If / else | Control Flow |
| `jotokhon` | While loop | Control Flow |
| `ghurao` | For loop | Control Flow |
| `kaj` | Function declaration | Function |
| `ferot` | Return | Function |
| `dekhao` | Print / output | I/O |
| `nao` | Read / input | I/O |
| `ebong` / `ba` / `na` | Logical AND / OR / NOT | Logic |

### Type System

- `shonkha` — integers (`42`, `-7`)
- `doshomik` — floating-point numbers (`3.14`, `7.5`)
- `lekha` — strings (`"Diamond"`, `"Hello World"`)
- `shotto` — booleans (`shotto` for true, `mithya` for false)

### Example Program

```
kaj jog(a, b) {
    dhoro shonkha total;
    total = a + b;
    ferot total;
}

shuru

dhoro shonkha a;
dhoro doshomik price;
dhoro lekha name;
dhoro shotto ready;
dhoro shonkha arr[5];

a = 5;
price = 7.5;
name = "Diamond";
ready = shotto;
arr[0] = jog(a, 3);

jodi (ready ebong a < 10) {
    dekhao(name);
} naile {
    dekhao("fallback");
}

jotokhon (a < 8) {
    a = a + 1;
}

ghurao (a = 0; a < 3; a = a + 1) {
    dekhao(arr[0]);
}

shesh
```

---

## ⚙️ Compiler Architecture

The Diamond compiler implements a **multi-phase front-end pipeline**:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Source Code  │────▸│ Preprocessor │────▸│    Lexer      │────▸│    Parser    │────▸│   Semantic   │────▸│  Raw / Opt   │
│   (.diu)      │     │ imports +    │     │  (Flex)       │     │  (Bison)     │     │   Analysis   │     │     TAC      │
│                │     │ record lower │     │               │     │               │     │              │     │ + assembly   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                          │                     │                     │                     │                      │
                    Expanded source        Token Stream          AST (24 types)       Symbol Table          Pseudo-assembly
                    + preprocess stats     + lex errors          + syntax errors       + type checks         + optimization stats
                                                                                       + scope mgmt
```

### Phase Details

1. **Preprocessing** (`core/preprocess.c`)
   - Expands `amdani "..."` imports before lexing/parsing
   - Lowers `gothon` record declarations and nested field access into flat declarations
   - Tracks preprocessing statistics for imports, record types, and lowered record variables
   - Emits preprocessing diagnostics for unsupported constructs such as record-typed function parameters

2. **Lexical Analysis** (`core/lexer.l`)
   - 19 reserved keywords recognized as distinct tokens
   - Integer, float, string, and boolean literals
   - Arithmetic, comparison, logical, and assignment operators
   - Single-line (`//`) and multi-line (`/* */`) comments
   - Line tracking for error reporting
   - Error recovery for unexpected characters

3. **Parsing & AST Construction** (`core/parser.y`)
   - LALR(1) grammar with verbose error reporting (`%define parse.error verbose`)
   - 24 AST node types: `PROGRAM`, `BLOCK`, `STATEMENT_LIST`, `DECLARATION`, `ASSIGNMENT`, `IF`, `WHILE`, `FOR`, `PRINT`, `INPUT`, `RETURN`, `FUNC_DECL`, `FUNC_CALL`, `PARAM_LIST`, `ARGUMENT_LIST`, `BIN_OP`, `UNARY_OP`, `LITERAL_INT`, `LITERAL_FLOAT`, `LITERAL_STRING`, `LITERAL_BOOL`, `IDENTIFIER`, `ARRAY_REF`, `EMPTY`
   - Operator precedence for arithmetic, comparison, equality, and logical operators
   - Support for functions declared before `shuru...shesh` block

4. **Semantic Analysis** (embedded in `parser.y`)
   - Type compatibility checking for assignments and expressions
   - Single implicit promotion rule: `shonkha -> doshomik`
   - Undeclared identifier detection
   - Redeclaration detection (same scope)
   - Array access validation (must use index, must be declared as array)
   - Boolean condition enforcement for `jodi`, `jotokhon`, and `ghurao`
   - Function call validation (must be declared as `kaj`)
   - Return statement scoping (`ferot` only inside functions)
   - Numeric operand enforcement on arithmetic operators
   - Boolean operand enforcement on logical operators

5. **Symbol Table** (`core/symtab.c`)
   - Linked-list implementation
   - Scope-level tracking with `enter_scope` / `leave_scope`
   - Four symbol kinds: `variable`, `function`, `parameter`, `array`
   - Active/inactive status for scope-based visibility
   - Simulated memory addresses for teaching-oriented memory visualization

6. **Three-Address Code Generation & Optimization** (`core/tac.c`)
   - Temporary variable generation (`t1`, `t2`, …)
   - Label generation (`L1`, `L2`, …)
   - Operations: `=`, arithmetic (`+`, `-`, `*`, `/`), comparison, logical
   - Control flow: `ifFalse`, `goto`, `label`
   - Function support: `func`, `endfunc`, `param`, `call`, `return`
   - Array operations: `decl_array`, `load_index`, `store_index`
   - I/O: `print`, `input`
   - Optimization passes: constant folding, strength reduction, common subexpression elimination, dead code elimination, and unreachable code removal
   - Educational pseudo-assembly generation from optimized TAC

7. **JSON Export** (`core/driver.c`)
   - Complete JSON serialization of all compiler outputs
   - Fields: `success`, `output`, `errors[]`, `tokens[]`, `ast`, `symbolTable[]`, `rawTac[]`, `tac[]`, `assembly`, `optimizations`, `meta{}`
   - Dual entry points: `diamond_compile()` for string input, `diamond_compile_file()` for file input
   - WASM-compatible exports via `#ifndef DIAMOND_WASM`

---

## 🖥️ Web IDE Features

The Diamond IDE (`diamond-ide`) now ships as a modular workspace with dedicated components for the editor, analysis dashboard, challenge area, console, status bar, and modal tools.

### Workspace & Editing
- **Monaco Editor** with custom Diamond syntax highlighting and light/dark themes
- Real-time compilation with inline diagnostics and line-focused navigation
- Smarter formatter that normalizes operators, inline comments, blank lines, and assignment alignment
- Template switching with undo protection instead of destructive replacement
- File open/upload support for `.diu` sources plus one-click download
- Keyboard shortcuts help modal and responsive layout tuned for desktop and mobile

### Analysis Panels
| Tab | Description |
|---|---|
| **AST** | Interactive tree visualization using ReactFlow with zoom, pan, and minimap |
| **Flowchart** | Algorithm flowchart of the program's execution paths |
| **Tokens** | Full token stream with type, lexeme, and line number |
| **Symbols** | Flat symbol table with declaration metadata |
| **Scopes** | Nested scope explorer with scope lifetime summaries |
| **IR / Codegen** | Raw TAC, optimized TAC, pseudo-assembly, and optimization counters in one teaching-oriented view |
| **Diagnostics** | Categorized errors with line-click navigation |
| **Types** | Expected vs. inferred type insights for declarations, assignments, conditions, returns, and call arguments |
| **Memory** | Step-through debugger with variable state visualization |
| **Test Suite** | Embedded regression dashboard for curated Diamond programs |

### Execution, Reporting, and Teaching Tools
- Program input panel for `nao()` values and terminal-style runtime output
- HTML/PDF export for compiler artifacts, diagnostics, and summary metrics
- Expanded cheatsheet covering arrays, nested conditions, functions, booleans, comments, and error examples
- Richer challenge catalog with beginner, intermediate, and advanced exercises, including array and function tasks
- Built-in test suite runner backed by curated `.diu` fixtures and visible pass/fail summaries
- WASM worker shipped automatically through build/sync scripts, with demo-mode fallback when the bundle is missing

### Reference Documentation

- `diamond-compiler/docs/language-spec.md` documents Diamond syntax, keywords, types, grammar, and semantic rules.
- `diamond-compiler/docs/compiler-architecture.md` maps the implementation to compiler phases, diagnostics, optimization, memory model, and current limitations.
- `diamond-compiler/backend/openapi.yaml` describes the server-side compile API and exported analysis schema.

---

## 🚀 Getting Started

### Prerequisites

| Tool | Required For | Install |
|---|---|---|
| **Node.js** (≥ 18) | Web IDE & Backend | [nodejs.org](https://nodejs.org) |
| **Flex** / **WinFlexBison** | Lexer generation | [winflexbison](https://github.com/lexxmark/winflexbison) |
| **Bison** / **WinFlexBison** | Parser generation | (bundled with WinFlexBison) |
| **GCC** / **MinGW** | Native compiler build | [mingw-w64.org](https://www.mingw-w64.org) |
| **Emscripten** (optional) | WASM build | [emscripten.org](https://emscripten.org/docs/getting_started/downloads.html) |

### Quick Start

```powershell
# 1. Clone the repository
git clone <repository-url>
cd "Compiler Project"

# 2. Install the IDE dependencies
cd diamond-ide
npm install

# 3. Sync WASM assets if you already built the compiler
npm run sync:wasm

# 4. Start the IDE
npm run dev
# → Opens at http://localhost:3000

# 5. (Optional) Install backend dependencies
cd ../diamond-compiler/backend
npm install
npm run dev
# → Starts at http://localhost:4000
```

---

## 🔨 Build Instructions

### Native Compiler (Windows)

```powershell
cd diamond-compiler

# Auto-detect tools on PATH
.\build.ps1

# Cross-platform Node wrapper
node .\scripts\build-native.mjs

# Or specify tool locations
.\build.ps1 -WinFlexBisonDir "C:\tools\winflexbison" -MingwBinDir "C:\mingw64\bin"
```

**Output:** `diamond.exe` in the project root.

### WASM Compiler

```powershell
cd diamond-compiler

# Auto-detect tools on PATH
.\build-wasm.ps1

# Or specify tool locations
.\build-wasm.ps1 `
  -EmscriptenDir "C:\path\to\emsdk\upstream\emscripten" `
  -WinFlexBisonDir "C:\path\to\winflexbison"
```

**Output:** `diamond.js`, `diamond.wasm`, and the worker script are copied to frontend targets where available, including `diamond-ide/public/wasm/` and `diamond-ide/public/workers/`.

### Sync Existing WASM Assets Into The IDE

```powershell
cd diamond-ide
npm run sync:wasm
```

This copies `diamond.js` and `diamond.wasm` from `diamond-compiler/core/` into `diamond-ide/public/wasm/`, installs the worker under `diamond-ide/public/workers/`, and removes stale duplicate files from `diamond-ide/public/`.

### Manual WASM Build

```bash
cd diamond-compiler/core

bison -d parser.y
flex lexer.l

emcc lex.yy.c parser.tab.c ast.c symtab.c tac.c driver.c \
  preprocess.c \
  -O2 -DDIAMOND_WASM \
  -s EXPORTED_FUNCTIONS='["_diamond_compile","_diamond_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='"DiamondModule"' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT='web,worker' \
  -o diamond.js
```

---

## ▶️ Running the Project

### Run the Web IDE

```powershell
cd diamond-ide
npm run dev
```

Open **http://localhost:3000** in your browser. The IDE loads with a default template and auto-compiles on every keystroke.

> If WASM files are present in the `public/wasm/` directory, the real compiler runs in-browser. Otherwise, it falls back to **demo analysis mode** using the mock compiler.

### Run The Test And Quality Checks

```powershell
# Native compiler build + regression dashboard
npm run test:native

# Workspace native + IDE unit + backend tests
npm test

# IDE lint
npm --prefix diamond-ide run lint

# IDE browser coverage
npm --prefix diamond-ide run test:e2e

# Production build check
npm --prefix diamond-ide run build
```

`npm run test:native` regenerates the real compiler, runs the native regression suite, and writes:

- `diamond-compiler/tests/report/latest-results.json`
- `diamond-compiler/tests/report/dashboard.md`

### Run the Native Compiler (CLI)

```powershell
cd diamond-compiler

# Use default test file
.\run.ps1

# Specify a custom file
.\run.ps1 -InputFile "tmp.diu"

# Enable Bison parse tracing
.\run.ps1 -InputFile "tmp.diu" -Trace

# Direct invocation
.\diamond.exe test.diu
```

**Output:** JSON containing `success`, `output`, `errors`, `tokens`, `ast`, `symbolTable`, `rawTac`, optimized `tac`, `assembly`, optional `parseTrace`, optimization stats, and `meta`.

The native compiler now also preprocesses:

- `amdani "module.diu";` for file-based module imports
- `gothon Name { ... }` for record-style composite types with nested field access

### Run the Backend API

```powershell
cd diamond-compiler/backend
npm install
npm run dev
```

**Endpoints:**
- `GET /health` — Health check
- `POST /compile` — Accepts `{ "code": "..." }` and returns compiler results

---

## 📝 Sample Programs

### Hello World
```
shuru

dekhao("Hello World");

shesh
```

### Variable Declaration & Output
```
shuru

dhoro shonkha a;
a = 5;

dekhao(a);

shesh
```

### Conditional Logic
```
shuru

dhoro shonkha a;
dhoro shonkha b;

a = 5;
b = 10;

jodi (a < b) {
    dekhao("a is smaller");
} naile {
    dekhao("b is smaller");
}

shesh
```

### While Loop
```
shuru

dhoro shonkha count;
count = 0;

jotokhon (count < 5) {
    dekhao(count);
    count = count + 1;
}

shesh
```

### For Loop
```
shuru

ghurao (i = 0; i < 5; i = i + 1) {
    dekhao(i);
}

shesh
```

### Functions
```
kaj jog(a, b) {
    ferot a + b;
}

shuru

dhoro shonkha result;
result = jog(5, 3);
dekhao(result);

shesh
```

### Error Detection (Invalid Program)
```
shuru

dhoro shonkha a;
dhoro lekha name;

a = "oops";       // ✗ Type mismatch: assigning lekha to shonkha
b = 5;             // ✗ Undeclared identifier 'b'
jodi (a) {         // ✗ Condition must evaluate to shotto
    dekhao(name)   // ✗ Missing semicolon
}

shesh
```

---

## 🚧 Unfinished Tasks & Areas for Improvement

> Snapshot checked against the repository on **April 7, 2026**. The earlier Web IDE and frontend QA audit items are now largely resolved. The main remaining work is in the compiler core, native validation, and deployment.

---

### 1. Backend API

Current status: stable for local development and classroom/demo use.

- `/health` and `/compile` are implemented with validation, rate limiting, error handling, and automated tests.
- No urgent unfinished audit blockers remain in this area.

---

### 2. Compiler Core (C / Flex / Bison)

| Area | Status | Details | Priority |
|---|---|---|---|
| **User-defined composite types** | Implemented | `gothon` record types now preprocess into flattened native declarations with nested field access support such as `user.home.city` | ✅ Done |
| **Multi-file/module support** | Implemented | `amdani "path.diu";` now expands file-based module imports in the native compiler pipeline | ✅ Done |
| **Standard library breadth** | Improved | Extra built-ins now include `ulto`, `vagshesh`, `gol`, `shonkhakor`, and `lekhakor`; file I/O is still future work | 🟠 Low |
| **Record params/returns** | Still open | Record values work as storage types today, but passing/returning them directly from functions is not lowered yet | 🟡 Medium |

---

### 3. Web IDE (`diamond-ide`)

Current status: the original IDE audit items are resolved.

- The page architecture is modular, the formatter/cheatsheet/challenges are expanded, and the IDE now includes scope exploration, type insights, report export, file-open support, theme toggle, keyboard shortcuts, mobile responsiveness, template undo, and automated WASM asset syncing.
- Future IDE work is mostly feature expansion rather than backlog cleanup, such as multi-file project tabs or collaborative tooling.

---

### 4. Testing & Quality Assurance

Current status: the IDE and backend now have meaningful automated coverage.

| Area | Status | Details | Priority |
|---|---|---|---|
| **Native C-core tests** | Implemented | `diamond-compiler/tests/run-native-regression.mjs` builds the real compiler, validates JSON/TAC/assembly output, and writes a dashboard artifact | ✅ Done |
| **Cross-platform CI matrix** | Implemented | GitHub Actions now validates the native compiler on both `ubuntu-latest` and `windows-latest` in addition to the web/backend stack | ✅ Done |
| **Coverage/reporting dashboard** | Partial | The native regression suite now emits `tests/report/latest-results.json` and `tests/report/dashboard.md`, but there is no hosted historical dashboard yet | 🟠 Low |

---

### 5. Deployment & DevOps

| Area | Status | Details | Priority |
|---|---|---|---|
| **Hosted demo / live preview** | Still open | There is no public deployment of the IDE or backend yet | 🔴 High |
| **Deployment configuration** | Partial | `diamond-ide` now includes a `vercel.json` and `Dockerfile`, but backend/production deployment templates are still incomplete | 🟠 Low |
| **Legacy frontend cleanup** | Completed | The deprecated `diamond-web` app was removed so deployment now targets a single frontend | ✅ Done |
| **WASM delivery strategy** | Partial | WASM syncing is automated, but CDN caching/versioning is not configured | 🟠 Low |
| **Environment documentation** | Partial | The backend includes `.env.example`, but IDE-side environment/config docs are still minimal | 🟠 Low |
| **Report metadata cleanup** | Still open | `Report.md` still contains the placeholder student ID `232-15-XXX` | 🟡 Medium |

---

### Summary

| Area | Current Status | Main Remaining Work |
|---|---|---|
| Backend API | ✅ Stable | None urgent |
| Compiler Core | 🟡 In progress | Record-by-value functions, file I/O built-ins, and deeper module ergonomics |
| Web IDE | ✅ Audit complete | Future feature expansion only |
| Testing & QA | 🟡 Strong | Hosted coverage/history and broader reporting polish |
| Deployment & DevOps | 🔴 Biggest remaining gap | Hosting, deployment config, repo cleanup |

---

## 🗺️ Roadmap

### ✅ Completed Features
- Custom language design with Bengali keywords
- Flex-based lexer with 40+ token types
- Bison-based parser with full grammar coverage
- AST construction (24 node types)
- Symbol table with scope management
- Semantic analysis (types, scopes, declarations)
- Three-Address Code generation
- JSON export for all compiler artifacts
- WebAssembly build via Emscripten
- Web IDE with Monaco Editor
- AST visualization with ReactFlow
- Control-flow graph visualization
- Token stream viewer
- Symbol table viewer
- Nested scope explorer
- TAC viewer
- Diagnostics panel with line navigation
- Type inference / compatibility report panel
- HTML/PDF compilation report export
- Client-side program execution (interpreter)
- Step-through debugger with memory inspector
- Responsive light/dark IDE workspace with file-open support
- Keyboard shortcuts help and template undo flow
- Coding challenges with automated grading
- Embedded test suite dashboard
- Code formatter and expanded cheatsheet
- Vitest unit/integration tests, backend API tests, and Playwright E2E coverage
- GitHub Actions CI pipeline

### 🔮 Planned Enhancements
- Deployment to Vercel / Railway
- Record-by-value parameters/returns for `gothon`-based types
- Richer standard library and future type-system expansion
- Multi-file project workspace support inside the IDE
- CDN caching strategy for WASM assets
- Keep deployment focused on `diamond-ide` plus the optional backend fallback

---

## 📄 License

This is an academic project developed for educational purposes.

---

<p align="center">
  <strong>💎 Diamond — Making compiler concepts accessible through Bengali.</strong>
</p>
