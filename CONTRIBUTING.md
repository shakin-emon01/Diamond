# Contributing To Diamond

This guide is written for students, teammates, and reviewers who want to improve the project without losing consistency across the compiler, IDE, and documentation.

## Before You Start

- read the main [README.md](./README.md) for the project overview
- check the [language specification](./diamond-compiler/docs/language-spec.md) before changing grammar-related behavior
- check the [compiler architecture note](./diamond-compiler/docs/compiler-architecture.md) before changing pipeline behavior

## Recommended Prerequisites

| Tool | Why it is needed |
|---|---|
| Node.js 20 or later | IDE, scripts, tests, backend |
| Flex / WinFlexBison | lexer generation |
| Bison / WinFlexBison | parser generation |
| GCC / MinGW | native compiler build |
| Emscripten | WebAssembly build |

## Local Setup

### IDE

```powershell
cd diamond-ide
npm install
npm run dev
```

### Backend

```powershell
cd diamond-compiler\backend
npm install
npm run dev
```

### Native compiler

```powershell
cd "d:\Projects\Compiler Project"
npm run build:native
```

## Common Commands

```powershell
# workspace-level checks
npm test

# native regression suite
npm run test:native

# IDE checks
npm --prefix diamond-ide run lint
npm --prefix diamond-ide run test:unit
npm --prefix diamond-ide run test:e2e

# backend checks
npm --prefix diamond-compiler/backend run test
```

## Contribution Rules

### Compiler changes

- keep the language behavior consistent with `diamond-compiler/docs/language-spec.md`
- update documentation when keywords, grammar, diagnostics, or code generation behavior changes
- preserve educational clarity; the project should remain easy to explain in a lab defense

### IDE changes

- keep the student workflow simple: edit, compile, inspect, run, debug
- if a new analysis panel is added, document it in the README and report
- prefer interfaces that help teachers demonstrate compiler stages clearly

### Documentation changes

- keep explanations understandable for students and teachers
- remove outdated claims instead of leaving conflicting notes in place
- if a file is generated, note that clearly in the document

## Pull Request Expectations

- keep pull requests focused on one main improvement
- run relevant tests before submitting
- describe what changed, why it changed, and how it was verified
- include screenshots for visible IDE changes when helpful

## Suggested Commit Types

- `feat`: new functionality
- `fix`: bug fix
- `docs`: documentation update
- `refactor`: structure improvement without feature change
- `test`: new or updated tests
- `ci`: workflow or automation update

## Final Check Before Merge

- code or docs match the current implementation
- no stale screenshots, links, or team information remain
- the README, report, and technical docs still agree with each other

## License

By contributing, you agree that contributions remain under the [MIT License](./LICENSE).
