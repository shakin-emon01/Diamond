<p align="center">
  <img src="./Diamond.png" alt="Diamond Compiler logo" width="96" />
</p>

<h1 align="center">Diamond Compiler</h1>

<p align="center">
  <strong>A Bengali-inspired educational programming language, compiler, and modern web IDE for compiler design learning.</strong>
</p>

<p align="center">
  <a href="https://diamond-lyart.vercel.app/">Live Compiler</a>
  |
  <a href="./Report.md">Project Report</a>
  |
  <a href="./diamond-compiler/docs/language-spec.md">Language Specification</a>
  |
  <a href="./diamond-compiler/docs/compiler-architecture.md">Compiler Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Language-Diamond-0f766e?style=for-the-badge" alt="Language badge" />
  <img src="https://img.shields.io/badge/Compiler-Flex%20%2B%20Bison-c2410c?style=for-the-badge" alt="Compiler badge" />
  <img src="https://img.shields.io/badge/Frontend-Next.js%2016-111827?style=for-the-badge" alt="Frontend badge" />
  <img src="https://img.shields.io/badge/Runtime-WebAssembly-2563eb?style=for-the-badge" alt="Runtime badge" />
</p>

## Overview

Diamond is a university compiler project that combines:

- a custom Bengali-flavoured programming language
- a compiler core written in C with Flex and Bison
- a browser-based IDE built with Next.js and Monaco Editor
- WebAssembly delivery for in-browser compilation and analysis

The project is designed for students and teachers who want to see how source code moves through the main compiler stages: preprocessing, lexical analysis, parsing, semantic checking, intermediate code generation, optimization, and reporting.

## Live System

- Live compiler: https://diamond-lyart.vercel.app/
- Source file extension: `.diu`
- Main goal: make compiler concepts visible, testable, and easy to explain in class or viva

## Project Snapshot

| Area | Current implementation |
|---|---|
| Language style | Bengali-inspired keywords with C-like blocks, operators, and statements |
| Compiler core | C, Flex, Bison, AST construction, semantic analysis, symbol table, TAC, pseudo-assembly |
| Preprocessing | `amdani` import expansion and `gothon` record lowering |
| IDE | Next.js, React, TypeScript, Monaco Editor, React Flow |
| Runtime | Client-side interpreter with stdin support, debugger, and memory snapshots |
| Delivery | WASM worker first, then main-thread WASM, backend API fallback, then demo fallback |
| Testing | Native regression tests, IDE unit tests, backend tests, Playwright end-to-end tests |

## What The Project Currently Does

### Compiler capabilities

- tokenizes Diamond source code and reports lexical errors with line numbers
- parses the language into an Abstract Syntax Tree
- performs semantic checks for declarations, scopes, arrays, function calls, return rules, and type compatibility
- generates both raw TAC and optimized TAC
- emits an educational pseudo-assembly listing
- exports compiler results as JSON for the CLI, backend, and web IDE
- tracks preprocessing statistics and simulated memory addresses in the symbol table

### IDE capabilities

- Monaco-based code editor with Diamond syntax highlighting
- multiple starter templates and multi-tab editing
- compile, run, and debug actions from the browser
- input console for programs that use `nao()`
- visual analysis panels for:
  - AST
  - flowchart
  - tokens
  - symbols
  - scopes
  - type inference
  - IR / code generation
  - diagnostics
  - memory
  - test suite
- built-in coding challenges with automated checks
- exportable HTML report for classroom demonstration or submission support

## Repository Structure

```text
Compiler Project/
|-- diamond-compiler/
|   |-- core/                  # C compiler core, lexer, parser, AST, TAC, WASM build notes
|   |-- backend/               # Express API for server-side compilation fallback
|   |-- docs/                  # Language spec, architecture, roadmap
|   `-- tests/                 # Native regression suite and generated dashboard
|-- diamond-ide/
|   |-- app/                   # Next.js app shell
|   |-- components/ide/        # IDE layout, panels, modals, hooks
|   |-- lib/                   # Runtime, WASM client, templates, reporting, analysis helpers
|   |-- public/                # Synced WASM/browser assets
|   `-- scripts/               # Asset sync and standalone run helpers
|-- .github/workflows/         # CI pipeline
|-- Report.md                  # Formal project report
`-- README.md                  # Main project overview
```

## Quick Start

### Run the IDE

```powershell
cd diamond-ide
npm install
npm run dev
```

### Run the backend

```powershell
cd diamond-compiler\backend
npm install
npm run dev
```

### Build the native compiler

```powershell
cd "d:\Projects\Compiler Project"
npm run build:native
```

### Common test commands

```powershell
cd "d:\Projects\Compiler Project"
npm test
npm --prefix diamond-ide run lint
npm --prefix diamond-ide run test:e2e
```

## Team Members And Roles

The following role structure reflects the current project organization.

| Member | Role | Reconstructed responsibilities |
|---|---|---|
| **Shakin Ahammed Emon** | Team Lead and Core Compiler Architect | Leads technical direction, maintains the overall compiler architecture, coordinates major design decisions, and drives the C-based core pipeline including AST design, semantic analysis, code generation, optimization, memory tracking, and execution logic. |
| **Abida Binte Atik** | Lead IDE Developer and Integration Architect | Designs and develops the Next.js web IDE, connects the compiler core to the browser through WebAssembly and API integration, and owns the student-facing editing, visualization, and state-management experience. |
| **Hasan Md. Diham** | Lexical and Syntax Engineer | Develops and refines the Flex lexer and Bison parser, translates the formal Diamond grammar into working tokens and productions, and strengthens syntax validation and recovery behavior. |
| **Bayzid Ahmed** | DevOps and Backend Infrastructure Engineer | Manages deployment and runtime infrastructure, maintains Docker and CI/CD workflows, supports backend execution environments, and keeps development and production services stable. |
| **Shahbaz Ali Chowdhury** | QA, Testing and Documentation Lead | Leads validation through valid and invalid test programs, organizes quality checks across compiler stages, and prepares formal academic documentation, reports, and user guidance for teachers and students. |

## Why This Project Is Useful In Class

- Students can connect theory with practice by seeing tokens, AST nodes, scopes, and TAC instead of only reading about them.
- Teachers can use the live IDE to demonstrate how a single source file moves through each compiler stage.
- The Bengali-inspired syntax lowers the entry barrier for beginners while still preserving formal compiler concepts.
- The project is suitable for lab presentations because it combines language design, compiler implementation, visualization, testing, and deployment.

## Current Limitations

- record values are lowered during preprocessing and cannot yet be passed directly as function parameters or returns
- the generated assembly is educational pseudo-assembly, not machine code
- program execution in the IDE is handled by an interpreter/debugger layer rather than a native runtime
- multi-file language support is preprocessing-based, not a full linker or project system

## Documentation Map

- [Project Report](./Report.md)
- [Language Specification](./diamond-compiler/docs/language-spec.md)
- [Compiler Architecture](./diamond-compiler/docs/compiler-architecture.md)
- [Project Roadmap](./diamond-compiler/docs/project-roadmap.md)
- [WASM Build Guide](./diamond-compiler/core/BUILD-WASM.md)
- [Contribution Guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## License

This project is released under the [MIT License](./LICENSE).
