param(
  # Example:
  # .\build.ps1 -WinFlexBisonDir "C:\tools\winflexbison" -MingwBinDir "C:\mingw64\bin"
  [string]$WinFlexBisonDir = "",
  [string]$MingwBinDir = ""
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

$winBison = Resolve-Tool "WinFlexBison" $WinFlexBisonDir @("win_bison.exe", "bison.exe")
$winFlex  = Resolve-Tool "WinFlexBison" $WinFlexBisonDir @("win_flex.exe", "flex.exe")
$gcc      = Resolve-Tool "MingwBin"      $MingwBinDir      @("gcc.exe", "gcc")

Write-Host "Using bison: $winBison"
Write-Host "Using flex : $winFlex"
Write-Host "Using gcc  : $gcc"

Push-Location "core"
& $winBison -d parser.y
& $winFlex lexer.l
& $gcc lex.yy.c parser.tab.c ast.c preprocess.c symtab.c tac.c driver.c -o ..\diamond.exe
Pop-Location

Write-Host "Build complete: diamond.exe"
