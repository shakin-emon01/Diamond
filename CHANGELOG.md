# Changelog

This file records high-level project changes that matter for documentation, presentation, and release tracking.

## [Unreleased]

### Documentation

- rewrote the main README to present the full project in a cleaner academic format
- replaced the old report with a shorter version aligned with the current compiler and IDE
- refreshed the language specification, architecture note, roadmap, contribution guide, and WASM asset notes
- updated the team member list and role descriptions for the current university project presentation

### Product snapshot

- Diamond currently includes a C/Flex/Bison compiler core with preprocessing, AST generation, semantic analysis, TAC, optimization reporting, and pseudo-assembly output
- the web IDE currently includes Monaco editing, template loading, run and debug tools, analysis dashboards, coding challenges, and HTML report export
- the browser compilation pipeline currently prefers a Web Worker WASM compiler, then main-thread WASM, then backend API fallback, then demo mode

## [1.0.0] - 2026-04-07

### Initial integrated release

- custom Diamond language with Bengali-inspired keywords
- compiler front end with lexer, parser, AST, symbol table, diagnostics, TAC, and JSON output
- WebAssembly integration for in-browser use
- modern Next.js IDE with analysis panels and visual learning tools
- backend API for compilation fallback
- automated testing and CI support
