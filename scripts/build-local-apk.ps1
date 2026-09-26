$ErrorActionPreference='Continue'
Set-Location 'D:\OnlineTam'
. .\scripts\use-d-drive.ps1
$env:JAVA_HOME=(Get-ChildItem -LiteralPath 'D:\BuildCache\jdk' -Directory | Where-Object Name -Like 'jdk-21*' | Select-Object -First 1).FullName
if (-not $env:JAVA_HOME) { throw 'Java 21 missing' }
$env:Path=$env:JAVA_HOME+'\bin;C:\Program Files\Git\usr\bin;'+$env:Path
$env:ANDROID_HOME='D:\ExamAssist\.android-sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:GRADLE_RO_DEP_CACHE='D:\ExamAssist\.gradle-user-home\caches'
$env:JAVA_TOOL_OPTIONS='-Duser.home=D:\BuildCache\java-user -Djava.io.tmpdir=D:\BuildCache\tmp'
$env:NODE_ENV='production'
Remove-Item Env:\ANDROID_SDK_HOME -ErrorAction SilentlyContinue
$env:CI='1'
$env:APP_PUBLIC_API_URL='https://tambola-circle.ffegu0617.workers.dev'
$env:ANDROID_KEYSTORE_FILE='D:\OnlineTam\.credentials\trust-tambola-release.jks'
$circleSigning=Get-Content -LiteralPath '.credentials\android-signing.json' -Raw | ConvertFrom-Json
$env:ANDROID_KEYSTORE_PASSWORD=$circleSigning.password
Remove-Variable circleSigning
Set-Content -LiteralPath 'android\local.properties' -Value 'sdk.dir=D:/ExamAssist/.android-sdk' -Encoding ascii
$circleVersion=(Get-Content -LiteralPath 'app.json' -Raw | ConvertFrom-Json).version
$circleRelease=Join-Path 'D:\OnlineTam\artifacts' "release-$circleVersion"
New-Item -ItemType Directory -Path $circleRelease,'D:\OnlineTam\android\app\build' -Force | Out-Null
# Metro copies assets without removing an earlier bank. Reset only its disposable
# release outputs so a local incremental build cannot retain old voice files.
$circleGeneratedRoot=[IO.Path]::GetFullPath('D:\OnlineTam\android\app\build\generated')
foreach ($circleRelative in @('res\react\release','assets\react\release')) {
  $circleGenerated=Join-Path $circleGeneratedRoot $circleRelative
  if (Test-Path -LiteralPath $circleGenerated) {
    $circleResolved=(Resolve-Path -LiteralPath $circleGenerated).Path
    if ($circleResolved -ne (Join-Path $circleGeneratedRoot $circleRelative)) { throw 'Unexpected generated asset path' }
    $circleEntries=@(Get-Item -LiteralPath $circleResolved -Force)+@(Get-ChildItem -LiteralPath $circleResolved -Force -Recurse)
    if ($circleEntries | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Reparse point in generated release assets' }
    Remove-Item -LiteralPath $circleResolved -Recurse -Force
  }
}
& compact.exe /C /I /Q 'D:\BuildCache\gradle' 'D:\OnlineTam\android\app\build' | Out-Null
try {
  Push-Location android
  # Keep Kotlin inside the D:-configured Gradle JVM; its separate daemon otherwise
  # defaults its discovery/run files to LOCALAPPDATA on C:.
  & .\gradlew.bat ':app:assembleRelease' '--stacktrace' '--no-build-cache' '--no-daemon' '--max-workers=2' '--console=plain' '-Pkotlin.compiler.execution.strategy=in-process' '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64' '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' 2>&1 | Tee-Object -FilePath (Join-Path $circleRelease 'build-local.log')
  $circleBuildExit=$LASTEXITCODE
  if ($circleBuildExit -ne 0) { throw "Android build failed with exit $circleBuildExit" }
} finally {
  Pop-Location
  Remove-Item Env:\ANDROID_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
}
