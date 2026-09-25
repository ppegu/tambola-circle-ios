import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { join } from 'node:path';
const directory = process.argv[2] ?? 'artifacts';
const permissions = readFileSync(join(directory, 'permissions.txt'), 'utf8');
const allowed = new Set(['android.permission.INTERNET', 'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.REQUEST_INSTALL_PACKAGES',
  'android.permission.ACCESS_NETWORK_STATE', 'com.ppegu.tambola.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION', 
'android.permission.RECORD_AUDIO']);
for (const [, permission] of permissions.matchAll(/uses-permission[^:]*: name='([^']+)'/g)) {
  assert(allowed.has(permission), 'Unexpected APK permission: ' + permission);
}
const info = readFileSync(join(directory, 'apk-info.txt'), 'utf8');
const config = JSON.parse(readFileSync('app.json', 'utf8'));
assert(info.includes("package: name='com.ppegu.tambola'"));
assert(info.includes(`application-label:'${config.displayName}'`), 'Incorrect launcher label');
assert(!/^application-label[^:]*:.*(?:legacy|internal)/im.test(info), 'Unexpected internal branding in translated app labels');
assert(info.includes(`versionCode='${config.android.versionCode}' versionName='${config.version}'`), 'Incorrect release version');
assert(!info.includes('application-debuggable'), 'APK must be a release build');
const apkPath = join(directory, `tambola-circle-${config.version}.apk`);
const entries = execFileSync('unzip', ['-Z1', apkPath], { encoding: 'utf8' }).split('\n');
assert(entries.includes('assets/index.android.bundle'), 'Standalone JavaScript bundle missing');
const voiceEntries = entries.filter(p => p.endsWith('.wav'));
const voiceManifest = JSON.parse(readFileSync('shared/voicePacks.json', 'utf8')).packs
  .flatMap(pack => pack.bundled ? pack.files : pack.files.filter(clip => clip.number === 47));
assert.equal(voiceEntries.length, voiceManifest.length, 'All 90 female number calls and four offline previews must be bundled');
const bundledHashes = voiceEntries.map(entry => createHash('sha256')
  .update(execFileSync('unzip', ['-p', apkPath, entry])).digest('hex')).sort();
assert.deepEqual(bundledHashes, voiceManifest.map(clip => clip.sha256).sort(), 'Bundled voice bytes differ from the checked voice packs');
const nativeBridgePresent = entries.filter(entry => /^classes\d*\.dex$/.test(entry))
  .some(entry => execFileSync('unzip', ['-p', apkPath, entry], { maxBuffer: 64 * 1024 * 1024 })
    .includes(Buffer.from('Lcom/ppegu/circledevice/CircleDeviceModule;')));
assert(nativeBridgePresent, 'Native SIM picker / game UI bridge missing from APK');
const voiceStoragePresent = entries.filter(entry => /^classes\d*\.dex$/.test(entry))
  .some(entry => execFileSync('unzip', ['-p', apkPath, entry], { maxBuffer: 64 * 1024 * 1024 })
    .includes(Buffer.from('Lcom/ppegu/circledevice/VoicePackStorage;')));
assert(voiceStoragePresent, 'Native verified offline voice storage missing from APK');
const updaterPresent = entries.filter(entry => /^classes\d*\.dex$/.test(entry))
  .some(entry => execFileSync('unzip', ['-p', apkPath, entry], { maxBuffer: 64 * 1024 * 1024 })
    .includes(Buffer.from('Lcom/ppegu/circledevice/CircleUpdaterModule;')));
assert(updaterPresent, 'Native verified APK updater missing from APK');
const cert = readFileSync(join(directory, 'signature.txt'), 'utf8');
assert(!cert.includes('CN=Android Debug'), 'Release must use the app signing key');
assert(cert.includes('2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071'), 'Release certificate must match existing installations');
console.log('Verified release manifest, standalone JS bundle, native CircleDevice bridge, 90 Aria calls, four offline previews, and the existing release signature.');
