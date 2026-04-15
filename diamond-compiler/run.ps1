param(
  [string]$InputFile = "test.diu",
  [switch]$Trace
)

$ErrorActionPreference = "Stop"

if (!(Test-Path ".\diamond.exe")) {
  throw "diamond.exe not found. Run .\build.ps1 first."
}

if (!(Test-Path $InputFile)) {
  throw "Input file not found: $InputFile"
}

if ($Trace) {
  .\diamond.exe --trace $InputFile
} else {
  .\diamond.exe $InputFile
}

