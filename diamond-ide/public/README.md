The files under `public/wasm/` and `public/workers/` are managed automatically.

Use one of these commands instead of copying files into `public/` by hand:

```powershell
# Build the compiler and copy the browser assets into every frontend target
cd diamond-compiler
.\build-wasm.ps1

# Or, if the compiler bundle already exists under diamond-compiler/core/
npm --prefix diamond-ide run sync:wasm
```

Expected generated assets:

- `public/wasm/diamond.js`
- `public/wasm/diamond.wasm`
- `public/workers/diamond-wasm-worker.js`

Root-level duplicates such as `public/diamond.js` and `public/diamond.wasm` are intentionally removed by the sync step.
