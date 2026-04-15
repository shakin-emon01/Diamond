# Diamond Compiler Architecture

## 1. Purpose

This document maps the Diamond implementation to the compiler-course concepts
teachers usually expect to see during evaluation: pipeline separation, semantic
rules, diagnostics, intermediate representation, optimization, code generation,
and execution/runtime visualization.

## 2. End-to-End Pipeline

```text
Diamond source (.diu)
        |
        v
Preprocessor
  - amdani expansion
  - gothon lowering
        |
        v
Lexer
  - token stream
  - lexical diagnostics
        |
        v
Parser
  - AST construction
  - syntax diagnostics
        |
        v
Semantic Analysis
  - symbol table
  - scope checks
  - type checks
  - function/return validation
        |
        v
Raw TAC Generation
        |
        v
Optimization Passes
  - constant folding
  - strength reduction
  - common subexpression elimination
  - dead code elimination
  - unreachable code removal
        |
        v
Pseudo-Assembly + JSON export
```

## 3. Module Ownership

| Phase | Files | Responsibility |
|---|---|---|
| Preprocessing | `core/preprocess.c`, `core/preprocess.h` | Expands imports, lowers record-style `gothon` declarations into parser-friendly source, tracks preprocessing statistics |
| Lexical analysis | `core/lexer.l` | Produces tokens with line numbers and lexical errors |
| Parsing + AST | `core/parser.y`, `core/ast.c`, `core/ast.h` | Builds the typed AST and recovers from syntax errors where possible |
| Semantic analysis | `core/parser.y`, `core/symtab.c`, `core/symtab.h` | Enforces scope, declaration, type, function, array, and return rules |
| IR + optimization | `core/tac.c`, `core/tac.h` | Emits raw TAC, optimized TAC, optimization counts, and pseudo-assembly |
| Driver/export | `core/driver.c` | Coordinates phases and serializes all artifacts into JSON for CLI, WASM, and backend consumers |

## 4. Language Semantics

### 4.1 Scope rules

- Diamond uses lexical scoping.
- `shuru ... shesh` owns the main program block.
- Every `{ ... }` block introduces a new nested scope.
- Function parameters live in the function scope.
- Redeclaration in the same scope is rejected.
- Shadowing from an outer scope into an inner scope is allowed.
- Symbols become inactive after leaving their scope, but remain visible in the exported symbol table for teaching/debugging.

### 4.2 Type rules

Built-in scalar types:

- `shonkha` -> integer
- `doshomik` -> floating-point number
- `lekha` -> string
- `shotto` -> boolean
- `khali` -> function-only "void" return type

Compatibility rules implemented by the compiler:

- Exact type matches are accepted.
- `shonkha -> doshomik` is the only implicit promotion.
- No implicit conversion exists between numeric values and `lekha`.
- No implicit conversion exists between numeric values and `shotto`.
- `khali` expressions cannot participate in normal expressions.

Explicit conversion path currently provided through built-in helpers:

- `shonkhakor(lekha) -> shonkha`
- `lekhakor(doshomik) -> lekha`

### 4.3 Function semantics

- Functions are declared with `kaj`.
- Functions appear before the `shuru ... shesh` main block.
- If a return type is omitted, the current legacy default is `shonkha`.
- If a parameter type is omitted, the current legacy default is `shonkha`.
- `ferot` is valid only inside a function body.
- `khali` functions may use `ferot;` but may not return a value.
- Non-`khali` functions must return a compatible expression.
- Function calls are validated against parameter count and parameter types.

### 4.4 Control-flow semantics

- `jodi (...) { ... }` requires a `shotto` condition.
- `jodi (...) { ... } naile { ... }` produces two branches and a merge point.
- `jotokhon (...) { ... }` produces a loop header, body, and back-edge.
- `ghurao (init; condition; step) { ... }` separates initialization, test, step, and body in the AST/TAC pipeline.

## 5. Diagnostics Model

Diamond distinguishes multiple error classes:

| Class | Produced by | Example |
|---|---|---|
| `preprocess` | import/record lowering stage | unsupported record-typed function parameter |
| `lexical` | lexer | unexpected character |
| `syntax` | parser | missing semicolon / unexpected token |
| `semantic` | semantic analysis | type mismatch, undeclared identifier, invalid return |
| `io` / `request` / `internal` | driver/runtime environment | missing source, oversize input, internal failure |

Runtime errors are separate from compilation diagnostics and are surfaced by the
IDE interpreter/debugger with line-aware messages.

## 6. Intermediate Representation and Optimization

### 6.1 Raw TAC

The first IR lowering produces three-address code with temporaries and labels.
Representative operations include:

- arithmetic and comparison operators
- `ifFalse`, `goto`, `label`
- `func`, `param`, `call`, `return`
- `decl`, `decl_array`, `load_index`, `store_index`
- `print`, `input`

### 6.2 Optimization passes

The current optimizer applies:

- constant folding
- strength reduction
- common subexpression elimination
- dead code elimination
- unreachable code removal

Both raw TAC and optimized TAC are preserved so they can be compared in the IDE
and exported reports.

## 7. Code Generation Target

Diamond currently emits an educational pseudo-assembly target, not native
machine code. This keeps the compiler easy to explain during demonstrations.

Representative output:

```text
FUNC jog ; params=2
ADD t1, a, b
RET t1
ENDFUNC jog
PARAM 4
PARAM 9
CALL jog, 2 -> t2
PRINT t2
```

Separate from this pedagogical target, the compiler implementation itself is
also compiled to WebAssembly via Emscripten so the full front-end can run inside
the browser-based IDE.

## 8. Symbol Table and Memory Model

The symbol table records:

- symbol name
- symbol kind
- type
- scope depth
- declaration line
- array size
- activity state
- builtin flag
- parameter metadata
- simulated memory address

The memory model is educational rather than physical:

- stack-like scope entry/exit is simulated in `symtab.c`
- variables and parameters receive monotonically assigned memory offsets
- arrays reserve contiguous simulated slots
- functions live at global scope
- heap allocation is not part of the current language

The IDE debugger complements this with:

- a call stack view
- variable lifetime snapshots
- per-step memory changes

## 9. Visualization Support

The project already exposes the major compiler-course artifacts:

- token stream
- AST graph
- flowchart / control-flow preview
- symbol table
- nested scope explorer
- expected vs inferred type analysis
- raw TAC and optimized TAC
- pseudo-assembly
- diagnostics panel
- runtime debugger and memory panel
- automated test-suite dashboard

## 10. Current Limitations

These are the main known language/runtime limitations that should be presented
honestly during evaluation:

- record values cannot yet be passed to or returned from functions directly
- the pseudo-assembly target is instructional, not executable machine code
- heap data structures are not implemented
- module importing is preprocessing-based, not a separate linker stage
- semantic analysis is integrated inside the parser actions rather than being a fully separate post-parse traversal

## 11. Verification Strategy

The repository validates the compiler through several layers:

- native regression tests for the real C compiler
- embedded IDE regression cases for compile + runtime behavior
- Vitest unit tests for IDE utilities and reporting
- backend API tests
- Playwright end-to-end IDE checks

The native regression suite also writes machine-readable and markdown summaries
under `diamond-compiler/tests/report/`.
