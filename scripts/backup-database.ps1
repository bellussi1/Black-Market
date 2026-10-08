param(
  [string]$ComposeFile = 'docker-compose.yml',
  [string]$EnvFile = '.env',
  [string]$OutputDirectory = 'data/backups',
  [switch]$ApplyRetention
)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskOutput = [IO.Path]::GetFullPath((Join-Path $taskRoot $OutputDirectory))
if (-not $taskOutput.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'O diretório de backup deve estar dentro do projeto.' }
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskStamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$taskDump = Join-Path $taskOutput ('black-market-' + $taskStamp + '.dump')
$taskContainerDump = '/tmp/black-market-' + $taskStamp + '.dump'
$taskArgs = @('compose', '--env-file', $EnvFile, '-f', $ComposeFile)
& docker @taskArgs exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"' sh $taskContainerDump
if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar backup.' }
$taskContainer = (& docker @taskArgs ps -q postgres).Trim()
& docker cp "${taskContainer}:$taskContainerDump" $taskDump
if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar backup.' }
& docker @taskArgs exec -T postgres rm $taskContainerDump
$taskManifest = @{ createdAt = (Get-Date).ToUniversalTime().ToString('o'); dump = [IO.Path]::GetFileName($taskDump); sha256 = (Get-FileHash -LiteralPath $taskDump -Algorithm SHA256).Hash; gitRevision = (git -C $taskRoot rev-parse HEAD); assets = 'data/assets: copiar separadamente para destino externo protegido'; retention = '7 diários + 4 semanais' }
$taskManifest | ConvertTo-Json | Set-Content -LiteralPath ($taskDump + '.json')
if ($ApplyRetention) {
  $taskFiles = @(Get-ChildItem -LiteralPath $taskOutput -Filter 'black-market-*.dump' -File | Sort-Object LastWriteTimeUtc -Descending)
  $taskKeep = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $taskDays = [Collections.Generic.HashSet[string]]::new(); $taskWeeks = [Collections.Generic.HashSet[string]]::new()
  foreach ($taskFile in $taskFiles) {
    $taskDay = $taskFile.LastWriteTimeUtc.ToString('yyyy-MM-dd')
    $taskWeek = $taskFile.LastWriteTimeUtc.AddDays(-[int]$taskFile.LastWriteTimeUtc.DayOfWeek).ToString('yyyy-MM-dd')
    if (($taskDays.Count -lt 7 -and $taskDays.Add($taskDay)) -or ($taskWeeks.Count -lt 4 -and $taskWeeks.Add($taskWeek))) { [void]$taskKeep.Add($taskFile.FullName) }
  }
  foreach ($taskFile in $taskFiles) {
    $taskTarget = [IO.Path]::GetFullPath($taskFile.FullName)
    if (-not $taskTarget.StartsWith($taskOutput + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Destino de retenção inválido.' }
    if (-not $taskKeep.Contains($taskTarget)) {
      Remove-Item -LiteralPath $taskTarget
      if (Test-Path -LiteralPath ($taskTarget + '.json')) { Remove-Item -LiteralPath ($taskTarget + '.json') }
    }
  }
}
Write-Output ('Backup criado: ' + $taskDump)
