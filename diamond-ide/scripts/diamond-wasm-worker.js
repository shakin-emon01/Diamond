"use strict";

let modulePromise = null;

function getFactory() {
  if (typeof self.DiamondModule === "function") {
    return self.DiamondModule;
  }

  if (typeof DiamondModule === "function") {
    return DiamondModule;
  }

  return null;
}

async function loadModule() {
  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        self.importScripts("/wasm/diamond.js");

        const factory = getFactory();
        if (typeof factory !== "function") {
          return null;
        }

        return await factory({
          locateFile(file) {
            return file.endsWith(".wasm") ? `/wasm/${file}` : file;
          }
        });
      } catch {
        return null;
      }
    })();
  }

  return modulePromise;
}

self.onmessage = async (event) => {
  const { id, code } = event.data || {};

  try {
    const mod = await loadModule();
    if (!mod || typeof mod.cwrap !== "function") {
      self.postMessage({
        id,
        ok: false,
        error: "WASM compiler bundle is unavailable in worker context."
      });
      return;
    }

    const compile = mod.cwrap("diamond_compile", "number", ["string"]);
    const free = mod.cwrap("diamond_free", null, ["number"]);
    const pointer = compile(code);
    const json = mod.UTF8ToString(pointer);
    free(pointer);

    self.postMessage({
      id,
      ok: true,
      result: JSON.parse(json)
    });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Worker compilation failed."
    });
  }
};
