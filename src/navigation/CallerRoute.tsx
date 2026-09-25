import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import * as Crypto from '../native/crypto';
import { drawNumber, uniformInt } from '../game';
import { CallerScreen } from '../components/CallerScreen';
import { CallerGameMenu } from '../components/CallerGameMenu';
import { offlineStore } from '../state/offlineStore';
import { audioStore } from '../state/audioStore';
import { useScreenActive, useScreenNavigation } from './ScreenContext';

export function CallerRoute() {
  const navigation = useScreenNavigation()!, active = useScreenActive();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions(), insets = useSafeAreaInsets();
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const measure = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport(current => current?.width === width && current.height === height ? current : { width, height });
  }, []);
  const { preferences, history } = useStore(offlineStore, useShallow(s => ({ preferences: s.local.preferences, history: s.local.history })));
  const audio = useStore(audioStore);
  const [running, setRunning] = useState(false), [historyOpen, setHistoryOpen] = useState(false), [menuVisible, setMenuVisible] = useState(false);
  const playing = useRef(false), lastDraw = useRef(0), resumeAfterMenu = useRef(false);
  const pause = useCallback(() => { playing.current = false; setRunning(false); audioStore.getState().stop(); }, []);
  const next = useCallback(() => {
    const state = offlineStore.getState(), voice = audioStore.getState();
    if (state.local.preferences.sound && voice.preparing || Date.now() - lastDraw.current < 400) return;
    const n = drawNumber(state.local.history, max => uniformInt(max, () => Crypto.getRandomBytes(1)[0]!));
    if (n === null) { pause(); return; }
    lastDraw.current = Date.now(); state.updateHistory([...state.local.history, n]); voice.speak(n);
    if (state.local.history.length >= 89) { playing.current = false; setRunning(false); }
  }, [pause]);
  useEffect(() => {
    if (!running || !preferences.auto || !active || historyOpen) return;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => { if (!playing.current) return; if (audioStore.getState().isSpeaking()) timer = setTimeout(advance, 100); else next(); };
    timer = setTimeout(advance, preferences.speed * 1000); return () => clearTimeout(timer);
  }, [running, preferences.auto, preferences.speed, history.length, active, historyOpen, next]);
  useEffect(() => { if (!active || !preferences.auto) pause(); }, [active, preferences.auto, pause]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') pause(); });
    return () => { sub.remove(); audioStore.getState().stop(); offlineStore.getState().updateHistory([]); };
  }, [pause]);
  const reset = useCallback(() => { pause(); offlineStore.getState().updateHistory([]); lastDraw.current = 0; setHistoryOpen(false); }, [pause]);
  const openMenu = useCallback(() => {
    resumeAfterMenu.current = playing.current;
    pause(); setHistoryOpen(false); setMenuVisible(true);
  }, [pause]);
  const closeMenu = useCallback(() => {
    setMenuVisible(false);
    if (resumeAfterMenu.current && offlineStore.getState().local.preferences.auto && active) { playing.current = true; setRunning(true); }
    resumeAfterMenu.current = false;
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (historyOpen) { pause(); setHistoryOpen(false); } else openMenu(); return true; });
    return () => sub.remove();
  }, [active, historyOpen, openMenu, pause]);
  const width = Math.min(viewport?.width ?? screenWidth, 576), height = viewport?.height ?? screenHeight - insets.top - insets.bottom;
  return <View style={{ flex: 1, alignItems: 'center' }} onLayout={measure}><CallerScreen width={width} height={height} preferences={preferences} history={history} running={running} historyOpen={historyOpen}
    audioError={audio.error} voicePreparing={audio.preparing && preferences.sound}
    onPreferences={patch => { if (patch.auto !== undefined) pause(); offlineStore.getState().updatePreferences(patch); }}
    onMenu={openMenu}
    onHistory={() => { pause(); setHistoryOpen(!historyOpen); }} onNext={next}
    onPlay={() => { if (running) pause(); else if (history.length < 90 && !(preferences.sound && audio.preparing)) { playing.current = true; setRunning(true); next(); } }}
    onRepeat={() => { const n = history.at(-1); if (n) { pause(); audio.speak(n, true); } }} onReplay={n => audio.speak(n, true)} />
    <CallerGameMenu visible={menuVisible} count={history.length} onClose={closeMenu} onRestart={() => { setMenuVisible(false); resumeAfterMenu.current = false; reset(); }} onHome={() => { setMenuVisible(false); resumeAfterMenu.current = false; reset(); navigation.home(); }} />
  </View>;
}
