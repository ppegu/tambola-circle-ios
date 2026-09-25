export const PUBLIC_APP_ORIGIN = 'https://tambola-circle.ffegu0617.workers.dev';
export const LEGACY_APP_ORIGIN = 'https://tambola-circle.ffegu0617.workers.dev';

/** Normalize older build configuration without changing local QA or custom deployments. */
export function publicAppUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  try {
    const url = new URL(trimmed);
    if (url.origin === LEGACY_APP_ORIGIN) return PUBLIC_APP_ORIGIN + url.pathname.replace(/\/+$/, '') + url.search + url.hash;
  } catch { /* An unconfigured endpoint stays unconfigured. */ }
  return trimmed;
}

export function tableInviteUrl(apiOrigin: string, tableId: string, invite: string): string {
  return `${publicAppUrl(apiOrigin)}/invite/${tableId}/${invite}`;
}
