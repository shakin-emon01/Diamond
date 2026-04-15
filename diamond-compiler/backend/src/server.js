const fs = require("fs");

const { createApp } = require("./app");

const PORT = parseInt(process.env.PORT, 10) || 4000;
const { app, config, cleanup } = createApp();

const server = app.listen(PORT, () => {
  const compilerExists = fs.existsSync(config.compilerBin);
  console.log("");
  console.log("  Diamond Backend");
  console.log(`     Environment : ${config.nodeEnv}`);
  console.log(`     Port        : ${PORT}`);
  console.log(`     Compiler    : ${config.nodeEnv === "production" ? "(redacted)" : config.compilerBin}`);
  console.log(`     Available   : ${compilerExists ? "Yes" : "No - build with build.ps1 first"}`);
  console.log(`     Rate limit  : ${config.rateMaxRequests} req / ${config.rateWindowMs / 1000}s per IP`);
  console.log(`     Max code    : ${config.maxCodeBytes / 1024} KB`);
  console.log(`     Timeout     : ${config.maxCompileMs / 1000}s`);
  console.log(`     Concurrency : ${config.maxConcurrent} max simultaneous`);
  console.log(`     API         : /api/v1/health, /api/v1/compile`);
  console.log("");
});

// Gap 3.1 — Graceful shutdown
function shutdown(signal) {
  console.log(`\n  [diamond-backend] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    cleanup();
    console.log("  [diamond-backend] All connections closed. Goodbye.");
    process.exit(0);
  });

  // Force exit after 15 seconds if connections don't drain
  setTimeout(() => {
    console.error("  [diamond-backend] Forced shutdown after timeout.");
    process.exit(1);
  }, 15_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
