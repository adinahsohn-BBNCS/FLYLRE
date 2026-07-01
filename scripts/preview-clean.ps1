# Stop stale local servers and preview the production build on port 4321.
$ErrorActionPreference = "SilentlyContinue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

foreach ($port in 4321..4325) {
  $matches = netstat -ano | Select-String ":$port\s+.*LISTENING"
  foreach ($match in $matches) {
    $parts = ($match.Line.Trim() -split '\s+')
    $processId = $parts[-1]
    if ($processId -match '^\d+$' -and [int]$processId -ne $PID) {
      Write-Host "Stopping process $processId on port $port..."
      taskkill /PID $processId /F | Out-Null
    }
  }
}

Start-Sleep -Seconds 1
Set-Location $ProjectRoot
Write-Host ""
Write-Host "Building site..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ""
Write-Host "Preview at http://localhost:4321/ (matches production build)"
Write-Host ""
npm run preview
