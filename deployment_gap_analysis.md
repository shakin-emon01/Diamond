# 💎 Diamond Compiler — Pre-Deployment Gap Analysis

> **Date:** April 15, 2026  
> **Scope:** Full-stack analysis of the Diamond Compiler project (compiler core, backend API, web IDE, CI/CD, documentation)  
> **Goal:** Identify every gap that blocks or risks a production deployment, and provide actionable suggestions
> **Update:** Academic grading limitations regarding Type Safety, CFG grammar documentation, execution model clarity, symbol table visualization, and IDE error line highlighting have been officially resolved.
> **April 16, 2026 note:** The legacy `diamond-web` app has now been removed, Docker Compose wiring has been corrected, and the latest deployment snapshot lives in `DEPLOYMENT_READINESS.md`.

---

## Summary Dashboard

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Deployment Infrastructure | 2 | 2 | 1 | 1 | **6** |
| Security & Hardening | 1 | 3 | 2 | 0 | **6** |
| Backend API | 0 | 2 | 3 | 1 | **6** |
| Compiler Core (C) | 0 | 1 | 3 | 2 | **6** |
| Web IDE (Next.js) | 0 | 1 | 3 | 2 | **6** |
| Testing & QA | 0 | 2 | 2 | 1 | **5** |
| Documentation & Repo Hygiene | 0 | 1 | 3 | 2 | **6** |
| Performance & Scalability | 0 | 1 | 2 | 1 | **4** |
| **Total** | **3** | **13** | **19** | **10** | **45** |

---

## 1. Deployment Infrastructure

> [!CAUTION]
> No deployment configuration exists at all. This is the **single biggest blocker** for going live.

### 🔴 CRITICAL

#### 1.1 No Deployment Configuration Files
**Gap:** There is no `Dockerfile`, `docker-compose.yml`, `vercel.json`, `netlify.toml`, `railway.toml`, or any platform deployment manifest anywhere in the repository.

