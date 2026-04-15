const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

/* ────────────────────────────────────────────────────────────────────── */
/*  Configuration                                                       */
/* ────────────────────────────────────────────────────────────────────── */

function createConfig(overrides = {}) {
  return {
    nodeEnv: overrides.nodeEnv || process.env.NODE_ENV || "development",
    compilerBin:
      overrides.compilerBin ||
      process.env.DIAMOND_COMPILER_BIN ||
      path.resolve(__dirname, "..", "..", "diamond.exe"),
    maxCodeBytes: overrides.maxCodeBytes ?? 64 * 1024,
    maxCompileMs: overrides.maxCompileMs ?? 10_000,
    rateWindowMs: overrides.rateWindowMs ?? 60_000,
    rateMaxRequests: overrides.rateMaxRequests ?? 60,
    maxConcurrent: overrides.maxConcurrent ?? (parseInt(process.env.MAX_CONCURRENT, 10) || 4)
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Errors                                                              */
/* ────────────────────────────────────────────────────────────────────── */

class CompilationError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "CompilationError";
    this.statusCode = statusCode;
  }
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Sanitisation  (Gap 2.2 — strip amdani imports + null bytes)         */
/* ────────────────────────────────────────────────────────────────────── */

function sanitiseCode(code) {
  let sanitised = code.replace(/\0/g, "");

  // Strip amdani (import) directives — they reference the server filesystem
  // and must not be allowed in server-side compilation.
  sanitised = sanitised.replace(/^\s*amdani\s+"[^"]*"\s*;/gm, "// [import stripped by server]");

  return sanitised;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Compiler invocation helpers                                         */
/* ────────────────────────────────────────────────────────────────────── */

function resolveCompilerCommand(compilerBin, filePath) {
  const extension = path.extname(compilerBin).toLowerCase();

  if ([".js", ".cjs", ".mjs"].includes(extension)) {
    return {
      bin: process.execPath,
      args: [compilerBin, filePath]
    };
  }

  return {
    bin: compilerBin,
    args: [filePath]
  };
}

function writeTempFile(code) {
  const tmpDir = os.tmpdir();
  const fileName = `diamond_${crypto.randomBytes(8).toString("hex")}.diu`;
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, code, "utf-8");
  return filePath;
}

function cleanupTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best effort cleanup.
  }
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Concurrency limiter  (Gap 8.1 — cap simultaneous compilations)      */
/* ────────────────────────────────────────────────────────────────────── */

function createConcurrencyLimiter(maxConcurrent) {
  let active = 0;

  return {
    tryAcquire() {
      if (active >= maxConcurrent) return false;
      active++;
      return true;
    },
    release() {
      if (active > 0) active--;
    },
    get activeCount() {
      return active;
    }
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Rate limiter                                                        */
/* ────────────────────────────────────────────────────────────────────── */

function createRateLimiter(config) {
  const rateLimitMap = new Map();

  function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, { count: 1, windowStart: now });
      return next();
    }

    const entry = rateLimitMap.get(ip);

    if (now - entry.windowStart > config.rateWindowMs) {
      entry.count = 1;
      entry.windowStart = now;
      return next();
    }

    entry.count += 1;

    if (entry.count > config.rateMaxRequests) {
      return res.status(429).json({
        success: false,
        errors: [
          {
            message: `Rate limit exceeded. Maximum ${config.rateMaxRequests} requests per ${config.rateWindowMs / 1000}s.`,
            line: null,
            type: "rate_limit"
          }
        ]
      });
    }

    next();
  }

  return { rateLimit, rateLimitMap };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Compiler process                                                    */
/* ────────────────────────────────────────────────────────────────────── */

function invokeCompiler(config, filePath) {
  return new Promise((resolve, reject) => {
    const command = resolveCompilerCommand(config.compilerBin, filePath);

    execFile(
      command.bin,
      command.args,
      {
        timeout: config.maxCompileMs,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            return reject(
              new CompilationError(
                "Compilation timed out. Your program may be too large or the compiler hung.",
                408
              )
            );
          }

          if (error.code === "ENOENT") {
            return reject(
              new CompilationError(
                "Compiler binary not found. Ensure the compiler is built.",
                503
              )
            );
          }

          if (stdout && stdout.trim().startsWith("{")) {
            return resolve(stdout);
          }

          return reject(
            new CompilationError(
              `Compiler process exited with code ${error.code || "unknown"}: ${stderr || error.message}`,
              500
            )
          );
        }

        resolve(stdout);
      }
    );
  });
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Express app factory                                                 */
/* ────────────────────────────────────────────────────────────────────── */

