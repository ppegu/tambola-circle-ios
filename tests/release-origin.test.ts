import { describe, expect, it } from 'vitest';
import { API_ORIGIN, LEGACY_API_ORIGIN, releaseForOrigin } from '../server/src/release-origin';
import type { ReleaseDescriptor } from '../shared/appAccess';
const path = '/download/android/files/com.ppegu.tambola/10/' + 'a'.repeat(64) + '.apk';
const release: ReleaseDescriptor = { id: 'android-10', packageId: 'com.ppegu.tambola', versionCode: 10, versionName: '1.5.0', bytes: 1000, sha256: 'a'.repeat(64), signerSha256: 'b'.repeat(64), minSdk: 24, abis: ['arm64-v8a'], url: LEGACY_API_ORIGIN + path, notes: [], publishedAt: 1 };
describe('Cloudflare origin migration', () => {
  it('keeps immutable release metadata while serving each client its own trusted origin', () => {
    expect(releaseForOrigin(release, API_ORIGIN)).toEqual({ ...release, url: API_ORIGIN + path });
    expect(releaseForOrigin({ ...release, url: API_ORIGIN + path }, LEGACY_API_ORIGIN)).toEqual(release);
    expect(release.url).toBe(LEGACY_API_ORIGIN + path);
  });
  it('never signs an arbitrary host, port or unowned download as a trusted update', () => {
    for (const origin of [undefined, 'https://attacker.example', API_ORIGIN + ':443', API_ORIGIN + '.attacker.example', 'http://127.0.0.1:8792']) {
      expect(releaseForOrigin(release, origin)).toBe(release);
    }
    const external = { ...release, url: 'https://example.test/file.apk' };
    expect(releaseForOrigin(external, API_ORIGIN)).toBe(external);
    const otherPath = { ...release, url: LEGACY_API_ORIGIN + '/invite/test' };
    expect(releaseForOrigin(otherPath, API_ORIGIN)).toBe(otherPath);
  });
});
