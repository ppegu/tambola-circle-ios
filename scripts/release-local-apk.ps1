param(
  [ValidateSet('Build', 'Verify', 'Inspect', 'Publish', 'Release')]
  [string]$Action = 'Release'
)

$ErrorActionPreference = 'Stop'
Set-Location 'D:\OnlineTam'
. .\scripts\use-d-drive.ps1
$env:JAVA_HOME = (Get-ChildItem -LiteralPath 'D:\BuildCache\jdk' -Directory | Where-Object Name -Like 'jdk-21*' | Select-Object -First 1).FullName
if (-not $env:JAVA_HOME) { throw 'Java 21 missing' }
$env:Path = $env:JAVA_HOME + '\bin;C:\Program Files\Git\usr\bin;' + $env:Path
$env:ANDROID_HOME = 'D:\ExamAssist\.android-sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_TOOL_OPTIONS = '-Duser.home=D:\BuildCache\java-user -Djava.io.tmpdir=D:\BuildCache\tmp'

$circleVersion = (Get-Content -LiteralPath 'app.json' -Raw | ConvertFrom-Json).version
$circleRelease = Join-Path 'artifacts' "release-$circleVersion"
$circleApk = Join-Path $circleRelease "tambola-circle-$circleVersion.apk"
$circleNotes = Join-Path 'docs\releases' "$circleVersion.txt"
$circleDescriptor = Join-Path $circleRelease 'release.json'

function Invoke-LocalScript([string]$Path) {
  & $Path
  if ($LASTEXITCODE -ne 0) { throw "$Path failed with exit $LASTEXITCODE" }
}

if ($Action -in @('Build', 'Release')) {
  Invoke-LocalScript '.\scripts\build-local-apk.ps1'
}

if ($Action -eq 'Verify') {
  Invoke-LocalScript '.\scripts\verify-local-apk.ps1'
}

if ($Action -in @('Inspect', 'Publish', 'Release') -and -not (Test-Path -LiteralPath $circleApk)) {
  Invoke-LocalScript '.\scripts\verify-local-apk.ps1'
}

if ($Action -in @('Inspect', 'Publish', 'Release')) {
  node scripts/app-release.mjs inspect $circleApk --notes $circleNotes --out $circleDescriptor
  if ($LASTEXITCODE -ne 0) { throw 'Android release inspection failed' }
}

if ($Action -eq 'Publish') {
  node scripts/verify-apk.mjs $circleRelease
  if ($LASTEXITCODE -ne 0) { throw 'Android APK verification failed' }
  node scripts/app-release.mjs publish $circleApk --notes $circleNotes --out $circleDescriptor
  if ($LASTEXITCODE -ne 0) { throw 'Android release publication failed' }
}

if ($Action -eq 'Release') {
  node scripts/app-release.mjs publish $circleApk --notes $circleNotes --out $circleDescriptor
  if ($LASTEXITCODE -ne 0) { throw 'Android release publication failed' }
}