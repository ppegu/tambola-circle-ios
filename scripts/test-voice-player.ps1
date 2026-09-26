# Exercise the actual Kotlin playback controller without packaging an APK or needing an emulator.
$ErrorActionPreference = 'Stop'
$voiceRepo = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'use-d-drive.ps1')
$voiceCache = Join-Path $env:GRADLE_USER_HOME 'caches\modules-2\files-2.1'
function Find-VoiceJar([string]$relative) {
  $result = Get-ChildItem -LiteralPath (Join-Path $voiceCache $relative) -Recurse -Filter '*.jar' | Select-Object -First 1
  if (!$result) { throw "Missing cached Kotlin dependency: $relative" }
  return $result.FullName
}
$voiceJars = @(
  (Find-VoiceJar 'org.jetbrains.kotlin\kotlin-compiler-embeddable\2.1.20'),
  (Find-VoiceJar 'org.jetbrains.kotlin\kotlin-stdlib\2.1.20'),
  (Find-VoiceJar 'org.jetbrains.kotlin\kotlin-script-runtime\2.1.20'),
  (Find-VoiceJar 'org.jetbrains.kotlin\kotlin-reflect\1.6.10'),
  (Find-VoiceJar 'org.jetbrains.kotlinx\kotlinx-coroutines-core-jvm\1.8.0'),
  (Find-VoiceJar 'org.jetbrains.intellij.deps\trove4j\1.0.20200330'),
  (Find-VoiceJar 'org.jetbrains\annotations\13.0')
)
$voiceJava = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else {
  Join-Path (Get-ChildItem -LiteralPath 'D:\BuildCache\jdk' -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName 'bin\java.exe'
}
$voiceOutput = Join-Path $voiceRepo '.tools\voice-player-tests'
New-Item -ItemType Directory -Path $voiceOutput -Force | Out-Null
$voiceTestJar = Join-Path $voiceOutput 'tests.jar'
& $voiceJava "-Djava.io.tmpdir=$env:TEMP" '-cp' ($voiceJars -join ';') 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler' '-no-stdlib' '-no-reflect' '-classpath' $voiceJars[1] '-d' $voiceTestJar (Join-Path $voiceRepo 'modules\circle-device\android\src\main\java\com\tambola-circle\circledevice\PreparedVoicePlayer.kt') (Join-Path $voiceRepo 'modules\circle-device\android\src\main\java\com\tambola-circle\circledevice\VoicePackStorage.kt') (Join-Path $PSScriptRoot 'tests\PreparedVoicePlayerTest.kt') (Join-Path $PSScriptRoot 'tests\VoicePackStorageTest.kt')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $voiceJava "-Djava.io.tmpdir=$env:TEMP" '-cp' ($voiceTestJar + ';' + $voiceJars[1]) 'com.ppegu.circledevice.PreparedVoicePlayerTestKt'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $voiceJava "-Djava.io.tmpdir=$env:TEMP" '-cp' ($voiceTestJar + ';' + $voiceJars[1]) 'com.ppegu.circledevice.VoicePackStorageTestKt'
exit $LASTEXITCODE
