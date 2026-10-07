param(
  [string]$GamePath = 'C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online',
  [string]$ExtractorPath = '',
  [ValidatePattern('^[a-f0-9]{40}$')]
  [string]$ExtractorCommit = '5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2',
  [ValidatePattern('^[a-z]{2,8}$')][string]$Locale = 'pt',
  [ValidatePattern('^[a-z0-9-]{2,12}$')][string]$Region = 'sa'
)

$ErrorActionPreference = 'Stop'
$taskWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskGame = (Resolve-Path -LiteralPath $GamePath).Path
if (-not $ExtractorPath) { $ExtractorPath = Join-Path $taskWorkspace 'data/tools/bdo-data-extractor.exe' }
$taskExtractor = (Resolve-Path -LiteralPath $ExtractorPath).Path
$taskMetaPath = Join-Path $taskGame 'Paz/pad00000.meta'
$taskLocalePath = Join-Path $taskGame "ads/languagedata_$Locale.loc"
function Get-TaskHash([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}
$taskMetaHash = Get-TaskHash $taskMetaPath
$taskLocaleHash = Get-TaskHash $taskLocalePath
$taskVersion = "$Region-$Locale-meta-$($taskMetaHash.Substring(0,12))-loc-$($taskLocaleHash.Substring(0,12))-ext-$($ExtractorCommit.Substring(0,8))"
$taskOutput = [IO.Path]::GetFullPath((Join-Path $taskWorkspace "data/extracted/$taskVersion"))
if (-not $taskOutput.StartsWith($taskWorkspace + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
    $taskOutput.StartsWith($taskGame + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'A saída deve ficar dentro do projeto e fora da instalação do jogo.'
}
if (Test-Path -LiteralPath $taskOutput) {
  throw "Esta extração já existe: $taskOutput. Importe a saída existente ou use uma nova versão do cliente/extractor."
}
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskProvenance = [ordered]@{
  version = $taskVersion
  region = $Region
  locale = $Locale
  extractorCommit = $ExtractorCommit
  extractorSha256 = Get-TaskHash $taskExtractor
  metaSha256 = $taskMetaHash
  localizationSha256 = $taskLocaleHash
  startedAt = [DateTime]::UtcNow.ToString('o')
  status = 'extracting'
}
try {
  & $taskExtractor build --game $taskGame --out $taskOutput --lang $Locale --region $Region 2>&1 |
    Tee-Object -FilePath (Join-Path $taskOutput 'build.log')
  if ($LASTEXITCODE -ne 0) { throw "Falha no build do extractor: $LASTEXITCODE" }
  & $taskExtractor icons --game $taskGame --out $taskOutput --lang $Locale --region $Region 2>&1 |
    Tee-Object -FilePath (Join-Path $taskOutput 'icons.log')
  if ($LASTEXITCODE -ne 0) { throw "Falha na extração de ícones: $LASTEXITCODE" }
  if ((Get-TaskHash $taskMetaPath) -ne $taskMetaHash -or (Get-TaskHash $taskLocalePath) -ne $taskLocaleHash) {
    throw 'O cliente foi atualizado durante a extração. Execute novamente após o patch terminar.'
  }
  $taskProvenance.status = 'extracted'
} catch {
  $taskProvenance.status = 'failed'
  throw
} finally {
  $taskProvenance.finishedAt = [DateTime]::UtcNow.ToString('o')
  $taskProvenance | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskOutput 'provenance.json') -Encoding utf8NoBOM
}
Write-Output "Extração concluída: $taskOutput"
Write-Output "Versão para importar: $taskVersion"
