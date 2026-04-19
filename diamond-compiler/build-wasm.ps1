param(
  [string]$EmscriptenDir = "",
  [string]$WinFlexBisonDir = "",
  [switch]$SkipCopy
)

$ErrorActionPreference = "Stop"

function Resolve-Tool($name, $dir, $fallbackNames) {
  if ($dir -ne "") {
    foreach ($n in $fallbackNames) {
      $candidate = Join-Path $dir $n
      if (Test-Path $candidate) { return $candidate }
    }
  }

  foreach ($n in $fallbackNames) {
    $cmd = Get-Command $n -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }

  throw "Tool not found: $name. Provide -${name}Dir or add it to PATH."
}

$emcc = Resolve-Tool "Emscripten" $EmscriptenDir @("emcc.bat", "emcc", "emcc.exe")
$bison = Resolve-Tool "WinFlexBison" $WinFlexBisonDir @("win_bison.exe", "bison.exe", "bison")
$flex = Resolve-Tool "WinFlexBison" $WinFlexBisonDir @("win_flex.exe", "flex.exe", "flex")

Write-Host "Using emcc : $emcc"
Write-Host "Using bison: $bison"
Write-Host "Using flex : $flex"

$root = $PSScriptRoot
$coreDir = Join-Path $root "core"
$frontends = @(
  (Join-Path $root "..\diamond-ide")
)
$workerTemplate = Join-Path $root "..\diamond-ide\scripts\diamond-wasm-worker.js"
$manifestPath = Join-Path $coreDir "diamond-wasm-manifest.json"
$manifestSourceFiles = @(
  "parser.y",
  "lexer.l",
  "ast.c",
  "ast.h",
  "preprocess.c",
  "preprocess.h",
  "symtab.c",
  "symtab.h",
  "tac.c",
  "tac.h",
  "driver.c"
)
$compilerSources = @(
  "lex.yy.c",
  "parser.tab.c",
  "ast.c",
  "preprocess.c",
  "symtab.c",
  "tac.c",
  "driver.c"
)

function Get-TextSha256($path) {
  $sha256 = [System.Security.Cryptography.SHA256]::Create()

  try {
    $content = Get-Content -Path $path -Raw
    $normalized = $content -replace "`r`n", "`n" -replace "`r", "`n"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $hashBytes = $sha256.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hashBytes)).Replace("-", "").ToLowerInvariant()
  }
  finally {
    $sha256.Dispose()
  }
}

function Write-WasmManifest() {
  $sourceEntries = foreach ($relativePath in $manifestSourceFiles) {
    $fullPath = Join-Path $coreDir $relativePath

    if (!(Test-Path $fullPath)) {
      throw "Missing compiler source file for WASM manifest: $fullPath"
    }

    [PSCustomObject]@{
      path = ([System.IO.Path]::Combine("diamond-compiler", "core", $relativePath)) -replace "\\", "/"
      sha256 = Get-TextSha256 $fullPath
    }
  }

  $assetEntries = @(
    [PSCustomObject]@{
      path = "diamond-compiler/core/diamond.js"
      sha256 = ((Get-FileHash (Join-Path $coreDir "diamond.js") -Algorithm SHA256).Hash).ToLowerInvariant()
    },
    [PSCustomObject]@{
      path = "diamond-compiler/core/diamond.wasm"
      sha256 = ((Get-FileHash (Join-Path $coreDir "diamond.wasm") -Algorithm SHA256).Hash).ToLowerInvariant()
    }
  )

  $manifest = [PSCustomObject]@{
    schemaVersion = 1
    hashAlgorithm = "sha256"
    textNormalization = "lf"
    generatedAtUtc = [DateTime]::UtcNow.ToString("o")
    sources = $sourceEntries
    assets = $assetEntries
  }

  $manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestPath -Encoding UTF8
}

function Sync-FrontendArtifacts($frontendRoot) {
  if (!(Test-Path $frontendRoot)) {
    return
  }

  $wasmOutDir = Join-Path $frontendRoot "public\wasm"
  $workerOutDir = Join-Path $frontendRoot "public\workers"

  if (!(Test-Path $wasmOutDir)) {
    New-Item -ItemType Directory -Path $wasmOutDir | Out-Null
  }

  if (!(Test-Path $workerOutDir)) {
    New-Item -ItemType Directory -Path $workerOutDir | Out-Null
  }

  Copy-Item .\diamond.js (Join-Path $wasmOutDir "diamond.js") -Force
  Copy-Item .\diamond.wasm (Join-Path $wasmOutDir "diamond.wasm") -Force

  if (Test-Path $workerTemplate) {
    Copy-Item $workerTemplate (Join-Path $workerOutDir "diamond-wasm-worker.js") -Force
  }
}

Push-Location $coreDir
try {
  & $bison -d parser.y
  & $flex lexer.l

  & $emcc $compilerSources `
    -O2 `
    -DDIAMOND_WASM `
    -s EXPORTED_FUNCTIONS='["_diamond_compile","_diamond_free"]' `
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' `
    -s MODULARIZE=1 `
    -s EXPORT_NAME='"DiamondModule"' `
    -s ALLOW_MEMORY_GROWTH=1 `
    -s ENVIRONMENT='web,worker' `
    -o diamond.js

  if ($LASTEXITCODE -ne 0) {
    throw "emcc build failed."
  }

  Write-WasmManifest

  if (-not $SkipCopy) {
    foreach ($frontend in $frontends) {
      Sync-FrontendArtifacts $frontend
    }
  }
}
finally {
  Pop-Location
}

Write-Host "WASM build complete."
if (-not $SkipCopy) {
  Write-Host "Copied files to frontend public/wasm directories where available."
} else {
  Write-Host "Artifacts kept in $coreDir"
}
