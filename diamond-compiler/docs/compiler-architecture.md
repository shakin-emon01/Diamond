# Diamond Compiler Architecture

## 1. Goal

This document explains how the current Diamond implementation maps to standard compiler-course topics and to the major folders in the repository.

## 2. End-To-End Pipeline

```text
Diamond source (.diu)
        |
        v
Preprocessing
  - amdani import expansion
  - gothon record lowering
        |
        v
Lexical analysis
  - token generation
  - lexical diagnostics
        |
        v
Parsing and AST construction
  - syntax validation
  - AST output
        |
        v
Semantic analysis
  - scope checks
  - type checks
  - function and array validation
        |
        v
Raw TAC generation
        |
        v
Optimization summary
        |
        v
Pseudo-assembly and JSON export
```

## 3. Main Source Ownership

| Area | Important files | Purpose |
|---|---|---|
| Preprocessing | `core/preprocess.c`, `core/preprocess.h` | expands imports and lowers record-style declarations |
| Lexer | `core/lexer.l` | tokenizes source and reports lexical issues |
| Parser | `core/parser.y` | grammar, AST construction, and many semantic checks |
| AST model | `core/ast.c`, `core/ast.h` | creates and manages tree nodes |
| Symbol table | `core/symtab.c`, `core/symtab.h` | scoped symbol tracking, built-ins, memory offsets |
| TAC and codegen | `core/tac.c`, `core/tac.h` | raw TAC, optimized TAC, pseudo-assembly |
| Driver | `core/driver.c` | coordinates compilation and serializes JSON output |
| Backend | `backend/src/app.js` | server-side compilation fallback API |
| IDE | `diamond-ide/` | browser UI, analysis panels, runtime, debugger, reporting |

## 4. Current Compilation Outputs

The compiler exports a structured result that may include:

- success flag and summary output
- diagnostics with line numbers and error categories
- token stream
- AST
- symbol table
- raw TAC
- optimized TAC
- pseudo-assembly
- parse trace when enabled
- optimization counters
- preprocessing statistics

## 5. Semantic Responsibilities

The current compiler checks several important rules:

- undeclared identifier use
- redeclaration in the same scope
- assignment type mismatches
- invalid return usage
- function argument count and type mismatches
- boolean requirements in conditional logic
- array declaration and indexed access validation
- invalid use of `khali` inside expressions

## 6. Symbol Table And Memory Model

The symbol table stores more than names and types. It currently tracks:

- symbol kind
- scope depth
- declaration line
- array size
- active or inactive scope status
- built-in metadata
- function parameter metadata
- simulated memory address

The memory addresses are educational values, not real hardware addresses. They help students understand how variables can be tracked during execution and debugging.

## 7. Intermediate Representation

Diamond uses TAC as its instructional intermediate representation.

The pipeline exposes:

- raw TAC before optimization reporting
- optimized TAC after simplification passes
- a pseudo-assembly listing for easy classroom explanation

The implementation also reports optimization counts such as:

- constant folds
- strength reductions
- common subexpression removals
- dead code elimination
- unreachable code removal

## 8. Browser Execution Model

The web IDE uses the following compile path priority:

1. Web Worker WASM compiler
2. main-thread WASM compiler
3. backend API compilation
4. demo fallback mode

This layered approach improves reliability during live demonstrations.

## 9. IDE Analysis And Runtime Layers

The IDE is not only an editor. It also provides:

- AST graph visualization
- flowchart generation from the AST
- token stream viewer
- symbol and scope inspection
- type inference and compatibility panel
- IR and pseudo-assembly viewer
- diagnostics panel
- runtime execution panel with stdin support
- step debugger with memory and call-stack snapshots
- built-in challenge mode and embedded test suite

## 10. Backend Responsibilities

The Express backend exists mainly as a safe compilation fallback. It currently provides:

- versioned compile endpoint at `/api/v1/compile`
- health endpoints for liveness and readiness
- input size limits
- request rate limiting
- concurrency limiting
- temporary file management for compiler execution
- production-oriented CORS and security middleware

## 11. Testing Strategy

The project uses multiple verification layers:

- native regression tests for the real compiler binary
- unit tests for IDE logic
- backend API tests
- Playwright end-to-end browser tests
- built-in challenge and test-suite flows inside the IDE

The native regression suite also writes a Markdown dashboard under `diamond-compiler/tests/report/dashboard.md`.

## 12. Current Architectural Limits

- semantic analysis is still closely tied to parser actions instead of a fully separate post-parse pass
- record support is preprocessing-based and not yet a complete first-class data model
- generated assembly is explanatory output, not executable machine code
- imports are source expansion, not a full module linker stage

## 13. Why This Architecture Fits An Academic Project

The current architecture is strong for academic use because it keeps each compiler phase visible and explainable, while also showing how classic systems programming can integrate with modern web tooling through WebAssembly and React-based visualization.
