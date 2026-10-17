# Deploys the frontend for a custom domain (for example https://nexus.vdminh.blog/): assets are served from "/".
param([switch]$Watch)

. (Join-Path $PSScriptRoot 'lib\invoke-pages-deploy.ps1')

Invoke-PagesDeploy -BasePath '/' -Watch:$Watch
