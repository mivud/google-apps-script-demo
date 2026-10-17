# Shared by the deploy scripts: sets the build base path and starts the Pages workflow.
# Needs the GitHub CLI (`gh`) signed in with access to this repository.
$ErrorActionPreference = 'Stop'

$WorkflowFile = 'deploy-pages.yml'
$WorkflowRef = 'main'
$BasePathVariable = 'VITE_BASE_PATH'

function Invoke-PagesDeploy {
  param(
    [Parameter(Mandatory)][string]$BasePath,
    [switch]$Watch
  )

  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI (gh) is not installed.' }
  gh auth status *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Run `gh auth login` first.' }

  Write-Host "Setting $BasePathVariable=$BasePath"
  gh variable set $BasePathVariable --body $BasePath
  if ($LASTEXITCODE -ne 0) { throw 'Could not set the repository variable.' }

  # The workflow file on main is the one that runs, so unmerged workflow changes are not used.
  Write-Host "Starting $WorkflowFile on $WorkflowRef"
  gh workflow run $WorkflowFile --ref $WorkflowRef
  if ($LASTEXITCODE -ne 0) { throw 'Could not start the workflow.' }

  if ($Watch) {
    Start-Sleep -Seconds 5
    $runId = gh run list --workflow $WorkflowFile --limit 1 --json databaseId --jq '.[0].databaseId'
    gh run watch $runId --exit-status
  } else {
    Write-Host 'Started. Follow it with: gh run list --workflow deploy-pages.yml'
  }
}
