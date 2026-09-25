import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api';

/** Refresh keeps the last successful data and shares concurrent requests. */
export function useRemoteList<T>(token: string | undefined, path: string, field: string) {
  const [state, setState] = useState({ items: [] as T[], loaded: false, loading: false, error: '' });
  const identity = `${token ?? ''}:${path}`;
  const current = useRef(identity); current.current = identity;
  const mounted = useRef(true);
  const pending = useRef<{ identity: string; promise: Promise<void> } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setState({ items: [], loaded: false, loading: false, error: '' }); }, [identity]);
  const refresh = useCallback((): Promise<void> => {
    if (!token) return Promise.resolve();
    if (pending.current?.identity === identity) return pending.current.promise;
    setState(old => ({ ...old, loading: true, error: '' }));
    const active = () => mounted.current && current.current === identity;
    const promise = request<Record<string, T[]>>(path, { token }).then(data => {
      if (!Array.isArray(data[field])) throw new Error('Could not load this list. Please try again.');
      if (active()) setState({ items: data[field]!, loaded: true, loading: false, error: '' });
    }).catch(() => {
      if (active()) setState(old => ({ ...old, loading: false, error: 'Couldn’t refresh. Check your connection and try again.' }));
    }).finally(() => { if (pending.current?.promise === promise) pending.current = null; });
    pending.current = { identity, promise };
    return promise;
  }, [identity, token, path, field]);
  return { ...state, refresh, refreshing: state.loading && state.loaded };
}
