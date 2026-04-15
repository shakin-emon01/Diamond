# Diamond Compiler Project Roadmap

## 1. Project Positioning

**Project title:** Designing a Programming Language with a Compiler  
**Core focus:** Front-end compiler using **Flex + Bison** with a modern **Next.js presentation layer**  
**Language name:** **Diamond**  
**Target outcome:** A professional academic showcase that demonstrates language design, parsing, AST generation, symbol table construction, semantic checks, TAC generation, and web-based visualization.

## 2. Professional Feature Set

### Already aligned in the current build

- Custom web IDE with Monaco Editor
- Diamond syntax highlighting
- Token stream viewer
- AST visualization panel
- Flowchart / control-flow preview
- Symbol table visualization
- Scope explorer
- Type inference / compatibility report
- IR / codegen view with raw TAC, optimized TAC, assembly, and optimization counters
- Line-aware syntax and semantic diagnostics
- Optional parse trace mode
- HTML/PDF export report
- Embedded automated test suite dashboard
- Template-based starter programs
- Browser-first WASM integration path
- Native C/Flex/Bison compiler core for verification

### Next high-value additions

- **Record-by-value functions**
  Lower record-typed parameters and returns so `gothon` values can move through functions directly.

- **Historical regression dashboard**
  Persist native and IDE test runs over time instead of only writing the latest local report.

- **Multi-file IDE workspace**
  Extend the editor workflow from single-file tabs toward project-aware imports and module navigation.

- **Deployment templates**
  Complete backend production deployment config and document the end-to-end hosted stack.

## 3. Recommended Architecture

### Core

- `core/lexer.l` for lexical analysis
- `core/parser.y` for grammar and AST construction
- `core/symtab.*` for symbol and scope tracking
- `core/tac.*` for intermediate code generation
- `core/driver.c` for JSON export and compiler entry points

### Presentation

- `diamond-ide/` for the Next.js IDE and visualizer
- Monaco for editing
- React Flow for AST rendering
- Tailwind CSS for layout and styling

### Execution Model

- **Primary target:** WebAssembly build of the compiler for a no-backend demo
- **Teaching IR target:** Educational pseudo-assembly emitted from optimized TAC
- **Fallback target:** Native executable for local verification and screenshots

## 4. Delivery Phases

### Phase A: Language Completion

- Freeze grammar for declarations, arrays, expressions, conditionals, loops, functions
- Finalize keyword list and operator precedence
- Lock `.diu` sample programs

### Phase B: Compiler Front-End Maturity

- Expand semantic checks
- Add token dump mode
- Improve error recovery in Bison
- Increase negative test coverage

### Phase C: Presentation Polish

- Add token/debug tabs
- Add export/share workflow
- Capture screenshots and demo-ready templates
- Add “compiler mode” badges and academic captions in UI

### Phase D: Defense Readiness

- Prepare feature-to-concept mapping
  Example: AST -> syntax tree, Symbol Table -> semantic analysis, TAC -> intermediate representation
- Prepare live demo flow
  1. Write code
  2. Show diagnostics
  3. Show AST
  4. Show symbol table
  5. Show TAC

## 5. Tool Strategy

### Primary tools

- **Cursor AI** for fast iterative development
- **GitHub Student Developer Pack** for hosting, credits, and dev tooling
- **Emscripten** for compiling C/Flex/Bison output to WebAssembly

### Helpful optional tools

- **Railway / Render / Vercel**
  For deployment and preview environments

- **draw.io / Excalidraw**
  For architecture and compiler pipeline diagrams

- **Doxygen or MkDocs**
  For technical documentation generation

- **Playwright**
  For end-to-end demo regression testing

## 6. Presentation Storyline

When presenting, keep the story simple and layered:

1. Diamond is a custom educational language.
2. Flex tokenizes the source.
3. Bison parses the grammar and builds AST nodes.
4. Semantic analysis validates declarations, scopes, and assignments.
5. The compiler emits symbol tables and TAC.
6. The web IDE visualizes all of this in a user-friendly format.
7. The long-term target is a full browser execution path via WebAssembly.

## 7. Suggested Final Deliverables

- Compiler source code
- Next.js web IDE
- Language specification
- Roadmap and architecture document
- Valid and invalid test programs
- Project presentation slides
- Demo video or screen recording
