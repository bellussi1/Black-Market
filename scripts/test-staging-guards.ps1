$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'staging-guards.ps1')

function Assert-Check {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Assert-Throws {
  param([scriptblock]$Action, [string]$Message)
  try {
    & $Action
  } catch {
    return
  }
  throw $Message
}

Assert-Throws { Normalize-StagingAllowedEmails -Email @() } 'An empty tester allowlist was accepted.'
$emails = @(Normalize-StagingAllowedEmails -Email @(' Tester@Example.com ', 'other@example.com'))
Assert-Check ($emails.Count -eq 2 -and $emails[0] -eq 'tester@example.com') 'Tester emails were not normalized.'

$elevenEmails = 1..11 | ForEach-Object { "tester$_@example.com" }
Assert-Throws { Normalize-StagingAllowedEmails -Email $elevenEmails } 'More than ten testers were accepted.'
Assert-Throws {
  Normalize-StagingAllowedEmails -Email @('tester@example.com', ' Tester@Example.com ')
} 'Duplicate tester emails were accepted.'
Assert-Throws { Normalize-StagingAllowedEmails -Email @('invalid') } 'An invalid tester email was accepted.'

$excluded = @(Get-StagingSeedDumpExclusionArguments)
foreach ($table in @(
    'user_workspaces', 'auth_users', 'auth_identities', 'steam_auth_attempts', 'steam_auth_exchanges',
    'market_snapshots', 'market_current_prices', 'market_price_points'
  )) {
  Assert-Check ($excluded -contains "--exclude-table-data=public.$table") "Seed includes personal table data: $table"
}

Write-Output 'Staging guards verified: allowlist is closed, limited to ten, and seed excludes user/auth data.'
