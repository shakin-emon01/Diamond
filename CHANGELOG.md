# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- **Deployment readiness note**: Added `DEPLOYMENT_READINESS.md` as the current handoff file for deployment prep.
- **IDE production runner**: Added `diamond-ide/scripts/start-standalone.mjs` and `npm run start:standalone` for Docker-style local checks against the standalone build artifact.
- **Backend production runners**: Added cross-platform Node launchers for `npm start` and `npm run start:cluster`.
- **Deployment infrastructure**: Dockerfile for backend (multi-stage build with compiler), Dockerfile for IDE, `docker-compose.yml`, and `vercel.json` with WASM-friendly headers.
- **Production configuration**: `DEPLOYMENT.md` deployment guide, `.env.example` for both backend and IDE.
- **Security hardening**: Input sanitization strips `amdani` import directives server-side, CORS locked down in production, compiler path redacted from health endpoint, request ID middleware.
- **API improvements**: Versioned routes (`/api/v1/`), separate liveness (`/health/live`) and readiness (`/health/ready`) probes, graceful shutdown on SIGTERM/SIGINT, response compression, cluster mode support.
- **IDE enhancements**: Backend API fallback in `wasm-client.ts`, React Error Boundary, WASM loading state indicator, PWA manifest, favicon and OG metadata.
- **Compiler core**: Dynamic error buffer (no more 128 cap), max file size enforcement (1 MB) in CLI.
- **Testing**: Expanded E2E tests (10+ user journeys), Vitest coverage enabled, load test script, Firefox and WebKit in Playwright config.
- **CI/CD**: Docker image build and push pipeline on `main` branch.
- **Documentation**: `LICENSE` (MIT), `CONTRIBUTING.md`, `CHANGELOG.md`, `DEPLOYMENT.md`.
- **OpenAPI**: Machine-readable API specification at `openapi.yaml`.

### Changed
- Backend routes prefixed with `/api/v1/`.
- Health endpoint no longer exposes filesystem paths in production.
- CORS defaults to rejecting unknown origins when `NODE_ENV=production`.
- `next.config.mjs` now includes security headers, WASM caching, and standalone output for Docker.
- Repository now uses `diamond-ide` as the single maintained frontend surface.

### Fixed
- Graceful shutdown prevents in-flight compilations from being killed during deploys.
- Dynamic error buffer prevents silent error loss on programs with many issues.
- File size limit prevents memory exhaustion on oversized `.diu` files.
- Editor and console wheel events now hand off to page scrolling when their inner surfaces cannot scroll further.
- Docker Compose now points at the backend Dockerfile correctly and routes IDE backend calls through the internal service hostname.

---

## [1.0.0] — 2026-04-07

### Added
- Diamond language with Bengali-inspired keywords.
- Flex-based lexer with 40+ token types.
- Bison-based parser with 60+ grammar productions.
- AST construction (24 node types) and visualization.
- Symbol table with scope management.
- Semantic analysis (types, scopes, declarations).
- Three-Address Code generation with optimizer.
- Pseudo-assembly generation.
- JSON export for all compiler artifacts.
- WebAssembly build via Emscripten.
- Web IDE with Monaco Editor, ReactFlow AST/flowchart visualization.
- Client-side program interpreter and step-through debugger.
- Code formatter, cheatsheet, coding challenges, and test suite.
- Express.js backend with `/compile` endpoint.
- GitHub Actions CI pipeline for lint, unit, backend, and E2E tests.
- Cross-platform native compiler builds (Windows + Linux).
