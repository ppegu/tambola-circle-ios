import { describe, expect, it, vi } from 'vitest';
import { LEGACY_APP_ORIGIN, PUBLIC_APP_ORIGIN, publicAppUrl, tableInviteUrl } from '../shared/publicLinks';
import { parseInvite } from '../src/online/invites';
import proxy from '../server/legacy-proxy';

const table = '12345678-1234-4123-8123-123456789012', token = 'a'.repeat(64);
const path = `/invite/${table}/${token}`;
describe('Tambola Circle public links', () => {
  it('uses the current name for existing and new tables even with older build configuration', () => {
    for (const origin of [PUBLIC_APP_ORIGIN, LEGACY_APP_ORIGIN, LEGACY_APP_ORIGIN + '/']) {
      const url = tableInviteUrl(origin, table, token);
      expect(url).toBe(PUBLIC_APP_ORIGIN + path);
      expect(url).not.toContain('tambola-circle');
      expect(parseInvite(url)).toEqual({ tableId: table, invite: token });
    }
  });
  it('normalizes old download share links and preserves custom/local endpoints', () => {
    expect(publicAppUrl(LEGACY_APP_ORIGIN + '/download/android?source=share')).toBe(PUBLIC_APP_ORIGIN + '/download/android?source=share');
    for (const value of ['', 'http://127.0.0.1:8791', 'https://private.example', LEGACY_APP_ORIGIN + '.example']) expect(publicAppUrl(value)).toBe(value);
  });
  it('redirects old invite clicks while preserving the exact table and invite token', async () => {
    const fetch = vi.fn();
    for (const method of ['GET', 'HEAD']) {
      const response = await proxy.fetch(new Request(LEGACY_APP_ORIGIN + path, { method }), { TARGET: { fetch } as unknown as Fetcher });
      expect(response.status).toBe(308);
      expect(response.headers.get('Location')).toBe(PUBLIC_APP_ORIGIN + path);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('still forwards API, signed APK downloads, voice packs and malformed invites unchanged', async () => {
    const response = new Response('forwarded'), fetch = vi.fn().mockResolvedValue(response);
    for (const path of ['/v2/devices/open', '/download/android/files/com.ppegu.tambola/11/file.apk', '/packs/latest.json', '/invite/invalid']) {
      const request = new Request(LEGACY_APP_ORIGIN + path);
      expect(await proxy.fetch(request, { TARGET: { fetch } as unknown as Fetcher })).toBe(response);
      expect(fetch).toHaveBeenLastCalledWith(request);
    }
  });
});
