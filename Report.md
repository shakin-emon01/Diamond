# Designing a Programming Language with a Compiler

## Diamond Compiler

- **Project type:** University compiler design project
- **Course context:** CSE312: Compiler Design Lab
- **Source extension:** `.diu`
- **Live web IDE:** https://diamond-lyart.vercel.app/
- **Updated for the current repository state on:** April 16, 2026

## Abstract

Diamond is a Bengali-inspired educational programming language and compiler project built to help students and teachers understand the major stages of compilation through a practical, visual, and interactive system. The project combines a compiler core written in C with Flex and Bison, a modern Next.js-based web IDE, WebAssembly delivery for browser-side compilation, and supporting backend and testing infrastructure.

The current system goes beyond a simple parser demonstration. It now includes preprocessing for imports and record-style declarations, AST generation, semantic analysis, scoped symbol tracking, raw and optimized Three-Address Code (TAC), educational pseudo-assembly output, browser execution support, debugging, challenge-based practice, and automated regression testing. As a result, the project serves both as a compiler implementation and as a teaching platform.

## 1. Introduction

Compiler courses often explain lexical analysis, parsing, semantic checking, and intermediate representation as separate theoretical ideas. Students may understand the definitions but still struggle to picture how these phases connect inside a real system. Diamond was developed to reduce that gap by giving learners a language of their own and a tool that makes each phase visible.

The project uses Bengali-inspired keywords such as `shuru`, `shesh`, `dhoro`, `jodi`, and `dekhao`, while keeping operators and block syntax familiar. This makes the language approachable for beginners while still preserving formal compiler structure.

## 2. Project Objectives

The main objectives of the project are:

1. design a clear educational programming language with Bengali-inspired syntax
2. implement a working compiler front end using Flex, Bison, and C
3. expose compiler artifacts such as tokens, AST, symbol table, diagnostics, and TAC
4. build a browser-based IDE that students can use without complex local setup
5. support classroom demonstration, debugging, testing, and academic presentation

## 3. Current System Overview

Diamond is organized as a complete project rather than a single compiler file.

| Layer | Current role |
|---|---|
| Language | Defines syntax, keywords, types, functions, arrays, loops, and I/O |
| Compiler core | Performs preprocessing, lexing, parsing, semantic analysis, TAC generation, optimization reporting, and JSON export |
| Web IDE | Provides editing, compilation, visualization, running, debugging, challenges, and reporting |
| WebAssembly integration | Allows the compiler to run inside the browser |
| Backend API | Provides a server-side fallback for compilation |
| Test system | Verifies native compiler behavior, IDE behavior, backend behavior, and browser workflows |

## 4. Diamond Language Summary

### 4.1 Core keywords

| Category | Keywords |
|---|---|
| Program structure | `shuru`, `shesh` |
| Declaration and types | `dhoro`, `shonkha`, `doshomik`, `lekha`, `shotto`, `mithya`, `khali`, `auto` |
| Conditions and loops | `jodi`, `naile`, `jotokhon`, `ghurao` |
| Functions | `kaj`, `ferot` |
| Input and output | `dekhao`, `nao` |
| Logical operators | `ebong`, `ba`, `na` |
| Preprocessing | `amdani`, `gothon` |

### 4.2 Supported types

| Type | Meaning |
|---|---|
| `shonkha` | integer |
| `doshomik` | floating-point number |
| `lekha` | string |
| `shotto` | boolean |
| `khali` | function-only void-like return type |

### 4.3 Supported programming constructs

The current language supports:

- variable declarations
- arrays
- arithmetic and comparison expressions
- `if` and `if-else`
- `while` and `for`
- functions and return statements
- input and output
- preprocessing-based imports
- preprocessing-based record-style declarations

### 4.4 Example

```text
kaj shonkha jog(shonkha a, shonkha b) {
    ferot a + b;
}

shuru

dhoro shonkha result;
result = jog(5, 3);
dekhao(result);

shesh
```

## 5. Compiler Architecture

### 5.1 Compilation pipeline

```text
Diamond source
   ->
Preprocessing
   ->
Lexical analysis
   ->
Parsing and AST construction
   ->
Semantic analysis
   ->
Raw TAC generation
   ->
Optimization reporting
   ->
Pseudo-assembly and JSON export
```

### 5.2 Phase responsibilities

| Phase | Current implementation details |
|---|---|
| Preprocessing | expands `amdani` imports and lowers `gothon` record-style declarations |
| Lexical analysis | tokenizes source code and reports lexical errors with line numbers |
| Parsing | validates grammar and builds the AST |
| Semantic analysis | checks declarations, scopes, arrays, function calls, returns, and type compatibility |
| IR generation | creates raw TAC and optimized TAC |
| Code generation view | produces educational pseudo-assembly for explanation and visualization |
| Export | returns structured JSON for the CLI, web IDE, and backend API |

### 5.3 Symbol table model

The symbol table stores:

- symbol name
- kind
- type
- scope level
- declaration line
- array size
- active or inactive scope state
- built-in metadata
- function parameter metadata
- simulated memory address

The memory address values are educational and are meant to help explain how variables are tracked during execution and debugging.

## 6. Current Functionalities

### 6.1 Compiler-side functionality

| Feature | Current status |
|---|---|
| Flex lexer | implemented |
| Bison parser | implemented |
| AST generation | implemented |
| semantic diagnostics | implemented |
| scoped symbol table | implemented |
| preprocessing for imports and records | implemented |
| raw TAC generation | implemented |
| optimized TAC reporting | implemented |
| pseudo-assembly listing | implemented |
| JSON compiler result | implemented |

