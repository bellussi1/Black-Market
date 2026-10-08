param(
  [string]$GamePath = 'C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online',
  [ValidatePattern('^[a-z]{2,8}$')][string]$Locale = 'pt',
  [ValidatePattern('^[a-z0-9-]{2,12}$')][string]$Region = 'sa',
  [ValidatePattern('^[a-f0-9]{40}$')][string]$ExtractorCommit = '5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2',
  [ValidatePattern('^[a-z0-9-]{1,30}$')][string]$ImportRevision = 'catalog-v2',
  [ValidatePattern('^[a-zA-Z0-9_]+$')][string]$DatabaseUser = 'bdo',
  [ValidatePattern('^[a-zA-Z0-9_]+$')][string]$DatabaseName = 'bdo_companion',
  [switch]$CheckOnly,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$taskWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskGame = (Resolve-Path -LiteralPath $GamePath).Path
$taskMeta = (Get-FileHash -LiteralPath (Join-Path $taskGame 'Paz/pad00000.meta') -Algorithm SHA256).Hash.ToLowerInvariant()
$taskLanguage = (Get-FileHash -LiteralPath (Join-Path $taskGame "ads/languagedata_$Locale.loc") -Algorithm SHA256).Hash.ToLowerInvariant()
$taskVersion = "$Region-$Locale-meta-$($taskMeta.Substring(0,12))-loc-$($taskLanguage.Substring(0,12))-ext-$($ExtractorCommit.Substring(0,8))"
$taskImportVersion = "$taskVersion-$ImportRevision"
$taskExtraction = Join-Path $taskWorkspace "data/extracted/$taskVersion"

Push-Location -LiteralPath $taskWorkspace
try {
  $taskContainer = (docker compose ps -q postgres).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $taskContainer) { throw 'Inicie o PostgreSQL antes da sincronização.' }
  $taskSql = "SELECT version FROM dataset_versions WHERE region='$Region' AND locale='$Locale' AND status='active';"
  $taskActive = docker exec $taskContainer psql -U $DatabaseUser -d $DatabaseName -At -c $taskSql
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o catálogo ativo.' }
  $taskNeedsImport = $taskActive -ne $taskImportVersion
  if ($CheckOnly) {
    [pscustomobject]@{
      clientVersion = $taskVersion
      activeVersion = $taskActive
      importNeeded = $taskNeedsImport
      extractionExists = Test-Path -LiteralPath $taskExtraction
      checkedAt = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json
    return
  }
  if (-not $taskNeedsImport) {
    & (Join-Path $PSScriptRoot 'publish-reference-data.ps1') -ExtractionVersion $taskVersion -Region $Region -Locale $Locale -DatabaseUser $DatabaseUser -DatabaseName $DatabaseName
    Write-Output 'O catálogo corresponde ao cliente instalado. Referências e índice de imagens conferidos.'
    return
  }

  if (-not (Test-Path -LiteralPath $taskExtraction)) {
    & (Join-Path $PSScriptRoot 'extract-game-data.ps1') -GamePath $taskGame -Locale $Locale -Region $Region -ExtractorCommit $ExtractorCommit
  }
  $taskProvenance = Get-Content -LiteralPath (Join-Path $taskExtraction 'provenance.json') -Raw | ConvertFrom-Json
  if ($taskProvenance.status -ne 'extracted' -or $taskProvenance.metaSha256 -ne $taskMeta -or $taskProvenance.localizationSha256 -ne $taskLanguage) {
    throw 'A extração não está completa ou não corresponde ao cliente instalado. Preserve os arquivos e investigue antes de publicar.'
  }
  if (-not $SkipBuild) {
    docker compose build api
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao construir a imagem de importação.' }
  }
  $taskBackupId = 'catalog-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmss') + '-' + [Guid]::NewGuid().ToString('N')
  $taskBackupDirectory = Join-Path $taskWorkspace 'data/backups'
  New-Item -ItemType Directory -Path $taskBackupDirectory -Force | Out-Null
  docker exec $taskContainer pg_dump -U $DatabaseUser -d $DatabaseName -Fc -f "/tmp/$taskBackupId.dump"
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar backup; publicação interrompida.' }
  docker cp "${taskContainer}:/tmp/$taskBackupId.dump" (Join-Path $taskBackupDirectory "$taskBackupId.dump")
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao preservar o backup; publicação interrompida.' }
  docker compose --profile data run --rm --no-deps import pnpm db:migrate
  if ($LASTEXITCODE -ne 0) { throw 'Falha na migração; publicação interrompida.' }
  docker compose --profile data run --rm --no-deps import node apps/api/dist/catalog/import-game-data.js --input "/workspace/data/extracted/$taskVersion" --assets /workspace/data/assets --version $taskImportVersion --region $Region --locale $Locale
  if ($LASTEXITCODE -ne 0) { throw 'Falha na importação. O catálogo anterior permanece ativo.' }
  & (Join-Path $PSScriptRoot 'publish-reference-data.ps1') -ExtractionVersion $taskVersion -Region $Region -Locale $Locale -DatabaseUser $DatabaseUser -DatabaseName $DatabaseName
  docker compose up -d --no-deps api
  if ($LASTEXITCODE -ne 0) { throw 'Catálogo publicado; confira a inicialização da aplicação.' }
  Set-Content -LiteralPath (Join-Path $taskWorkspace 'data/current-extraction.txt') -Value $taskVersion -Encoding utf8NoBOM
  Write-Output 'Catálogo sincronizado. Confirme a leitura dos dados antes de distribuir a versão em produção.'
} finally {
  Pop-Location
}
