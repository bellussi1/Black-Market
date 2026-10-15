function Normalize-StagingAllowedEmails {
  param([string[]]$Email = @())

  if ($Email.Count -lt 1) { throw 'Informe de 1 a 10 e-mails autorizados antes de compartilhar o staging.' }
  if ($Email.Count -gt 10) { throw 'O staging aceita no máximo dez e-mails de tester.' }

  $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  $normalized = [System.Collections.Generic.List[string]]::new()
  foreach ($value in $Email) {
    $email = $value.Trim().ToLowerInvariant()
    if ($email -notmatch '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$') {
      throw 'E-mail autorizado inválido.'
    }
    if (-not $seen.Add($email)) { throw 'A lista de testers não pode repetir e-mails.' }
    $normalized.Add($email)
  }

  return $normalized.ToArray()
}

function Get-StagingSeedDumpExclusionArguments {
  return @(
    '--exclude-table-data=public.user_workspaces'
    '--exclude-table-data=public.auth_users'
    '--exclude-table-data=public.auth_identities'
    '--exclude-table-data=public.steam_auth_attempts'
    '--exclude-table-data=public.steam_auth_exchanges'
    '--exclude-table-data=public.market_snapshots'
    '--exclude-table-data=public.market_current_prices'
    '--exclude-table-data=public.market_price_points'
  )
}
