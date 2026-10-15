$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$taskEnv = Join-Path $taskRoot '.env.staging'
$taskCompose = Join-Path $taskRoot 'docker-compose.staging.yml'
$taskSqlPath = Join-Path $PSScriptRoot 'rls-isolation.sql'
if (-not (Test-Path -LiteralPath $taskEnv)) { throw 'O teste exige o ambiente local .env.staging.' }
if (-not (Test-Path -LiteralPath $taskSqlPath)) { throw 'Arquivo do teste de isolamento não encontrado.' }

$taskUserA = [guid]::NewGuid().ToString()
$taskUserB = [guid]::NewGuid().ToString()
$taskSql = (Get-Content -LiteralPath $taskSqlPath -Raw).
  Replace('@TEST_USER_A@', $taskUserA).
  Replace('@TEST_USER_B@', $taskUserB)
$taskDockerArgs = @(
  'compose', '--env-file', $taskEnv, '-f', $taskCompose,
  'exec', '-T', 'postgres', 'sh', '-c',
  'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
)
$taskSql | & docker @taskDockerArgs
if ($LASTEXITCODE -ne 0) { throw 'Teste RLS de isolamento falhou no PostgreSQL de staging.' }
Write-Output 'RLS: usuários isolados; leitura, gravação e contexto anônimo verificados.'
