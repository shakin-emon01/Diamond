param(
  [string]$ClangFormatPath = ""
)

$ErrorActionPreference = "Stop"

function Resolve-Tool($name, $pathOverride, $fallbackNames) {
  if ($pathOverride -ne "") {
    foreach ($candidateName in $fallbackNames) {
      $candidate = Join-Path $pathOverride $candidateName
      if (Test-Path $candidate) {
        return $candidate
      }
    }
  }

  foreach ($candidateName in $fallbackNames) {
    $command = Get-Command $candidateName -ErrorAction SilentlyContinue
    if ($command) {
      return $command.Source
    }
  }

  throw "clang-format not found. Install LLVM clang-format or pass -ClangFormatPath."
}

$clangFormat = Resolve-Tool "clang-format" $ClangFormatPath @("clang-format.exe", "clang-format")
$targets = Get-ChildItem -Path (Join-Path $PSScriptRoot "core") -Filter *.c
$targets += Get-ChildItem -Path (Join-Path $PSScriptRoot "core") -Filter *.h

foreach ($target in $targets) {
  & $clangFormat --dry-run --Werror $target.FullName
}

Write-Host "C formatting check passed for $($targets.Count) file(s)."
