# Public Asset Notes

The files under `diamond-ide/public/` include generated compiler delivery assets. The most important generated locations are:

- `public/wasm/`
- `public/workers/`

## Do Not Update These Assets By Hand

Use the project scripts instead:

```powershell
# Build the compiler and copy assets into the IDE
cd diamond-compiler
.\build-wasm.ps1

# Or, if the compiler bundle already exists
npm --prefix diamond-ide run sync:wasm
```

## Expected Generated Files

- `public/wasm/diamond.js`
- `public/wasm/diamond.wasm`
- `public/workers/diamond-wasm-worker.js`

Any stale root-level copies such as `public/diamond.js` or `public/diamond.wasm` are intentionally removed during sync.