### 6.2 IDE-side functionality

| Feature | Current status |
|---|---|
| Monaco editor with Diamond highlighting | implemented |
| template programs | implemented |
| multi-tab editing | implemented |
| compile and run actions | implemented |
| stdin input panel | implemented |
| AST visualization | implemented |
| flowchart visualization | implemented |
| token viewer | implemented |
| symbol and scope explorer | implemented |
| type inference panel | implemented |
| IR and pseudo-assembly panel | implemented |
| diagnostics panel | implemented |
| debugger and memory snapshots | implemented |
| challenge mode | implemented |
| embedded test suite panel | implemented |
| HTML report export | implemented |

### 6.3 Compile path in the browser

The frontend currently attempts compilation in this order:

1. Web Worker WASM compiler
2. main-thread WASM compiler
3. backend API fallback
4. demo fallback mode

This improves reliability during live use and demonstration.

## 7. Runtime, Debugging, And Learning Tools

The project does not stop at compilation output. It also includes:

- a client-side interpreter for running Diamond programs
- input support for `nao()`
- debugger snapshots for step-by-step execution
- memory and call-stack style visualization
- beginner-friendly coding challenges with automatic checks
- an embedded test suite for quick verification inside the IDE

These features make the project especially useful for teaching because students can both inspect the compile-time artifacts and observe program behavior after compilation.

## 8. Testing And Current Results

The project uses multiple verification layers.

| Test layer | Purpose |
|---|---|
| Native regression tests | validate the real C compiler binary |
| IDE unit tests | validate frontend logic and utility behavior |
| Backend tests | validate API behavior and error handling |
| Playwright end-to-end tests | validate browser workflows |

The generated native regression dashboard in the repository currently reports:

- 13 native regression checks
- 13 passed
- 0 failed

The tested cases include valid programs, invalid syntax, semantic errors, built-in functions, imports, arrays, functions, boolean logic, and record-lowering scenarios.

## 9. Team Members And Roles

The previous team section in the old report contained outdated names. The current role distribution is as follows.

| Member | Role | Refined responsibility summary |
|---|---|---|
| **Shakin Ahammed Emon** | Team Lead and Core Compiler Architect | Leads overall project direction, maintains architectural consistency, and drives the most critical compiler-core work including AST design, semantic analysis, code generation, optimization logic, and memory-aware symbol management. |
| **Abida Binte Atik** | Lead IDE Developer and Integration Architect | Designs and develops the web IDE, manages the integration between the compiler core and browser environment, and ensures that analysis panels, editor behavior, and WebAssembly connections work smoothly for end users. |
| **Hasan Md. Diham** | Lexical and Syntax Engineer | Focuses on language grammar implementation, token definition, parsing rules, and syntax-oriented validation using Flex and Bison. |
| **Bayzid Ahmed** | DevOps and Backend Infrastructure Engineer | Maintains deployment workflows, backend runtime stability, Docker-based setup, CI/CD support, and environment configuration for development and production use. |
| **Shahbaz Ali Chowdhury** | QA, Testing and Documentation Lead | Leads structured testing, verifies valid and invalid input behavior, and prepares clear academic documentation, report writing, and presentation-ready project explanations. |

If required for formal submission, student IDs can be added later in the departmental submission copy without changing the role descriptions above.

## 10. Educational Value

The current Diamond project is useful for both students and teachers because it supports:

- visual explanation of compiler phases
- quick comparison between source code and generated artifacts
- classroom demos using a browser instead of a heavy desktop toolchain
- lab exercises with built-in templates and challenge tasks
- discussion of both systems programming and modern frontend integration

For teachers, the project is especially valuable because a single example program can be used to show tokens, AST, scopes, TAC, diagnostics, execution flow, and debugging in one place.

## 11. Current Limitations

The project is functional, but several limitations should be stated honestly.

1. `gothon` records are currently handled through preprocessing rather than as full first-class runtime values.
2. Record-typed function parameters and return values are not fully supported.
3. The assembly view is educational pseudo-assembly, not executable machine code.
4. Semantic analysis is still closely tied to parser actions instead of a fully separate analysis pass.
5. Multi-file support is preprocessing-based and not a full module linker system.

## 12. Future Work

The most meaningful next improvements are:

1. support record values directly in function parameters and returns
2. expand semantic analysis into a cleaner standalone phase
3. strengthen multi-file workflow inside the IDE
4. keep historical regression dashboards instead of only the latest result
5. enrich the standard library and teaching examples
6. improve deployment documentation and demonstration tooling

## 13. Conclusion

Diamond has grown into a complete educational compiler project that combines language design, compiler construction, visualization, execution support, and modern web delivery. It demonstrates that classic compiler topics such as lexing, parsing, semantic checking, and intermediate code generation can be taught more effectively when students can see and interact with every stage in a single environment.

The current project is already suitable for academic presentation because it offers a real implementation, a live browser IDE, multiple testing layers, and documentation that connects technical details to learning outcomes.

## References

1. A. V. Aho, M. S. Lam, R. Sethi, and J. D. Ullman, *Compilers: Principles, Techniques, and Tools*, 2nd ed.
2. J. R. Levine, T. Mason, and D. Brown, *Lex and Yacc*.
3. GNU Flex documentation: https://github.com/westes/flex
4. GNU Bison documentation: https://www.gnu.org/software/bison/
5. Emscripten documentation: https://emscripten.org/
6. Next.js documentation: https://nextjs.org/docs
7. Monaco Editor documentation: https://microsoft.github.io/monaco-editor/
8. React Flow documentation: https://reactflow.dev/
