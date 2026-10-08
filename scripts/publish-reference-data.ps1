param(
  [ValidatePattern('^[a-z0-9-]{2,160}$')][string]$ExtractionVersion,
  [ValidatePattern('^[a-z0-9-]{2,12}$')][string]$Region='sa',
  [ValidatePattern('^[a-z]{2,8}$')][string]$Locale='pt',
  [ValidatePattern('^[a-zA-Z0-9_]+$')][string]$DatabaseUser='bdo',
  [ValidatePattern('^[a-zA-Z0-9_]+$')][string]$DatabaseName='bdo_companion'
)
$ErrorActionPreference='Stop'
$taskWorkspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if(-not $ExtractionVersion){$ExtractionVersion=(Get-Content -LiteralPath (Join-Path $taskWorkspace 'data/current-extraction.txt') -Raw).Trim()}
if($ExtractionVersion -notmatch '^[a-z0-9-]{2,160}$'){throw 'Versão de extração inválida.'}
$taskInput=Join-Path $taskWorkspace "data/extracted/$ExtractionVersion"
if(-not(Test-Path -LiteralPath (Join-Path $taskInput 'provenance.json'))){throw 'Extração não encontrada.'}
Push-Location -LiteralPath $taskWorkspace
try{
  $taskContainer=(docker compose ps -q postgres).Trim()
  if(-not $taskContainer){throw 'Banco de dados indisponível.'}
  $taskSql="SELECT json_build_object('id',id,'checksum',checksum,'version',version)::text FROM dataset_versions WHERE region='$Region' AND locale='$Locale' AND source='bdo-data-extractor' AND status='active' ORDER BY finished_at DESC LIMIT 1;"
  $taskResult=docker exec $taskContainer psql -U $DatabaseUser -d $DatabaseName -At -c $taskSql
  if($LASTEXITCODE -ne 0 -or -not $taskResult){throw 'Catálogo ativo não encontrado.'}
  $taskDataset=$taskResult|ConvertFrom-Json
  if(-not $taskDataset.version.StartsWith($ExtractionVersion+'-')){throw 'A extração não corresponde ao catálogo ativo.'}
  if($taskDataset.id -notmatch '^[a-f0-9-]{36}$' -or $taskDataset.checksum -notmatch '^[a-f0-9]{64}$'){throw 'Identificador de catálogo inválido.'}
  docker compose --profile data run --rm --no-deps -e NODE_OPTIONS=--max-old-space-size=1536 import node apps/api/dist/reference/import-reference-data.js "/workspace/data/extracted/$ExtractionVersion" $taskDataset.id
  if($LASTEXITCODE -ne 0){throw 'Falha ao importar referências. Preserve a extração e consulte os registros.'}
  docker compose --profile data run --rm --no-deps import node apps/api/dist/catalog/build-icon-index.js "/workspace/data/assets/$($taskDataset.checksum)" $taskDataset.checksum
  if($LASTEXITCODE -ne 0){throw 'Referências importadas; índice de imagens não publicado.'}
}finally{Pop-Location}
