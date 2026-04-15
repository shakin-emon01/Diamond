# Deployment Readiness

> Updated: April 16, 2026

This file is the current deployment handoff snapshot for the Diamond project. It complements the larger historical audit in `deployment_gap_analysis.md` and focuses on the state of the repo after the latest cleanup pass.

## Completed in this pass

- Fixed wheel scrolling so the page continues to scroll while the cursor is over the Monaco editor and console surfaces in `diamond-ide`.
- Added a Playwright regression test for the editor/input/output wheel-scroll path.
- Corrected `docker-compose.yml` to build the backend from `diamond-compiler/backend/Dockerfile`.
- Corrected the IDE container's backend URL in Docker Compose to use the internal service hostname (`http://backend:4000`).
- Added cross-platform production launcher scripts for the backend so `npm start` and `npm run start:cluster` work on Windows as well as Linux.
- Added a standalone server launcher for Docker-style local checks when the environment supports the standalone Next.js server directly.
- Removed the deprecated `diamond-compiler/diamond-web/` frontend from the workspace.
- Removed stale generated frontend artifacts from `diamond-ide` (`.next/`, `coverage/`, `test-results/`, `tsconfig.tsbuildinfo`) after validation.
- Updated deployment and architecture documentation to reflect the current one-frontend layout.

## Current deployable services

### Frontend

- Path: `diamond-ide/`
- Mode: Next.js 16 standalone server
- Primary compiler path: WebAssembly worker
- Fallback compiler path: backend API via `NEXT_PUBLIC_API_URL`

### Backend

- Path: `diamond-compiler/backend/`
- Mode: Express.js API plus native compiler binary
- Primary endpoints:
  - `GET /api/v1/health`
  - `GET /api/v1/health/live`
  - `GET /api/v1/health/ready`
  - `POST /api/v1/compile`

## Pre-deployment checklist

- Set `NEXT_PUBLIC_API_URL` in `diamond-ide/.env.local` when using the backend fallback.
- Set `CORS_ORIGIN` for the real frontend domain before starting the backend in production.
- Build the native compiler or backend image before enabling server-side compilation.
- Run:
  - `npm --prefix diamond-ide run lint`
  - `npm --prefix diamond-ide run test:unit`
  - `npm --prefix diamond-ide run test:e2e`
  - `npm --prefix diamond-compiler/backend run test`
  - `npm test`

## Remaining non-code decisions

- Choose the hosting target pair:
  - `diamond-ide` on Vercel
  - `diamond-backend` on Railway / Fly.io / Render / Docker host
- Decide whether the public deployment should expose the backend fallback or stay WASM-only.
- Provision production domains and secrets for `NEXT_PUBLIC_API_URL` and `CORS_ORIGIN`.
