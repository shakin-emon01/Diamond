#!/usr/bin/env node

/**
 * Simple load test for the Diamond backend API.
 * Run: node loadtest.mjs [baseUrl] [concurrency] [totalRequests]
 *
 * Example: node loadtest.mjs http://localhost:4000 20 100
 */

const BASE_URL = process.argv[2] || "http://localhost:4000";
const CONCURRENCY = parseInt(process.argv[3], 10) || 20;
const TOTAL_REQUESTS = parseInt(process.argv[4], 10) || 100;

const SAMPLE_CODE = `shuru

dhoro shonkha a;
a = 5;
dekhao(a);

shesh`;

async function sendRequest(id) {
  const start = performance.now();
  try {
    const response = await fetch(`${BASE_URL}/api/v1/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: SAMPLE_CODE })
    });
    const elapsed = (performance.now() - start).toFixed(1);
    const body = await response.json();
    return {
      id,
      status: response.status,
      success: body.success,
      elapsed: parseFloat(elapsed),
      error: null
    };
  } catch (error) {
    return {
      id,
      status: 0,
      success: false,
      elapsed: parseFloat((performance.now() - start).toFixed(1)),
      error: error.message
    };
  }
}

async function runBatch(startId, count) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(sendRequest(startId + i));
  }
  return Promise.all(promises);
}

async function main() {
  console.log(`\n  Diamond Backend Load Test`);
  console.log(`  URL:          ${BASE_URL}`);
  console.log(`  Concurrency:  ${CONCURRENCY}`);
  console.log(`  Total:        ${TOTAL_REQUESTS}\n`);

  const allResults = [];
  let sent = 0;

  const overallStart = performance.now();

  while (sent < TOTAL_REQUESTS) {
    const batchSize = Math.min(CONCURRENCY, TOTAL_REQUESTS - sent);
    const results = await runBatch(sent, batchSize);
    allResults.push(...results);
    sent += batchSize;
    process.stdout.write(`  Progress: ${sent}/${TOTAL_REQUESTS}\r`);
  }

  const overallElapsed = ((performance.now() - overallStart) / 1000).toFixed(2);

  const successes = allResults.filter((r) => r.status === 200);
  const failures = allResults.filter((r) => r.status !== 200);
  const rateLimited = allResults.filter((r) => r.status === 429);
  const capacityLimited = allResults.filter((r) => r.status === 503);

  const times = allResults.map((r) => r.elapsed).sort((a, b) => a - b);
  const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
  const p50 = times[Math.floor(times.length * 0.5)]?.toFixed(1);
  const p95 = times[Math.floor(times.length * 0.95)]?.toFixed(1);
  const p99 = times[Math.floor(times.length * 0.99)]?.toFixed(1);

  console.log(`\n  Results (${overallElapsed}s total):`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Total:         ${allResults.length}`);
  console.log(`  Success (200): ${successes.length}`);
  console.log(`  Rate limited:  ${rateLimited.length}`);
  console.log(`  At capacity:   ${capacityLimited.length}`);
  console.log(`  Other errors:  ${failures.length - rateLimited.length - capacityLimited.length}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Avg latency:   ${avg} ms`);
  console.log(`  p50:           ${p50} ms`);
  console.log(`  p95:           ${p95} ms`);
  console.log(`  p99:           ${p99} ms`);
  console.log(`  Throughput:    ${(allResults.length / parseFloat(overallElapsed)).toFixed(1)} req/s`);
  console.log("");

  if (failures.length - rateLimited.length - capacityLimited.length > 0) {
    console.log("  Sample errors:");
    failures
      .filter((r) => r.status !== 429 && r.status !== 503)
      .slice(0, 5)
      .forEach((r) => console.log(`    #${r.id}: status=${r.status} error=${r.error}`));
    console.log("");
  }
}

main().catch(console.error);
