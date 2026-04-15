import { buildFallbackResult } from "./mock-compiler";
import { preprocessDiamondSource } from "./diamond-preprocess";
import type { DiamondResult } from "./types";

declare global {
  interface Window {
    DiamondModule?: (options?: Record<string, unknown>) => Promise<any>;
    __diamondModulePromise?: Promise<any | null>;
  }
}

type WorkerMessage = {
  id: number;
  ok: boolean;
  result?: DiamondResult;
  error?: string;
};

let modulePromise: Promise<any | null> | null = null;
let worker: Worker | null = null;
let workerRequestId = 0;
const pendingRequests = new Map<
  number,
  {
    resolve: (value: DiamondResult) => void;
    reject: (reason?: unknown) => void;
  }
>();

function normalizeResult(parsed: DiamondResult, mode: "wasm" | "demo" | "server", engineStatus: string): DiamondResult {
  return {
    ...parsed,
    errors: parsed.errors ?? [],
    tokens: parsed.tokens ?? [],
    symbolTable: parsed.symbolTable ?? [],
    rawTac: parsed.rawTac ?? [],
    tac: parsed.tac ?? [],
    assembly: parsed.assembly ?? null,
    parseTrace: parsed.parseTrace ?? null,
    optimizations: parsed.optimizations,
    meta: {
      ...parsed.meta,
      errorCount: parsed.meta?.errorCount ?? parsed.errors?.length ?? 0,
      symbolCount: parsed.meta?.symbolCount ?? parsed.symbolTable?.length ?? 0,
      rawTacCount: parsed.meta?.rawTacCount ?? parsed.rawTac?.length ?? 0,
      tacCount: parsed.meta?.tacCount ?? parsed.tac?.length ?? 0,
      tokenCount: parsed.meta?.tokenCount ?? parsed.tokens?.length ?? 0,
      mode,
      engineStatus
    }
  };
}

function withPreprocessMeta(
  result: DiamondResult,
  stats: ReturnType<typeof preprocessDiamondSource>["stats"]
): DiamondResult {
  return {
    ...result,
    meta: {
      errorCount: result.meta?.errorCount ?? result.errors.length,
      symbolCount: result.meta?.symbolCount ?? result.symbolTable.length,
      rawTacCount: result.meta?.rawTacCount ?? result.rawTac?.length ?? 0,
      tacCount: result.meta?.tacCount ?? result.tac.length,
      tokenCount: result.meta?.tokenCount ?? result.tokens.length,
      mode: result.meta?.mode,
      engineStatus: result.meta?.engineStatus,
      preprocessImports: stats.preprocessImports,
      preprocessRecordTypes: stats.preprocessRecordTypes,
      preprocessRecordVariables: stats.preprocessRecordVariables
    }
  };
}

function resetWorker(reason?: unknown) {
  for (const [, handlers] of pendingRequests) {
    handlers.reject(reason ?? new Error("WASM worker became unavailable."));
  }
  pendingRequests.clear();

  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function getWorker() {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }

  if (!worker) {
    worker = new Worker("/workers/diamond-wasm-worker.js");
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { id, ok, result, error } = event.data;
      const handlers = pendingRequests.get(id);

      if (!handlers) {
        return;
      }

      pendingRequests.delete(id);

      if (ok && result) {
        handlers.resolve(
          normalizeResult(
            result,
            "wasm",
            "WASM compiler running inside a Web Worker."
          )
        );
        return;
      }

      handlers.reject(new Error(error ?? "Worker compilation failed."));
    };

    worker.onerror = (event) => {
      resetWorker(event.error ?? new Error(event.message || "Worker crashed."));
    };
  }

  return worker;
}

function compileInWorker(code: string) {
  return new Promise<DiamondResult>((resolve, reject) => {
    const instance = getWorker();

    if (!instance) {
      reject(new Error("Web Worker is unavailable."));
      return;
    }

    const id = ++workerRequestId;
    pendingRequests.set(id, { resolve, reject });
    instance.postMessage({ id, code });
  });
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Browser runtime required"));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[data-diamond-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.diamondSrc = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.body.appendChild(script);
  });
}

async function loadModule() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        if (!window.DiamondModule) {
          await loadScript("/wasm/diamond.js");
        }

        if (typeof window.DiamondModule !== "function") {
          return null;
        }

        return await window.DiamondModule({
          locateFile: (file: string) => (file.endsWith(".wasm") ? `/wasm/${file}` : file)
        });
      } catch {
        return null;
      }
    })();
  }

  return modulePromise;
}

async function compileOnMainThread(code: string): Promise<DiamondResult> {
  const wasmModule = await loadModule();

  if (!wasmModule || typeof wasmModule.cwrap !== "function") {
    throw new Error("WASM compiler bundle is unavailable on the main thread.");
  }

  const compile = wasmModule.cwrap("diamond_compile", "number", ["string"]);
  const free = wasmModule.cwrap("diamond_free", null, ["number"]);
  const pointer = compile(code);
  const json = wasmModule.UTF8ToString(pointer);
  free(pointer);

  const parsed = JSON.parse(json) as DiamondResult;
  return normalizeResult(
    parsed,
    "wasm",
    "WASM compiler loaded on the main thread."
  );
}

/* ── Gap 5.1 — Backend API fallback ─────────────────────────────── */

async function compileViaBackend(code: string): Promise<DiamondResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("Backend API URL is not configured.");
  }

  const response = await fetch(`${apiUrl}/api/v1/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.errors?.[0]?.message ?? `Backend returned ${response.status}`;
    throw new Error(message);
  }

  const result = (await response.json()) as DiamondResult;
  return normalizeResult(result, "server", "Compiled via backend API.");
}

/* ── Main compilation pipeline ──────────────────────────────────── */

export async function compileDiamond(code: string): Promise<DiamondResult> {
  const preprocessed = preprocessDiamondSource(code);

  if (preprocessed.errors.length > 0) {
    return withPreprocessMeta(
      normalizeResult(
        {
          success: false,
          output: "Compilation failed during preprocessing.",
          errors: preprocessed.errors,
          tokens: [],
          ast: null,
          symbolTable: [],
          rawTac: [],
          tac: [],
          assembly: null,
          parseTrace: null
        },
        "demo",
        "Preprocessing stopped compilation before the browser compiler ran."
      ),
      preprocessed.stats
    );
  }

  // Tier 1: WASM Web Worker
  try {
    return withPreprocessMeta(await compileInWorker(preprocessed.code), preprocessed.stats);
  } catch {
    // fall through
  }

  // Tier 2: WASM on main thread
  try {
    return withPreprocessMeta(await compileOnMainThread(preprocessed.code), preprocessed.stats);
  } catch {
    // fall through
  }

  // Tier 3: Backend API (Gap 5.1)
  try {
    return withPreprocessMeta(await compileViaBackend(preprocessed.code), preprocessed.stats);
  } catch {
    // fall through
  }

  // Tier 4: Mock/demo fallback
  return withPreprocessMeta(
    normalizeResult(
      buildFallbackResult(preprocessed.code),
      "demo",
      "WASM and backend unavailable. Showing demo analysis."
    ),
    preprocessed.stats
  );
}
