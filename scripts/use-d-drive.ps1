# Dot-source this file before local build/development commands:
# . .\scripts\use-d-drive.ps1
$circleBuildCacheRoot = 'D:\BuildCache'
$circleBuildVariables = @{
  TEMP = "$circleBuildCacheRoot\tmp"
  TMP = "$circleBuildCacheRoot\tmp"
  npm_config_cache = "$circleBuildCacheRoot\npm"
  PIP_CACHE_DIR = "$circleBuildCacheRoot\pip"
  GRADLE_USER_HOME = "$circleBuildCacheRoot\gradle"
  ANDROID_HOME = "$circleBuildCacheRoot\android-sdk"
  ANDROID_SDK_ROOT = "$circleBuildCacheRoot\android-sdk"
  ANDROID_USER_HOME = "$circleBuildCacheRoot\android-user"
  HF_HOME = "$circleBuildCacheRoot\huggingface"
  XDG_CACHE_HOME = "$circleBuildCacheRoot\xdg"
  WRANGLER_LOG_PATH = "$circleBuildCacheRoot\wrangler\logs"
  WRANGLER_REGISTRY_PATH = "$circleBuildCacheRoot\wrangler\registry"
}
foreach ($circleBuildEntry in $circleBuildVariables.GetEnumerator()) {
  if (!(Test-Path -LiteralPath $circleBuildEntry.Value)) {
    New-Item -ItemType Directory -Path $circleBuildEntry.Value -Force | Out-Null
  }
  [Environment]::SetEnvironmentVariable($circleBuildEntry.Key, $circleBuildEntry.Value, 'Process')
}
Remove-Variable circleBuildCacheRoot, circleBuildVariables, circleBuildEntry