function createApp(overrides = {}) {
  const config = createConfig(overrides);
  const app = express();
  const { rateLimit, rateLimitMap } = createRateLimiter(config);
  const limiter = createConcurrencyLimiter(config.maxConcurrent);

  app.set("trust proxy", 1);

  app.use(helmet({
    hsts: config.nodeEnv === "production"
  }));

  app.use(compression());

  // Gap 2.4 — CORS lockdown for production
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
    : config.nodeEnv === "production"
      ? false               // reject all if CORS_ORIGIN not set in production
      : "*";

  if (config.nodeEnv === "production" && !process.env.CORS_ORIGIN) {
    console.warn(
      "[diamond-backend] WARNING: CORS_ORIGIN is not set. All cross-origin requests will be rejected in production."
    );
  }

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"]
    })
  );

  app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
  app.use(express.json({ limit: "128kb" }));

  // Gap 3.5 — Request ID middleware
  app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-API-Version", "1");
    next();
  });

  // Validation middleware for /compile (works for both old and new paths)
  app.use((req, res, next) => {
    const { code } = req.body || {};

    const isCompile = req.method === "POST" &&
      (req.path === "/api/v1/compile" || req.path === "/compile");

    if (!isCompile) {
      return next();
    }

    if (typeof code !== "string") {
      return res.status(400).json({
        success: false,
        errors: [
          {
            message: "Request body must contain a 'code' field of type string.",
            line: null,
            type: "request"
          }
        ]
      });
    }

    const trimmed = code.trim();

    if (trimmed.length === 0) {
      return res.status(400).json({
        success: false,
        errors: [
          {
            message: "No code provided. The 'code' field is empty.",
            line: null,
            type: "request"
          }
        ]
      });
    }

    if (Buffer.byteLength(trimmed, "utf-8") > config.maxCodeBytes) {
      return res.status(413).json({
        success: false,
        errors: [
          {
            message: `Source code exceeds the maximum allowed size of ${config.maxCodeBytes / 1024} KB.`,
            line: null,
            type: "request"
          }
        ]
      });
    }

    req.diamondCode = sanitiseCode(trimmed);
    next();
  });

  /* ── Health endpoints (Gap 3.2 — liveness vs readiness) ────────── */

  app.get("/api/v1/health/live", (_req, res) => {
    res.json({ status: "ok", service: "diamond-backend" });
  });

  app.get("/api/v1/health/ready", (_req, res) => {
    const compilerExists = fs.existsSync(config.compilerBin);
    if (!compilerExists) {
      return res.status(503).json({
        status: "unavailable",
        service: "diamond-backend",
        reason: "Compiler binary not found."
      });
    }
    res.json({ status: "ready", service: "diamond-backend" });
  });

  app.get(["/api/v1/health", "/health"], (_req, res) => {
    const compilerExists = fs.existsSync(config.compilerBin);
    const body = {
      status: "ok",
      service: "diamond-backend",
      environment: config.nodeEnv,
      compiler: {
        available: compilerExists
      },
      limits: {
        maxCodeBytes: config.maxCodeBytes,
        maxCompileMs: config.maxCompileMs,
        rateLimit: `${config.rateMaxRequests} req / ${config.rateWindowMs / 1000}s`,
        maxConcurrent: config.maxConcurrent
      }
    };

    // Gap 2.6 — only expose compiler path in non-production
    if (config.nodeEnv !== "production") {
      body.compiler.path = config.compilerBin;
    }

    res.json(body);
  });

  /* ── Compile endpoint (Gap 3.4 — versioned + legacy) ───────────── */

  const compileHandler = async (req, res, next) => {
    if (!limiter.tryAcquire()) {
      return res.status(503).json({
        success: false,
        errors: [
          {
            message: "Server is at capacity. Please try again shortly.",
            line: null,
            type: "capacity"
          }
        ]
      });
    }

    let tempFilePath = null;

    try {
      tempFilePath = writeTempFile(req.diamondCode);
      const rawOutput = await invokeCompiler(config, tempFilePath);

      let compilerResult;
      try {
        compilerResult = JSON.parse(rawOutput);
      } catch {
        return res.status(500).json({
          success: false,
          errors: [
            {
              message: "Compiler produced invalid JSON output. This is an internal error.",
              line: null,
              type: "internal"
            }
          ]
        });
      }

      res.json({
        success: compilerResult.success ?? false,
        output: compilerResult.output ?? "No output.",
        errors: compilerResult.errors ?? [],
        tokens: compilerResult.tokens ?? [],
        ast: compilerResult.ast ?? null,
        symbolTable: compilerResult.symbolTable ?? [],
        rawTac: compilerResult.rawTac ?? [],
        tac: compilerResult.tac ?? [],
        assembly: compilerResult.assembly ?? null,
        parseTrace: compilerResult.parseTrace ?? null,
        optimizations: compilerResult.optimizations ?? null,
        meta: {
          ...(compilerResult.meta ?? {}),
          mode: "server",
          engineStatus: "Compiled via the Diamond backend server."
        }
      });
    } catch (error) {
      next(error);
    } finally {
      limiter.release();
      cleanupTempFile(tempFilePath);
    }
  };

  app.post("/api/v1/compile", rateLimit, compileHandler);
  app.post("/compile", rateLimit, compileHandler);          // backward compat

  /* ── Catch-all & error handling ────────────────────────────────── */

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      errors: [{ message: "Route not found.", line: null, type: "request" }]
    });
  });

  app.use((err, _req, res, _next) => {
    if (err instanceof CompilationError) {
      return res.status(err.statusCode).json({
        success: false,
        errors: [{ message: err.message, line: null, type: "compiler" }]
      });
    }

    if (err.type === "entity.parse.failed") {
      return res.status(400).json({
        success: false,
        errors: [{ message: "Malformed JSON in request body.", line: null, type: "request" }]
      });
    }

    if (err.type === "entity.too.large") {
      return res.status(413).json({
        success: false,
        errors: [
          { message: "Request body exceeds the maximum allowed size.", line: null, type: "request" }
        ]
      });
    }

    console.error("[diamond-backend] Unhandled error:", err);
    res.status(500).json({
      success: false,
      errors: [
        {
          message:
            config.nodeEnv === "production"
              ? "An unexpected internal error occurred."
              : err.message || "Unknown error.",
          line: null,
          type: "internal"
        }
      ]
    });
  });

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now - entry.windowStart > config.rateWindowMs * 2) {
        rateLimitMap.delete(ip);
      }
    }
  }, 5 * 60_000);

  return {
    app,
    config,
    cleanup() {
      clearInterval(cleanupInterval);
    }
  };
}

module.exports = {
  CompilationError,
  createApp,
  createConfig,
  invokeCompiler,
  resolveCompilerCommand
};
