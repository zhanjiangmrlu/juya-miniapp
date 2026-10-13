[CmdletBinding()]
param(
    [ValidateSet('test', 'production')]
    [string]$Environment = 'test',
    [ValidateSet('publish', 'rollback', 'doctor', 'plan')]
    [string]$Action = 'publish',
    [string]$Config,
    [switch]$BuildOnly
)

$ErrorActionPreference = 'Stop'
# 转发 H5 项目、目标环境和操作，发布目标使用静态站点构建
$workspaceEntry = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'publish.ps1'
$releaseArguments = @{
    Project = 'juya-miniapp-h5'
    Environment = $Environment
    Action = $Action
}
if ($PSBoundParameters.ContainsKey('Config')) {
    $releaseArguments.Config = $Config
}
if ($BuildOnly) {
    $releaseArguments.BuildOnly = $true
}
& $workspaceEntry @releaseArguments
exit $LASTEXITCODE
