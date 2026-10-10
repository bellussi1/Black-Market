@echo off
setlocal
where pwsh >nul 2>nul
if not errorlevel 1 (
  pwsh -NoProfile -File "%~dp0scripts\staging.ps1" %*
  exit /b
)
set "STAGING_PWSH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe"
if exist "%STAGING_PWSH%" (
  "%STAGING_PWSH%" -NoProfile -File "%~dp0scripts\staging.ps1" %*
  exit /b
)
echo PowerShell 7 nao encontrado. Instale: winget install --id Microsoft.PowerShell --exact
exit /b 1
