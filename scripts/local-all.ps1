$projectRoot = Split-Path -Parent $PSScriptRoot
$apiScript = Join-Path $PSScriptRoot 'local-api.ps1'
$webScript = Join-Path $PSScriptRoot 'local-web.ps1'

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  $apiScript
) -WorkingDirectory $projectRoot

Start-Sleep -Seconds 2

powershell -ExecutionPolicy Bypass -File $webScript
