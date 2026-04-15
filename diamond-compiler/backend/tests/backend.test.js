const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { createApp } = require("../src/app");

const compilerBin = path.resolve(__dirname, "./fixtures/fake-compiler.cjs");

async function startServer() {
  const instance = createApp({
    nodeEnv: "test",
    compilerBin,
    rateMaxRequests: 1000
  });

  const server = await new Promise((resolve) => {
    const nextServer = instance.app.listen(0, () => resolve(nextServer));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: async () => {
      instance.cleanup();
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

test("health endpoint reports compiler availability", async () => {
  const server = await startServer();

  try {
    const response = await fetch(`${server.baseUrl}/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.status, "ok");
    assert.equal(payload.compiler.available, true);
    assert.equal(payload.compiler.path, compilerBin);
  } finally {
    await server.close();
  }
});

test("compile endpoint normalizes compiler output", async () => {
  const server = await startServer();

  try {
    const response = await fetch(`${server.baseUrl}/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: "shuru\n\ndekhao(1);\n\nshesh"
      })
    });

    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.meta.mode, "server");
    assert.equal(payload.tokens[0].type, "SHURU");
  } finally {
    await server.close();
  }
});

test("compile endpoint rejects empty code", async () => {
  const server = await startServer();

  try {
    const response = await fetch(`${server.baseUrl}/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: "   "
      })
    });

    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.success, false);
    assert.match(payload.errors[0].message, /No code provided/i);
  } finally {
    await server.close();
  }
});

test("compile endpoint surfaces invalid JSON from the compiler", async () => {
  const server = await startServer();

  try {
    const response = await fetch(`${server.baseUrl}/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: "BROKEN_JSON"
      })
    });

    const payload = await response.json();

    assert.equal(response.status, 500);
    assert.equal(payload.success, false);
    assert.match(payload.errors[0].message, /invalid JSON/i);
  } finally {
    await server.close();
  }
});
