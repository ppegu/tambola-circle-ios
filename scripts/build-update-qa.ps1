param([int]$VersionCode = 9)
$ErrorActionPreference = 'Stop'
Set-Location 'D:\OnlineTam'
. .\scripts\use-d-drive.ps1
$env:JAVA_HOME = (Get-ChildItem -LiteralPath 'D:\BuildCache\jdk' -Directory | Where-Object Name -Like 'jdk-21*' | Select-Object -First 1).FullName
$env:Path = $env:JAVA_HOME + '\bin;C:\Program Files\Git\usr\bin;' + $env:Path
$env:ANDROID_HOME = 'D:\ExamAssist\.android-sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_RO_DEP_CACHE = 'D:\ExamAssist\.gradle-user-home\caches'
$env:JAVA_TOOL_OPTIONS = '-Duser.home=D:\BuildCache\java-user -Djava.io.tmpdir=D:\BuildCache\tmp'
$env:APP_PUBLIC_API_URL = 'http://127.0.0.1:8792'
New-Item -ItemType Directory -Path artifacts\updates -Force | Out-Null
Push-Location android
try {
  & .\gradlew.bat ':app:assembleDebug' '--no-daemon' '--max-workers=2' '--console=plain' '-PreactNativeArchitectures=arm64-v8a' "-PcircleQaVersionCode=$VersionCode" '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' 2>&1 | Tee-Object -FilePath "D:\OnlineTam\artifacts\updates\build-debug-$VersionCode.log"
  if ($LASTEXITCODE -ne 0) { throw 'Update QA build failed.' }
} finally { Pop-Location }
Copy-Item -LiteralPath android\app\build\outputs\apk\debug\app-debug.apk -Destination "artifacts\updates\tambola-circle-qa-$VersionCode.apk"
