# CI/CD for one Apps Script API: push the sources, create a version and redeploy the Web App (same URL).
# To reuse for another API: copy this file as cicd-<api>.ps1 and change only the Config block.
# Needs clasp installed and `clasp login` done by you (interactive, never scripted).
param(
  [ValidateSet('Push', 'Deploy', 'PushDeploy', 'Config')][string]$Action = 'PushDeploy',
  [string]$Description = ''
)

# ---- Config: the only block that changes when cloning for another API ----
$ApiName           = 'expense-api'
$ProjectDir        = 'backend/apps-script-expense-api'      # folder with .clasp.json, relative to the repo root
$DeploymentEnvVar  = 'EXPENSE_API_DEPLOYMENT_ID'            # Web App deployment id lives in the environment, not in git
$DefaultDescription = 'expense-api'                          # version description when -Description is empty
$ForcePush         = $true                                  # clasp push --force (skip the manifest overwrite prompt)
# ---- End of Config ----

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ProjectPath = Join-Path $RepoRoot $ProjectDir
$DeploymentId = [Environment]::GetEnvironmentVariable($DeploymentEnvVar)

function Assert-Clasp {
  if (-not (Get-Command clasp -ErrorAction SilentlyContinue)) { throw 'clasp is not installed: npm i -g @google/clasp' }
  if (-not (Test-Path (Join-Path $ProjectPath '.clasp.json'))) { throw "No .clasp.json in $ProjectPath" }
  if (-not (Test-Path (Join-Path $HOME '.clasprc.json'))) { throw 'Run `clasp login` first.' }
}

function Invoke-Clasp {
  param([Parameter(Mandatory)][string[]]$Arguments)
  $output = & clasp @Arguments
  if ($LASTEXITCODE -ne 0) { throw "clasp $($Arguments -join ' ') failed." }
  $output | ForEach-Object { Write-Host $_ }
  return ($output -join "`n")
}

function Invoke-Push {
  Write-Host "Pushing $ApiName"
  $arguments = @('push')
  if ($ForcePush) { $arguments += '--force' }
  Invoke-Clasp -Arguments $arguments | Out-Null
}

function New-Version {
  $text = if ($Description) { $Description } else { $DefaultDescription }
  $output = Invoke-Clasp -Arguments @('create-version', $text)
  if ($output -notmatch '(\d+)\s*\.?\s*$') { throw 'Could not read the new version number from clasp.' }
  return $Matches[1]
}

function Invoke-Deploy {
  if (-not $DeploymentId) { throw "Set the environment variable $DeploymentEnvVar to the Web App deployment id first." }
  $version = New-Version
  Write-Host "Redeploying $ApiName with version $version (URL stays the same)"
  Invoke-Clasp -Arguments @('redeploy', $DeploymentId, '-V', $version, '-d', "v$version") | Out-Null
}

function Show-Config {
  $deployment = if ($DeploymentId) { 'set' } else { "missing (set $DeploymentEnvVar)" }
  Write-Host "ApiName=$ApiName ProjectDir=$ProjectDir ForcePush=$ForcePush Deployment=$deployment"
}

Push-Location $ProjectPath
try {
  if ($Action -eq 'Config') { Show-Config; return }
  Assert-Clasp
  if ($Action -in 'Push', 'PushDeploy') { Invoke-Push }
  if ($Action -in 'Deploy', 'PushDeploy') { Invoke-Deploy }
  Write-Host 'Done.'
} finally {
  Pop-Location
}
