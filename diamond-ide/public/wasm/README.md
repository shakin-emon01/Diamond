This directory is populated automatically by the Diamond IDE asset sync flow.

Preferred commands:

```powershell
# Build the compiler and copy assets into the IDE
cd diamond-compiler
.\build-wasm.ps1

# Or resync from an existing compiler build
npm --prefix diamond-ide run sync:wasm
```

Required files:

- `diamond.js`
- `diamond.wasm`

The worker script is stored alongside this folder in `public/workers/diamond-wasm-worker.js`.
