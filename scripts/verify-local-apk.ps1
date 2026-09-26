$ErrorActionPreference='Stop'
Set-Location 'D:\OnlineTam'
. .\scripts\use-d-drive.ps1
$env:JAVA_HOME=(Get-ChildItem -LiteralPath 'D:\BuildCache\jdk' -Directory | Where-Object Name -Like 'jdk-21*' | Select-Object -First 1).FullName
$env:Path=$env:JAVA_HOME+'\bin;C:\Program Files\Git\usr\bin;'+$env:Path
$env:JAVA_TOOL_OPTIONS='-Duser.home=D:\BuildCache\java-user -Djava.io.tmpdir=D:\BuildCache\tmp'
$circleVersion=(Get-Content -LiteralPath app.json -Raw | ConvertFrom-Json).version
$circleName="tambola-circle-$circleVersion.apk"
$circleApk=Join-Path 'artifacts' $circleName
$circleRelease=Join-Path 'artifacts' "release-$circleVersion"
Copy-Item -LiteralPath 'android\app\build\outputs\apk\release\app-release.apk' -Destination $circleApk -Force
& 'D:\ExamAssist\.android-sdk\build-tools\36.0.0\apksigner.bat' verify --verbose --print-certs $circleApk | Set-Content -LiteralPath 'artifacts\signature.txt' -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
& 'D:\ExamAssist\.android-sdk\build-tools\36.0.0\aapt.exe' dump badging $circleApk | Set-Content -LiteralPath 'artifacts\apk-info.txt' -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'APK metadata extraction failed' }
& 'D:\ExamAssist\.android-sdk\build-tools\36.0.0\aapt.exe' dump permissions $circleApk | Set-Content -LiteralPath 'artifacts\permissions.txt' -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'APK permission extraction failed' }
node scripts/verify-apk.mjs
if ($LASTEXITCODE -ne 0) { throw 'Repository APK verification failed' }
$circleSignature=Get-Content -LiteralPath 'artifacts\signature.txt' -Raw
if ($circleSignature -notmatch '2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071') { throw 'Release certificate does not match existing installations' }
$circleHash=(Get-FileHash -LiteralPath $circleApk -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath 'artifacts\SHA256SUMS.txt' -Value "$circleHash  $circleName" -Encoding ascii
node scripts/verify-release-assets.mjs
if ($LASTEXITCODE -ne 0) { throw 'Device modules or caller artwork verification failed' }
foreach ($circleFile in @($circleName,'signature.txt','apk-info.txt','permissions.txt','SHA256SUMS.txt')) {
  Move-Item -LiteralPath (Join-Path 'artifacts' $circleFile) -Destination (Join-Path $circleRelease $circleFile) -Force
}
$circleCommit=git rev-parse HEAD
[ordered]@{version=$circleVersion;commit=$circleCommit;worktreeModified=[bool](git status --porcelain);build='local Windows release';architectures=@('arm64-v8a','armeabi-v7a','x86_64');sha256=$circleHash;signingCertificateSha256='2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071';verifiedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $circleRelease 'build-info.json') -Encoding utf8
Get-Item -LiteralPath (Join-Path $circleRelease $circleName) | Select-Object FullName,Length
Get-Content -LiteralPath (Join-Path $circleRelease 'SHA256SUMS.txt')
