import { useEffect } from 'react';
import { useStore } from 'zustand';
import { initializeOffline, offlineStore } from './state/offlineStore';
export type { AppModel } from './state/offlineStore';
export function useAppState() {
  useEffect(initializeOffline, []);
  return useStore(offlineStore);
}
