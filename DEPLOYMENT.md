# 🚀 Deployment Guide — Diamond Compiler Project

This document covers deploying the Diamond Compiler project to production.

---

## Architecture Overview

```
┌─────────────┐         ┌──────────────────┐
│  diamond-ide │  ←───→  │  diamond-backend │
│  (Next.js)   │  REST   │  (Express.js)    │
│  Vercel/CDN  │         │  Docker/Railway  │
└─────────────┘         └──────────────────┘
       ↕                        ↕
  WASM in-browser         diamond binary
  (primary path)          (server fallback)
```

The IDE can operate in two modes:
1. **WASM-only (recommended):** The compiler runs entirely in the browser via WebAssembly. No backend required.
2. **Backend-assisted:** The IDE calls the backend `/api/v1/compile` endpoint as a fallback when WASM is unavailable.

---

## Frontend (diamond-ide)

### Vercel (Recommended)

1. Connect your GitHub repository to [Vercel](https://vercel.com)
2. Set the root directory to `diamond-ide`
3. The `vercel.json` is pre-configured with:
   - WASM-compatible security headers (COOP/COEP)
   - Aggressive caching for `/wasm/*` and `/workers/*` assets
4. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

For a local production smoke test after `npm run build`, you can run:

```bash
npm run start -- --hostname 0.0.0.0 --port 3000
```

### Docker (Self-Hosted)

```bash
cd diamond-ide
docker build -t diamond-ide .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:4000 diamond-ide
```

> **Note:** When using Docker, ensure `next.config.mjs` has `output: "standalone"` configured.

---

## Backend (diamond-compiler/backend)

### Docker (Recommended)

The backend Dockerfile is a multi-stage build that:
1. Compiles the Diamond compiler from C source using Flex, Bison, and GCC
2. Packages the binary with the Node.js API in a slim image
3. Runs as a non-root `diamond` user for security

```bash
cd diamond-compiler
docker build -f backend/Dockerfile -t diamond-backend .
docker run -p 4000:4000 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=https://your-ide-domain.vercel.app \
  diamond-backend
```

### Railway / Fly.io / Render

1. Set the Dockerfile path to `diamond-compiler/backend/Dockerfile`
2. Set the build context to `diamond-compiler/`
3. Configure environment variables (see below)

### Docker Compose (Local/Staging)

```bash
docker compose up --build
```

This starts both the backend (port 4000) and IDE (port 3000) with:
- Resource limits (2 CPU, 512 MB memory)
- Read-only filesystem (temp files via tmpfs)
- `no-new-privileges` security option

Inside Docker Compose, the IDE talks to the backend over the service hostname `http://backend:4000`.

---

## Environment Variables

### Backend

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` for deployed instances |
| `PORT` | `4000` | Server listen port |
| `DIAMOND_COMPILER_BIN` | `../../diamond.exe` | Path to the compiler binary |
| `CORS_ORIGIN` | `*` (dev only) | **Required in production.** Comma-separated allowed origins |
| `MAX_CONCURRENT` | `4` | Maximum simultaneous compilation processes |

> ⚠️ **CORS_ORIGIN must be explicitly set in production.** If it is omitted, the backend still starts but rejects cross-origin browser requests.

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | _(none)_ | Backend API URL (e.g., `https://api.diamond-lang.dev`) |

---

## TLS / HTTPS

The backend serves plain HTTP. TLS termination should be handled by:
- **Cloud platforms:** Railway, Render, Fly.io, and Vercel all provide automatic TLS.
- **Self-hosted:** Place NGINX or Caddy as a reverse proxy in front of the backend container.

The backend is pre-configured with `Strict-Transport-Security` headers via Helmet when `NODE_ENV=production`.

---

## Security Considerations

### Compiler Sandboxing

The backend executes arbitrary Diamond code via the native compiler binary. Security measures include:

1. **Docker-level isolation:** The Dockerfile runs the process as a non-root user (`diamond`) with `no-new-privileges`
2. **Resource limits:** Docker Compose restricts CPU and memory
3. **Read-only filesystem:** Only `/tmp` (via tmpfs, 64 MB, noexec) is writable
4. **Timeout:** Compilation processes are killed after 10 seconds (configurable)
5. **Rate limiting:** 60 requests per minute per IP address
6. **Input sanitization:** `amdani` (import) directives are stripped server-side to prevent filesystem access
7. **Size limits:** Source code capped at 64 KB

### WASM-Only Deployment

For maximum security, deploy the IDE **without** the backend. The WASM compiler runs entirely in the user's browser with no server-side code execution.

---

## Monitoring

- **Liveness:** `GET /api/v1/health/live` — Returns 200 if the process is running
- **Readiness:** `GET /api/v1/health/ready` — Returns 200 only when the compiler binary is available; 503 otherwise
- **Metrics:** Request IDs are included in every response (`X-Request-Id` header) and log entry
