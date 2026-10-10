# Daily Task Scheduler entry: only back up staging when Docker and its DB are running.
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
if (-not (Test-Path -LiteralPath '.env.staging')) { exit 0 }
$running = & docker compose --env-file .env.staging -f docker-compose.staging.yml ps --status running -q postgres 2>$null
if ($LASTEXITCODE -ne 0 -or -not $running) { exit 0 }
$taskLog = Join-Path $taskRoot 'data/staging/backup-status.txt'
try {
  & (Join-Path $PSScriptRoot 'staging.ps1') Backup | Out-File -LiteralPath $taskLog
  Add-Content -LiteralPath $taskLog -Value ('OK ' + (Get-Date).ToString('o'))
} catch {
  ('FAILED ' + (Get-Date).ToString('o') + ': ' + $_.Exception.Message) | Set-Content -LiteralPath $taskLog
  throw
}
