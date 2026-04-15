# Contributing to Diamond Compiler

Thank you for your interest in contributing! This document explains how to set up the project, follow coding conventions, and submit changes.

---

## Development Environment

### Prerequisites

| Tool | Required For | Install |
|---|---|---|
| **Node.js** (>= 18) | Web IDE & Backend | [nodejs.org](https://nodejs.org) |
| **Flex / WinFlexBison** | Lexer generation | [winflexbison](https://github.com/lexxmark/winflexbison) |
| **Bison / WinFlexBison** | Parser generation | (bundled with WinFlexBison) |
| **GCC / MinGW** | Native compiler build | [mingw-w64.org](https://www.mingw-w64.org) |

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd "Compiler Project"

# Install IDE dependencies
cd diamond-ide
npm install

# Sync WASM assets (if compiler is pre-built)
npm run sync:wasm

# Start the IDE
npm run dev

# Start a production-like IDE server after building
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000

# (Optional) Install and start the backend
cd ../diamond-compiler/backend
npm install
npm run dev
npm start
```

---

## Project Structure

- `diamond-compiler/core/` — C source for the compiler (Flex, Bison, AST, symbol table, TAC)
- `diamond-compiler/backend/` — Express.js API server
- `diamond-ide/` — Next.js web IDE (primary frontend)
- `.github/workflows/` — CI pipeline

---

## Coding Standards

### C Code (Compiler Core)

- Follow the `.clang-format` configuration in `diamond-compiler/`
- Use C99-compatible syntax (no C++ features)
- All functions and types use `snake_case`
- Header guards use `DIAMOND_` prefix
- Memory: every `malloc`/`calloc` must have a corresponding `free` path

### TypeScript / JavaScript (IDE & Backend)

- Use TypeScript strict mode for all IDE code
- Backend uses CommonJS (`require`); IDE uses ES modules (`import`)
- No `any` types without explicit justification
- Use `eslint` with the project's existing config: `npm run lint`
- Prefer named exports over default exports

### Commit Messages

Use conventional commit format:

```
type(scope): short description

Optional longer description.
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

Examples:
- `feat(compiler): add modulo operator support`
- `fix(ide): prevent crash on empty AST`
- `docs(readme): update build instructions`

---

## Running Tests

```bash
# All tests (native + IDE unit + backend)
npm test

# IDE unit tests only
npm --prefix diamond-ide run test:unit

# IDE E2E browser tests
npm --prefix diamond-ide run test:e2e

# Backend API tests
npm --prefix diamond-compiler/backend run test

# Native compiler regression
npm run test:native

# Lint
npm --prefix diamond-ide run lint
```

---

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`
2. **Write tests** for any new functionality
3. **Run the full test suite** locally before pushing
4. **Open a PR** with a clear title and description
5. PRs require passing CI checks before merging
6. Keep PRs focused — one feature or fix per PR

---

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps, expected vs. actual behavior, and relevant logs
- For compiler bugs, include the `.diu` source code that triggers the issue

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
