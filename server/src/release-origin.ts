import type { ReleaseDescriptor } from "../../shared/appAccess";
import { LEGACY_APP_ORIGIN, PUBLIC_APP_ORIGIN } from "../../shared/publicLinks";

export const LEGACY_API_ORIGIN = LEGACY_APP_ORIGIN;
export const API_ORIGIN = PUBLIC_APP_ORIGIN;
const origins = new Set([LEGACY_API_ORIGIN, API_ORIGIN]);

// Installed Android builds require the signed APK address to match their API
// origin. Both service names reach the same release bucket; never rebase onto
// an arbitrary Host header or change the immutable artifact path/hash.
export function releaseForOrigin(
  release: ReleaseDescriptor,
  origin?: string,
): ReleaseDescriptor {
  if (!origin || !origins.has(origin)) return release;
  const url = new URL(release.url);
  if (
    !origins.has(url.origin) ||
    !url.pathname.startsWith("/download/android/files/")
  )
    return release;
  return { ...release, url: origin + url.pathname + url.search };
}