**Suggestion:**
- **Frontend (diamond-ide):** Add a `vercel.json` with WASM-friendly headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`) and appropriate caching rules for static WASM assets. Alternatively, create a `Dockerfile` for self-hosted deployment.
- **Backend (diamond-compiler/backend):** Create a `Dockerfile` that:
  1. Builds the native `diamond` compiler from source (multi-stage build with GCC/Flex/Bison in the build stage)
  2. Copies `diamond` binary and the Node.js backend into a slim runtime image
  3. Exposes port 4000
- **Compose:** Add a `docker-compose.yml` at the project root that runs both services together for local/staging validation.

#### 1.2 No Production Environment Configuration
**Gap:** The backend has `.env.example` but there is no documented or automated way to provision production secrets, set `NODE_ENV=production`, or configure CORS origins for a real domain.

**Suggestion:**
- Document required environment variables for production in a `DEPLOYMENT.md` file.
- Add a `diamond-ide/.env.example` with `NEXT_PUBLIC_API_URL` so the IDE can be pointed at the production backend.
- Add a production `start` script with `NODE_ENV=production` pre-set.

---

### 🟠 HIGH

#### 1.3 No HTTPS/TLS Strategy
**Gap:** The backend server boots a raw HTTP `app.listen()` with no TLS termination guidance. In production, compiler payloads would travel unencrypted.

**Suggestion:**
- Document the expected reverse-proxy setup (NGINX, Caddy, or cloud load-balancer) for TLS termination.
- If deploying to Railway/Render/Fly.io, document that TLS is handled by the platform.
- Add `Strict-Transport-Security` header via Helmet configuration.

#### 1.4 No CI/CD Deployment Pipeline
**Gap:** The existing GitHub Actions CI only runs tests. It does not build a Docker image, push to a registry, or deploy to any hosting provider.

**Suggestion:**
- Add a `deploy` job to `.github/workflows/ci.yml` (or a separate `deploy.yml`) that:
  - Builds and pushes a Docker image to GHCR/Docker Hub on `main` branch pushes
  - Triggers deployment to Vercel (IDE) and Railway/Fly.io (backend) via platform webhooks or CLI

---

### 🟡 MEDIUM

#### 1.5 Legacy `diamond-web` Removal
**Status:** Resolved on April 16, 2026. The deprecated frontend has been removed so the repository now deploys a single maintained IDE surface (`diamond-ide`).

**Follow-up suggestion:**
- Keep future deployment, documentation, and CI work scoped to `diamond-ide` only.

---

### 🟢 LOW

#### 1.6 WASM CDN Caching Not Configured
**Gap:** WASM files (`diamond.js` ~56KB, `diamond.wasm` ~71KB) are served as regular static assets with no explicit cache-control headers or versioning.

**Suggestion:**
- Add content-hash filenames or query-string versioning to WASM assets.
- Configure aggressive caching headers (`Cache-Control: public, max-age=31536000, immutable`) for versioned WASM files.
- In Next.js config, add custom headers for `/wasm/*` and `/workers/*`.

---

## 2. Security & Hardening

> [!WARNING]
> The backend allows **arbitrary code execution** via the native compiler binary. Without strict sandboxing, this is a major attack surface.

### 🔴 CRITICAL

#### 2.1 No Compiler Process Sandboxing
**Gap:** The `/compile` endpoint writes user code to a temp file and executes `diamond.exe` with `child_process.execFile()`. There is no container-level, chroot, or cgroup isolation. A crafted input exploiting a compiler bug could escape the process boundary.

**Suggestion:**
- **Short-term:** Run the compiler process as a least-privilege user, with `ulimit` restrictions (CPU time, memory, file descriptors). On Linux, use `unshare` or `nsjail` for namespace isolation.
- **Long-term:** Run each compilation in a disposable Docker container or Firecracker microVM with no network access, a read-only filesystem, and a strict timeout.
- **Alternative:** Encourage WASM-only deployment for public use, where the compiler runs entirely client-side with no server exposure.

---

### 🟠 HIGH

#### 2.2 No Input Sanitization Beyond Null Bytes
**Gap:** `sanitiseCode()` in [app.js](file:///d:/Projects/Compiler%20Project/diamond-compiler/backend/src/app.js#L33-L35) only strips `\0` characters. It does not guard against:
- Path traversal strings in module import directives (`amdani "../../etc/passwd";`)
- Extremely nested/recursive structures that crash the compiler
- Shell metacharacters (though `execFile` mitigates most injection risks)

**Suggestion:**
- Strip or reject `amdani` import directives on the server, since module imports reference the server filesystem.
- Impose a maximum nesting depth or AST node count.
- Add an explicit character-class allowlist or blocklist for dangerous patterns.

#### 2.3 `trust proxy` Set Without Rate-Limit IP Verification
**Gap:** `app.set("trust proxy", 1)` trusts the first proxy's `X-Forwarded-For` header for rate-limiting. Behind an untrusted or misconfigured proxy, attackers can spoof IPs to bypass rate limits.

**Suggestion:**
- Document the expected proxy topology.
- Consider using an industry-standard rate-limiter like `express-rate-limit` with a Redis or Memcached store for multi-instance deployments.

#### 2.4 CORS Defaults to `*` (Wildcard)
**Gap:** When `CORS_ORIGIN` is not set, CORS allows all origins. This is fine for development but dangerous in production.

**Suggestion:**
- Change the default for `NODE_ENV=production` to reject requests if `CORS_ORIGIN` is not explicitly configured.
- Log a warning at startup when `CORS_ORIGIN` is unset.

---

### 🟡 MEDIUM

#### 2.5 No Request Logging Persistence
**Gap:** Morgan logs to stdout only. There is no structured logging, no log rotation, and no way to investigate incidents after the fact.

**Suggestion:**
- Use a structured logger (e.g., Pino or Winston) with JSON output.
- In production, pipe to a log aggregation service (Datadog, Grafana Loki, etc.) or at minimum write to rotating log files.

#### 2.6 Compiler Binary Path Exposed in `/health`
**Gap:** The `/health` endpoint returns `compiler.path` — the absolute filesystem path to the compiler binary. This leaks internal server directory structure.

**Suggestion:**
- In production mode, redact `compiler.path` or replace it with a boolean `compiler.available`.
- Only expose detailed diagnostics behind an API key or internal endpoint.

---

## 3. Backend API

### 🟠 HIGH

#### 3.1 No Graceful Shutdown
**Gap:** [server.js](file:///d:/Projects/Compiler%20Project/diamond-compiler/backend/src/server.js) calls `app.listen()` without handling `SIGTERM`/`SIGINT`. Active compilation requests will be forcefully killed on restart or deploy.

**Suggestion:**
```js
const server = app.listen(PORT, () => { ... });

process.on('SIGTERM', () => {
  server.close(() => {
    cleanup();
    process.exit(0);
  });
});
```

#### 3.2 No Health Check Readiness vs. Liveness Distinction
**Gap:** `/health` returns `status: "ok"` even when the compiler binary is missing (`compiler.available: false`). Orchestrators (K8s, ECS) would route traffic to an instance that can't actually compile.

**Suggestion:**
- Add `/health/ready` that returns 503 when the compiler is unavailable.
- Keep `/health/live` as a simple liveness probe.

---

### 🟡 MEDIUM

#### 3.3 Rate Limiter Is In-Memory Only
**Gap:** The custom rate limiter uses a JavaScript `Map` that is local to a single process. In a multi-instance deployment, each instance has its own independent rate-limit state.

**Suggestion:**
- For single-instance deployment, the current approach is acceptable.
- For multi-instance, replace with `express-rate-limit` + Redis store.

#### 3.4 No API Versioning
**Gap:** Routes are `/health` and `/compile` with no version prefix (`/v1/`). Any breaking change to the response schema will break existing clients.

**Suggestion:**
- Prefix all routes with `/api/v1/`.
- Add `X-API-Version` response header.

#### 3.5 No Request ID or Correlation Tracing
**Gap:** Compilation requests have no unique identifier, making it hard to correlate logs, debug issues, or track specific compilations.

**Suggestion:**
- Generate a `request-id` via middleware (UUID v4) and include it in every response and log entry.

---

### 🟢 LOW

#### 3.6 No OpenAPI/Swagger Documentation
**Gap:** API endpoints are undocumented except in the README. There is no machine-readable API specification.

**Suggestion:**
- Add a Swagger/OpenAPI spec (`openapi.yaml`) and serve it via `swagger-ui-express` at `/docs`.

---

## 4. Compiler Core (C / Flex / Bison)

### 🟠 HIGH

#### 4.1 Fixed-Size Error Buffer (128 Entries)
**Gap:** In [driver.c](file:///d:/Projects/Compiler%20Project/diamond-compiler/core/driver.c#L44), `g_errors` is a fixed array of 128 entries. A maliciously crafted program with hundreds of errors will silently drop subsequent diagnostics.

**Suggestion:**
- Switch to a dynamically-growing error list (similar to the token list approach).
- Or, hard-fail after a configurable maximum error count (e.g., 50) with a "too many errors, stopping" message.

---

### 🟡 MEDIUM

#### 4.2 Symbol Table Is a Linear Linked-List
**Gap:** `symtab_lookup()` in [symtab.c](file:///d:/Projects/Compiler%20Project/diamond-compiler/core/symtab.c#L147-L158) performs a linear scan of all symbols. For large programs, this becomes O(n²) over the lifetime of compilation.

**Suggestion:**
- Replace with a hash-table implementation for O(1) average-case lookups.
- This is a **medium** priority since most Diamond programs are short educational examples.

#### 4.3 No Maximum Input Size Enforcement in Native Binary
**Gap:** The standalone `diamond.exe` reads entire files into memory with no size limit. An attacker providing an extremely large `.diu` file could exhaust memory.

**Suggestion:**
- Add a maximum file-size check in `read_file_to_string()` (e.g., 1 MB).
- The backend API already enforces 64 KB, but the CLI doesn't.

#### 4.4 Generated Files (lex.yy.c, parser.tab.c/h) Are Committed
**Gap:** Generated C source from Flex and Bison is committed to the repository. This creates noisy diffs, merge conflicts, and potential staleness if someone edits `lexer.l` or `parser.y` without regenerating.

**Suggestion:**
- **Option A:** Add `core/lex.yy.c`, `core/parser.tab.c`, `core/parser.tab.h` to `.gitignore` and generate them in CI.
- **Option B:** Keep them committed (for environments without Flex/Bison) but document the workflow and add a CI step to verify they're up-to-date.

---

### 🟢 LOW

#### 4.5 `diamond.exe` Binary Is Committed to Git
**Gap:** The pre-built Windows binary (`diamond.exe`, 176 KB) is version-controlled. Git is not designed for binary files, and the binary may be out of sync with the source code.

**Suggestion:**
- Remove `diamond.exe` from version control.
- Build it in CI and distribute as a GitHub Release artifact.
- If keeping for convenience, add a CI check that rebuilds and verifies binary content hash matches.

#### 4.6 `preprocess.c` Is Very Large (41 KB)
**Gap:** The preprocessor implementation is a single ~41 KB C file, which is hard to maintain and review.

**Suggestion:**
- Consider splitting into smaller modules (e.g., `import_resolver.c`, `record_expander.c`).
- This is low priority but improves long-term maintainability.

---

## 5. Web IDE (diamond-ide)

### 🟠 HIGH

#### 5.1 No Connection to Backend API
**Gap:** The IDE's [wasm-client.ts](file:///d:/Projects/Compiler%20Project/diamond-ide/lib/wasm-client.ts) only uses WASM (in-browser) or falls back to the mock compiler. There is **no code path** that calls the backend `/compile` API. The backend exists but is disconnected from the IDE.

**Suggestion:**
- Add a `NEXT_PUBLIC_API_URL` environment variable.
- Implement a `compileViaBackend()` function that calls `POST /compile`.
- Use it as a fallback tier: WASM Worker → WASM Main Thread → Backend API → Mock Demo.
- This is critical for environments where WASM doesn't load (e.g., older browsers, CI screenshots).

---

### 🟡 MEDIUM

#### 5.2 No Error Boundary for Runtime Crashes
**Gap:** If the WASM module crashes, the React error boundary is not defined at the application level. An unhandled error in `compileDiamond()` or the ReactFlow visualizations could white-screen the entire app.

**Suggestion:**
- Add a top-level React Error Boundary component in `layout.tsx` or `diamond-ide-page.tsx`.
- Show a friendly "Something went wrong — reload" message instead of a blank screen.

#### 5.3 No Loading/Splash State for WASM Initialization
**Gap:** When the IDE first loads, it silently tries to load the WASM bundle. There is no visible indicator to the user about whether WASM is loading, loaded, or failed.

**Suggestion:**
- Add a skeleton or progress indicator during WASM initialization.
- Show a clear badge in the status bar: "WASM Loading…" → "WASM Ready" or "Demo Mode".

#### 5.4 `next.config.mjs` Has No Production Optimizations
**Gap:** The Next.js config only has `reactStrictMode: true`. It lacks:
- Security headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` for SharedArrayBuffer/WASM)
- Image optimization disabled (no images to optimize, but explicit is better)
- Output configuration for static export if desired

**Suggestion:**
```js
const nextConfig = {
  reactStrictMode: true,
  headers: async () => [{
    source: '/(.*)',
    headers: [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    ],
  }],
};
```

---

### 🟢 LOW

#### 5.5 No PWA / Offline Support
**Gap:** The IDE could work entirely offline (WASM is client-side), but there is no service worker or PWA manifest.

**Suggestion:**
- Add `next-pwa` or a manual service worker to cache WASM assets and the app shell.
- This would make the IDE usable in classrooms with unreliable internet.

#### 5.6 No Favicon
**Gap:** The public directory has WASM assets and a README but no favicon or Open Graph image for social sharing.

**Suggestion:**
- Add `favicon.ico`, `apple-touch-icon.png`, and OG images to `diamond-ide/app/`.
- Use the existing `Diamond.png` as the source for generating favicons.

---

## 6. Testing & Quality Assurance

### 🟠 HIGH

#### 6.1 E2E Tests Are Minimal
**Gap:** The Playwright test suite ([ide.e2e.ts](file:///d:/Projects/Compiler%20Project/diamond-ide/tests/ide.e2e.ts)) has only **2 tests**: checking the shortcuts modal and running the test suite panel. There are no E2E tests for:
- Compiling code and seeing output
- Switching templates
- AST/Flowchart/Token panel rendering
- Dark/light theme toggling
- File open/download
- Error diagnostics navigation

**Suggestion:**
- Add at least 10-15 E2E test cases covering the core user journeys.
- Add visual regression screenshots using Playwright's `toHaveScreenshot()`.

#### 6.2 No Test Coverage Reporting
**Gap:** Vitest coverage is explicitly disabled (`coverage: { enabled: false }`). The backend uses Node's built-in test runner with no coverage tool. There is no way to know what percentage of code is tested.

**Suggestion:**
- Enable `coverage: { enabled: true, reporter: ['text', 'lcov'] }` in `vitest.config.ts`.
- Add `c8` or Istanbul coverage to backend tests.
- Add a coverage threshold (e.g., 60% minimum) as a CI gate.

---

### 🟡 MEDIUM

#### 6.3 Backend Tests Use a Fake Compiler
**Gap:** Backend tests in [backend.test.js](file:///d:/Projects/Compiler%20Project/diamond-compiler/backend/tests/backend.test.js) use `fixtures/fake-compiler.cjs` — they never invoke the real `diamond.exe`. Integration bugs between the backend and compiler are undetected.

**Suggestion:**
- Add a separate integration test suite that uses the real compiler binary (guarded by a CI step that first builds `diamond`).
- Keep the existing fake-compiler tests for fast unit testing.

#### 6.4 No Load/Stress Testing
**Gap:** There are no load tests to validate how the backend handles concurrent compilation requests.

**Suggestion:**
- Add a simple `k6` or `autocannon` script that simulates 50-100 concurrent `/compile` requests.
- Validate that rate limiting kicks in correctly and the server doesn't OOM.

---

### 🟢 LOW

#### 6.5 Playwright Only Tests Chromium + Pixel 7
**Gap:** The E2E suite tests Desktop Chrome and Pixel 7 only. Firefox and Safari are not tested.

**Suggestion:**
- Add Firefox and WebKit projects to `playwright.config.ts`.
- At minimum, run a smoke test on WebKit to catch Safari-specific WASM issues.

---

## 7. Documentation & Repository Hygiene

### 🟠 HIGH

#### 7.1 No LICENSE File
**Gap:** The README states "This is an academic project developed for educational purposes" but there is no `LICENSE` or `LICENSE.md` file. Without a license, the project is legally non-distributable — no one else can use, modify, or deploy it.

**Suggestion:**
- Add a license file. For an educational project, **MIT** or **Apache-2.0** are good choices.
- If the project should remain restricted, add an explicit "All Rights Reserved" notice.

---

### 🟡 MEDIUM

#### 7.2 No CONTRIBUTING.md
**Gap:** There are no contributor guidelines — coding standards, PR process, branch naming, commit message conventions, or development setup instructions.

**Suggestion:**
- Create a `CONTRIBUTING.md` with:
  - Development environment setup (Windows + WSL)
  - Branch and PR workflow
  - Code formatting standards (`.clang-format` exists for C but no enforced TS/JS formatting)
  - How to run tests locally

#### 7.3 No CHANGELOG
**Gap:** There is no `CHANGELOG.md` tracking version history, breaking changes, or feature additions.

**Suggestion:**
- Add a `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format.
- Consider using automated changelog generation from commit history.

#### 7.4 Build Scripts Are Windows-Only
**Gap:** `build.ps1`, `build-wasm.ps1`, and `run.ps1` are all PowerShell scripts. Linux/macOS developers have no direct equivalent (though `build-native.mjs` provides a cross-platform Node.js alternative).

**Suggestion:**
- Ensure all build paths are covered by Node.js scripts (the existing `build-native.mjs` is a good start).
- Add equivalent shell scripts, or document the manual commands for Linux/macOS.

---

### 🟢 LOW

#### 7.5 `Report.md` Contains Academic Content
**Gap:** `Report.md` (52 KB) is an academic lab report. It should be clearly separated from deployment-facing documentation.

**Suggestion:**
- Move to a `docs/` folder or keep in root but ensure it's not confused with deployment docs.

#### 7.6 Repository Name Has a Space
**Gap:** The project directory is `"Compiler Project"` with a space. This can cause issues with some build tools, scripts, and CI configurations.

**Suggestion:**
- If this is the GitHub repo name, consider renaming to `diamond-compiler` or `diamond-lang`.
- Spaces in paths are a common source of build failures.

---

## 8. Performance & Scalability

### 🟠 HIGH

#### 8.1 Backend Is Single-Process, Blocking Per Compilation
**Gap:** The Express server runs as a single Node.js process. Each `/compile` request spawns a `diamond.exe` child process and blocks the event loop until it returns. Under concurrent load, the server can only handle as many parallel compilations as the OS allows child processes.

**Suggestion:**
- Run the backend with Node.js `cluster` module or use PM2 with multiple workers.
- Add a compilation queue (e.g., Bull/BullMQ with Redis) to limit concurrent compiler invocations and prevent resource exhaustion.
- Set a hard cap on simultaneous compiled processes (e.g., max 4-8 concurrent).

---

### 🟡 MEDIUM

#### 8.2 Temp File Creation Per Request
**Gap:** Every compilation request creates a temp file, writes the code, invokes the compiler, and deletes the file. This introduces filesystem I/O overhead and potential temp-file leaks on crash.

**Suggestion:**
- The native compiler supports `diamond_compile()` (string input via WASM). Consider adding a `--stdin` flag to `diamond.exe` to accept code via pipe instead of file.
- This eliminates temp file management entirely.

#### 8.3 WASM Worker Not Shared Across Tabs
**Gap:** Each browser tab creates its own WASM worker instance, loading the same 71 KB binary. There is no SharedWorker for users who open multiple IDE tabs.

**Suggestion:**
- Consider using a `SharedWorker` to share one WASM instance across tabs.
- This is a polish optimization — low urgency.

---

### 🟢 LOW

#### 8.4 No Response Compression
**Gap:** The Express backend does not use `compression` middleware. Large JSON responses (token lists, TAC arrays) are sent uncompressed.

**Suggestion:**
- Add `app.use(compression())` in `createApp()`.
- Install the `compression` npm package.

---

## 🗺️ Recommended Action Plan

### Phase 1 — Critical Blockers (Must-Have for Deployment)
| # | Action | Priority |
|---|---|---|
| 1 | Create `Dockerfile` for backend + compiler binary | 🔴 Critical |
| 2 | Add `vercel.json` for IDE with WASM headers | 🔴 Critical |
| 3 | Add compiler sandboxing (nsjail or Docker per-request) | 🔴 Critical |
| 4 | Add LICENSE file | 🟠 High |
| 5 | Lock down CORS to explicit origins in production | 🟠 High |
| 6 | Add graceful shutdown to backend | 🟠 High |

### Phase 2 — High Priority (Should-Have Before Public Launch)
| # | Action | Priority |
|---|---|---|
| 7 | Strip `amdani` imports in backend sanitiser | 🟠 High |
| 8 | Add IDE ↔ Backend API integration | 🟠 High |
| 9 | Expand E2E tests to 10+ core journeys | 🟠 High |
| 10 | Enable test coverage reporting in CI | 🟠 High |
| 11 | Add deployment CI pipeline (build + push + deploy) | 🟠 High |
| 12 | Add TLS / HTTPS documentation | 🟠 High |
| 13 | Backend multi-process (PM2/cluster) | 🟠 High |

### Phase 3 — Medium Priority (Quality Improvements)
| # | Action | Priority |
|---|---|---|
| 14 | Keep the repo on a single maintained frontend (`diamond-ide`) | ✅ Done |
| 15 | Add Error Boundary to IDE | 🟡 Medium |
| 16 | Add `next.config.mjs` security headers | 🟡 Medium |
| 17 | API versioning (`/api/v1/`) | 🟡 Medium |
| 18 | Dynamic error buffer in compiler | 🟡 Medium |
| 19 | Add `CONTRIBUTING.md` and `CHANGELOG.md` | 🟡 Medium |
| 20 | Cross-platform build scripts | 🟡 Medium |

### Phase 4 — Polish (Nice-to-Have)
| # | Action | Priority |
|---|---|---|
| 21 | WASM CDN caching with content hashing | 🟢 Low |
| 22 | PWA / service worker for offline use | 🟢 Low |
| 23 | Favicon and OG images | 🟢 Low |
| 24 | OpenAPI documentation | 🟢 Low |
| 25 | Response compression | 🟢 Low |

---

> [!IMPORTANT]
> The project is architecturally solid — the compiler pipeline, IDE feature set, and CI coverage are impressive for an educational project. The primary gaps are **operational** (deployment, security hardening, production infrastructure) rather than **functional**. Addressing **Phase 1** (6 items) would make the project safely deployable; **Phase 2** (7 items) would make it production-grade.
