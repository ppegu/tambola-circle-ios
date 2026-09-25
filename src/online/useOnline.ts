import { useEffect } from 'react';
import { useStore } from 'zustand';
import { initializeOnline, onlineStore, type OnlineModel } from './onlineStore';
export { onlineStore, initializeOnline } from './onlineStore';
export type { OnlineModel } from './onlineStore';
/** Native screens use narrow selectors; the compatibility default serves isolated screen fixtures. */
export function useOnline<T = OnlineModel>(selector: (state: OnlineModel) => T = (state => state) as (state: OnlineModel) => T): T {
  useEffect(initializeOnline, []);
  return useStore(onlineStore, selector);
}
