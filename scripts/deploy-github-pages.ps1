# Deploys the frontend for the plain GitHub Pages URL (https://<user>.github.io/<repo>/): assets are served from "/<repo>/".
param([switch]$Watch)

. (Join-Path $PSScriptRoot 'lib\invoke-pages-deploy.ps1')

$repoName = gh repo view --json name --jq '.name'
if ($LASTEXITCODE -ne 0 -or -not $repoName) { throw 'Could not read the repository name with gh.' }

Invoke-PagesDeploy -BasePath "/$repoName/" -Watch:$Watch
