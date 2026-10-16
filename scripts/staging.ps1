param(
  [ValidateSet('Start', 'Update', 'Stop', 'Status', 'Backup', 'Seed', 'SeedProfile', 'Share', 'Rollback', 'ScheduleBackup')]
  [string]$Action = 'Start',
  [string[]]$AllowedEmail = @()
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'staging-guards.ps1')
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$taskEnv = Join-Path $taskRoot '.env.staging'
$taskStateDir = Join-Path $taskRoot 'data/staging'
$taskState = Join-Path $taskStateDir 'images.json'
$taskCompose = 'docker-compose.staging.yml'
$taskTunnelState = Join-Path $taskStateDir 'tunnel.json'

function Stop-StageTunnel {
  if (Test-Path -LiteralPath $taskTunnelState) {
    $saved = Get-Content -LiteralPath $taskTunnelState -Raw | ConvertFrom-Json
    $running = Get-Process -Id $saved.pid -ErrorAction SilentlyContinue
    if ($running -and $running.ProcessName -eq 'cloudflared' -and $running.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.started) {
      Stop-Process -Id $running.Id
    }
  }
}

function Invoke-Docker {
  param([string[]]$Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Docker falhou. Confira a mensagem acima.' }
}
function Invoke-Stage {
  param([string[]]$Arguments)
  Invoke-Docker (@('compose', '--env-file', $taskEnv, '-f', $taskCompose) + $Arguments)
}
function Set-StageValue {
  param([string]$Name, [string]$Value)
  $lines = @(Get-Content -LiteralPath $taskEnv)
  $found = $false
  $lines = @($lines | ForEach-Object {
    if ($_.StartsWith($Name + '=')) { $found = $true; "$Name=$Value" } else { $_ }
  })
  if (-not $found) { $lines += "$Name=$Value" }
  [IO.File]::WriteAllLines($taskEnv, $lines)
}
function Backup-Stage {
  & (Join-Path $PSScriptRoot 'backup-database.ps1') -ComposeFile $taskCompose -EnvFile $taskEnv -OutputDirectory 'data/staging/backups' -ApplyRetention
}
function Wait-Stage {
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
      $response = Invoke-WebRequest 'http://127.0.0.1:8081/ready' -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        $web = Invoke-WebRequest 'http://127.0.0.1:8081/' -TimeoutSec 30
        if ($web.StatusCode -eq 200) { return }
      }
    } catch { }
    Start-Sleep -Seconds 2
  }
  throw 'Staging não ficou pronto. Use docker compose --env-file .env.staging -f docker-compose.staging.yml logs --tail 60.'
}
function Start-Stage {
  Invoke-Stage @('up', '-d', '--no-build', '--wait', 'postgres')
  Invoke-Stage @('run', '--rm', '--no-deps', 'migrate')
  Invoke-Stage @('run', '--rm', '--no-deps', 'permissions')
  $checksums = @(Invoke-Stage @('exec', '-T', 'postgres', 'sh', '-c', 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT DISTINCT checksum FROM dataset_versions WHERE status = ''active'' AND checksum IS NOT NULL;"'))
  if ($checksums.Count -eq 0) { throw 'Catálogo ausente: execute Seed antes de Start em um banco vazio.' }
  foreach ($checksum in $checksums) {
    if ($checksum -notmatch '^[a-f0-9]{64}$') { throw 'Checksum de assets inválido.' }
  }
  Set-StageValue 'ASSET_CHECKSUMS' ($checksums -join ' ')
  Invoke-Stage @('run', '--rm', '--no-deps', 'assets')
  Invoke-Stage @('up', '-d', '--no-build', '--no-deps', 'api', 'web')
  Invoke-Stage @('up', '-d', '--no-build', '--no-deps', '--force-recreate', 'gateway')
  Wait-Stage
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Instale/inicie o Docker Desktop.' }
New-Item -ItemType Directory -Path $taskStateDir -Force | Out-Null
if (-not (Test-Path -LiteralPath $taskEnv)) {
  $owner = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
  $runtime = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
  [IO.File]::WriteAllLines($taskEnv, @(
    'POSTGRES_DB=black_market_staging', 'POSTGRES_USER=black_market_staging',
    "POSTGRES_PASSWORD=$owner", "POSTGRES_APP_PASSWORD=$runtime",
    "CONTAINER_DATABASE_URL=postgresql://black_market_staging:${owner}@postgres:5432/black_market_staging",
    "RUNTIME_DATABASE_URL=postgresql://black_market_app:${runtime}@postgres:5432/black_market_staging",
    'PUBLIC_SITE_URL=http://localhost:8081', 'APP_IMAGE=black-market:staging', 'ASSET_CHECKSUMS=not-initialized',
    'FIREBASE_PROJECT_ID=', 'FIREBASE_AUTH_DOMAIN=', 'FIREBASE_API_KEY=', 'FIREBASE_APP_ID=',
    'FIREBASE_ADMIN_CREDENTIALS_BASE64=', 'STEAM_OPENID_CALLBACK_URL=', 'STAGING_TEST_FIREBASE_UID=',
    'ANALYTICS_ENABLED=false', 'MARKET_COLLECTOR_ENABLED=false', 'MARKET_BOARD_COLLECTOR_ENABLED=false'
  ))
}

switch ($Action) {
  'ScheduleBackup' {
    $pwsh = (Get-Process -Id $PID).Path
    $job = New-ScheduledTaskAction -Execute $pwsh -Argument ('-NoProfile -NonInteractive -File "' + (Join-Path $PSScriptRoot 'staging-backup.ps1') + '"') -WorkingDirectory $taskRoot
    $trigger = New-ScheduledTaskTrigger -Daily -At '12:00'
    $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName 'BlackMarket-Staging-Backup' -Action $job -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Write-Output 'Backup agendado diariamente às 12:00, no horário do Windows, quando staging estiver ligado. Status: data/staging/backup-status.txt.'
    return
  }
  'Status' { Invoke-Stage @('ps'); return }
  'Stop' {
    Stop-StageTunnel
    Invoke-Stage @('stop')
    Write-Output 'Staging e túnel parados; banco e backups preservados.'
    return
  }
  'Backup' { Backup-Stage; return }
  'Seed' {
    # Explicit first-use operation: restore catalog/schema only into an empty staging DB.
    Invoke-Stage @('up', '-d', '--wait', 'postgres')
    $tables = (Invoke-Stage @('exec', '-T', 'postgres', 'sh', '-c', 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT count(*) FROM information_schema.tables WHERE table_schema IN (''public'',''drizzle'');"')).Trim()
    if ($tables -ne '0') { throw 'Seed permitido somente em staging vazio. Nenhum banco foi substituído.' }
    if (-not (Test-Path -LiteralPath '.env')) { throw 'Arquivo .env local não encontrado.' }
    $remote = '/tmp/black-market-staging-seed.dump'
    $dump = Join-Path $taskStateDir 'catalog-seed.dump'
    $dev = @('compose', '--env-file', '.env', '-f', 'docker-compose.yml')
    $exclusions = (Get-StagingSeedDumpExclusionArguments) -join ' '
    $dumpCommand = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-acl ' + $exclusions + ' -f /tmp/black-market-staging-seed.dump'
    Invoke-Docker ($dev + @('exec', '-T', 'postgres', 'sh', '-c', $dumpCommand))
    $source = (Invoke-Docker ($dev + @('ps', '-q', 'postgres'))).Trim()
    Invoke-Docker @('cp', "${source}:$remote", $dump)
    Invoke-Docker ($dev + @('exec', '-T', 'postgres', 'rm', $remote))
    $target = (Invoke-Stage @('ps', '-q', 'postgres')).Trim()
    Invoke-Docker @('cp', $dump, "${target}:$remote")
    Invoke-Stage @('exec', '-T', 'postgres', 'sh', '-c', 'pg_restore --exit-on-error --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/black-market-staging-seed.dump')
    Invoke-Stage @('exec', '-T', 'postgres', 'rm', $remote)
    Write-Output 'Catálogo copiado para staging. Dados de usuários e histórico de mercado excluídos. Assets locais montados somente para leitura.'
    return
  }
  'SeedProfile' {
    Wait-Stage
    Invoke-Stage @('exec', '-T', 'api', 'pnpm', '--filter', '@bdo/api', 'workspace:seed-test-profile')
    return
  }
  'Rollback' {
    if (-not (Test-Path -LiteralPath $taskState)) { throw 'Nenhuma versão anterior registrada.' }
    $state = Get-Content -LiteralPath $taskState -Raw | ConvertFrom-Json
    if (-not $state.previous) { throw 'Nenhuma versão anterior registrada.' }
    Backup-Stage
    Set-StageValue 'APP_IMAGE' $state.previous
    Invoke-Stage @('run', '--rm', '--no-deps', 'permissions')
    Invoke-Stage @('up', '-d', '--no-build', '--no-deps', 'api', 'web')
    Invoke-Stage @('up', '-d', '--no-build', '--no-deps', '--force-recreate', 'gateway')
    Wait-Stage
    $old = $state.current; $state.current = $state.previous; $state.previous = $old
    $state | ConvertTo-Json | Set-Content -LiteralPath $taskState
    Write-Output 'Imagem anterior ativa. Migrations não foram desfeitas; confirme compatibilidade do banco.'
    return
  }
  'Share' {
    $normalizedAllowedEmails = @(Normalize-StagingAllowedEmails -Email $AllowedEmail)
    $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
    $cloudflaredPath = $(if ($cloudflared) { $cloudflared.Source } else { Join-Path ${env:ProgramFiles(x86)} 'cloudflared/cloudflared.exe' })
    if (-not (Test-Path -LiteralPath $cloudflaredPath)) { throw 'Instale cloudflared: winget install --id Cloudflare.cloudflared --exact. Depois reabra o terminal.' }
    Wait-Stage
    if (Test-Path -LiteralPath $taskTunnelState) {
      $saved = Get-Content -LiteralPath $taskTunnelState -Raw | ConvertFrom-Json
      $running = Get-Process -Id $saved.pid -ErrorAction SilentlyContinue
      if ($running -and $running.ProcessName -eq 'cloudflared' -and $running.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.started) {
        throw 'Já existe um túnel de staging. Encerre o terminal Share anterior ou use Stop antes de abrir outro.'
      }
    }
    $log = Join-Path $taskStateDir 'tunnel.log'
    $errLog = Join-Path $taskStateDir 'tunnel-error.log'
    $argsList = @('tunnel', '--url', 'http://127.0.0.1:8081')
    foreach ($email in $normalizedAllowedEmails) { $argsList += @('--allowed-mail', $email) }
    $process = Start-Process $cloudflaredPath -ArgumentList $argsList -WindowStyle Hidden -PassThru -RedirectStandardOutput $log -RedirectStandardError $errLog
    @{ pid = $process.Id; started = $process.StartTime.ToUniversalTime().Ticks.ToString() } | ConvertTo-Json | Set-Content -LiteralPath $taskTunnelState
    try {
      $url = $null
      for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($process.HasExited) { throw 'O túnel encerrou. Confira data/staging/tunnel-error.log e a versão do cloudflared.' }
        $output = (Get-Content -LiteralPath $log, $errLog -Raw -ErrorAction SilentlyContinue) -join "`n"
        $match = [regex]::Match($output, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($match.Success) { $url = $match.Value; break }
        Start-Sleep -Seconds 1
      }
      if (-not $url) { throw 'Não foi possível obter o endereço do túnel.' }
      Set-StageValue 'PUBLIC_SITE_URL' $url
      $firebaseProject = (Get-Content -LiteralPath $taskEnv | Where-Object { $_.StartsWith('FIREBASE_PROJECT_ID=') } | Select-Object -First 1) -replace '^FIREBASE_PROJECT_ID=', ''
      $authDomain = (Get-Content -LiteralPath $taskEnv | Where-Object { $_.StartsWith('FIREBASE_AUTH_DOMAIN=') } | Select-Object -First 1) -replace '^FIREBASE_AUTH_DOMAIN=', ''
      if ($firebaseProject) { Set-StageValue 'STEAM_OPENID_CALLBACK_URL' ($url + '/api/v1/identity/steam/callback') }
      Invoke-Stage @('up', '-d', '--no-build', '--no-deps', 'api', 'web')
      Invoke-Stage @('up', '-d', '--no-build', '--no-deps', '--force-recreate', 'gateway')
      Wait-Stage
      $previousStagingUrl = $env:STAGING_URL
      try {
        Remove-Item Env:STAGING_URL -ErrorAction SilentlyContinue
        & pnpm test:staging
        if ($LASTEXITCODE -ne 0) { throw 'O smoke test de staging falhou; o endereço não será publicado.' }
      } finally {
        if ($null -eq $previousStagingUrl) { Remove-Item Env:STAGING_URL -ErrorAction SilentlyContinue }
        else { $env:STAGING_URL = $previousStagingUrl }
      }
      $access = 'restrito aos e-mails autorizados'
      if ($firebaseProject) {
        $hostName = ([uri]$url).Host
        Write-Output "Firebase Authentication > Settings > Authorized domains: adicione $hostName."
        if ($authDomain) { Write-Output "Google OAuth redirect URI: https://$authDomain/__/auth/handler (mantenha essa URI autorizada no cliente OAuth)." }
        Write-Output "Callback Steam usado nesta sessão: $url/api/v1/identity/steam/callback."
      }
      Write-Output "Staging: $url ($access). Mantenha este terminal aberto; Ctrl+C encerra o acesso."
      while (-not $process.HasExited) { Start-Sleep -Seconds 2 }
    } finally {
      if (-not $process.HasExited) { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue }
      Set-StageValue 'PUBLIC_SITE_URL' 'http://localhost:8081'
      if ($firebaseProject) { Set-StageValue 'STEAM_OPENID_CALLBACK_URL' 'http://localhost:8081/api/v1/identity/steam/callback' }
    }
    return
  }
}

if ($Action -in @('Start', 'Update')) {
  Set-StageValue 'PUBLIC_SITE_URL' 'http://localhost:8081'
  $firebaseProject = @((Get-Content -LiteralPath $taskEnv) | Where-Object { $_.StartsWith('FIREBASE_PROJECT_ID=') })[0] -replace '^FIREBASE_PROJECT_ID=', ''
  if ($firebaseProject) {
    Set-StageValue 'STEAM_OPENID_CALLBACK_URL' 'http://localhost:8081/api/v1/identity/steam/callback'
  }
}
$current = @((Get-Content -LiteralPath $taskEnv) | Where-Object { $_.StartsWith('APP_IMAGE=') })[0].Substring(10)
& docker image inspect $current *> $null
$hasImage = $LASTEXITCODE -eq 0
if ($Action -eq 'Update' -or -not $hasImage) {
  if ($hasImage) {
    Invoke-Stage @('up', '-d', '--no-build', '--wait', 'postgres')
    Backup-Stage
  }
  $tag = 'black-market:staging-' + (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss')
  Invoke-Docker @('build', '--build-arg', 'WEB_BUILD_CONFIGURATION=production,staging', '-t', $tag, '.')
  Set-StageValue 'APP_IMAGE' $tag
  try { Start-Stage } catch {
    Set-StageValue 'APP_IMAGE' $current
    throw
  }
  @{ current = $tag; previous = $(if ($hasImage) { $current } else { $null }) } | ConvertTo-Json | Set-Content -LiteralPath $taskState
} else { Start-Stage }
Write-Output 'Staging pronto: http://localhost:8081. Para compartilhar, use Share com -AllowedEmail (1 a 10 endereços únicos).'
