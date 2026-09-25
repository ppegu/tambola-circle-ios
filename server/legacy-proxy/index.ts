import { LEGACY_APP_ORIGIN, publicAppUrl } from '../../shared/publicLinks';

// Keep installed apps and pinned voice packs working after the rename.
// Forward API/download URLs unchanged so signed updates stay same-origin.
// Returning the response directly preserves streaming, ranges and WebSockets.
export default {
  fetch(request: Request, env: { TARGET: Fetcher }): Promise<Response> {
    const url = new URL(request.url);
    if (url.origin === LEGACY_APP_ORIGIN && ['GET', 'HEAD'].includes(request.method) && /^\/invite\/[a-f0-9-]{36}\/[a-f0-9]{64}$/.test(url.pathname)) {
      return Promise.resolve(Response.redirect(publicAppUrl(request.url), 308));
    }
    return env.TARGET.fetch(request);
  },
};
