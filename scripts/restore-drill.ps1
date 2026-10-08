param([Parameter(Mandatory)][string]$Dump, [string]$ComposeFile='docker-compose.yml', [string]$EnvFile='.env', [switch]$AllowUnverified)
$ErrorActionPreference='Stop'
$taskDump = (Resolve-Path -LiteralPath $Dump).Path
if (-not (Test-Path -LiteralPath ($taskDump + '.json')) -and -not $AllowUnverified) { throw 'O manifesto do backup não foi encontrado. Verifique a origem ou use -AllowUnverified explicitamente para um dump externo.' }
if (Test-Path -LiteralPath ($taskDump + '.json')) {
  $taskManifest = Get-Content -LiteralPath ($taskDump + '.json') -Raw | ConvertFrom-Json
  if ($taskManifest.sha256 -notmatch '^[a-fA-F0-9]{64}$' -or $taskManifest.dump -ne [IO.Path]::GetFileName($taskDump)) { throw 'Manifesto inválido ou pertencente a outro backup.' }
  if ((Get-FileHash -LiteralPath $taskDump -Algorithm SHA256).Hash -ne $taskManifest.sha256) { throw 'Checksum incorreto.' }
}
$taskName = 'black_market_restore_' + (Get-Date -Format 'yyyyMMddHHmmss')
if ($taskName -notmatch '^black_market_restore_\d{14}$') { throw 'Banco de verificação inválido.' }
$taskArgs = @('compose','--env-file',$EnvFile,'-f',$ComposeFile)
$taskContainer = (& docker @taskArgs ps -q postgres).Trim()
$taskRemote = '/tmp/' + $taskName + '.dump'
& docker cp $taskDump "${taskContainer}:$taskRemote"
if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar backup.' }
$taskCreated = $false
try {
  & docker @taskArgs exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh $taskName
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar banco isolado.' }
  $taskCreated = $true
  & docker @taskArgs exec -T postgres sh -c 'pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" -d "$1" "$2"' sh $taskName $taskRemote
  if ($LASTEXITCODE -ne 0) { throw 'Falha de restauração.' }
  & docker @taskArgs exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$1" -At -c "SELECT count(*) FROM information_schema.tables;"' sh $taskName
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao verificar tabelas.' }
  & docker @taskArgs exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$1" -At -c "SELECT count(*) FROM item_versions; SELECT count(*) FROM reference_records;"' sh $taskName
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao verificar o catálogo restaurado.' }
  Write-Output 'Restauração concluída em banco isolado. O banco original foi preservado.'
} finally {
  if ($taskCreated) { & docker @taskArgs exec -T postgres sh -c 'dropdb --if-exists -U "$POSTGRES_USER" "$1"' sh $taskName }
  & docker @taskArgs exec -T postgres rm $taskRemote
}
