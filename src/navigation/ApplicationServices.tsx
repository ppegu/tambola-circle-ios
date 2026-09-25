import { startInvitations } from '../online/invitationStore';
import { startTableVoice } from '../voiceChat/runtime';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DevSettings, Linking, Platform } from 'react-native';
import { API_URL } from '../api';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { offlineStore, initializeOffline } from '../state/offlineStore';
import { audioStore } from '../state/audioStore';
import { onlineStore, initializeOnline } from '../online/onlineStore';
import { startDeviceRecording } from '../online/deviceRegistration';
import { setGameUi } from '../online/device';
import { savedInvite } from '../online/storage';
import { parseInvite } from '../online/invites';
import { useAppUpdates } from '../updates/UpdateRoot';
import { warmGameArtwork } from '../components/gameAssets';
import { useVoice } from '../useVoice';
import { navigationStore, pushScreen } from './router';
import { useScreenAppeared, useScreenActive } from './ScreenContext';
import { initializeLanguage, languageStore } from '../i18n';
import { FirstLanguagePicker } from '../i18n/LanguagePicker';

const noSubscription = () => () => {};
const permitted = () => true;

/** Home is the retained native root: audio, deep links and startup run exactly once. */
export function ApplicationServices() {
  const active = useScreenActive();
  const appeared = useScreenAppeared();
  const identityLoaded = useStore(onlineStore, s => s.loaded);
  const invitationKey = useStore(onlineStore, s => s.identity?.profile ? s.identity.key : undefined);
  const languageSelected = useStore(languageStore, s => s.selected);
  const [pendingInvite, setPendingInvite] = useState<ReturnType<typeof parseInvite>>(null);
  const preferences = useStore(offlineStore, s => s.local.preferences);
  const route = useStore(navigationStore, s => s.name);
  const game = useStore(onlineStore, useShallow(s => ({ phase: s.snapshot?.phase, round: s.snapshot?.roundId,
    call: s.snapshot?.calls.at(-1), count: s.snapshot?.calls.length, at: s.snapshot?.lastCallAt,
    now: s.snapshot?.serverNow, connected: s.connected })));
  const updates = useAppUpdates();
  const allowed = useSyncExternalStore(updates?.subscribe ?? noSubscription, updates ? () => updates.state.permitted && !updates.state.details && !updates.state.success : permitted);
  useEffect(() => { if (allowed && invitationKey) return startInvitations(invitationKey); }, [allowed, invitationKey]);
  useEffect(() => { if (allowed) return startTableVoice(); }, [allowed]);
  const playing = allowed && (route === 'Caller' || !!game.phase && ['live', 'claim'].includes(game.phase));
  const voice = useVoice(preferences.sound, preferences.voice, preferences.callPause, playing);
  const announced = useRef('');
  useEffect(() => { audioStore.setState(voice); }, [voice.speak, voice.stop, voice.isSpeaking, voice.preparing, voice.error]);
  useEffect(() => {
    void initializeLanguage(); initializeOffline(); initializeOnline(); void warmGameArtwork();
    if (__DEV__ && API_URL === 'http://127.0.0.1:8791') DevSettings.addMenuItem('Preview registration', () => pushScreen('Registration'));
    return Platform.OS === 'ios' ? startDeviceRecording() : undefined;
  }, []);
  useEffect(() => {
    if (!allowed || game.phase !== 'live' || !game.connected || route === 'Voices') { if (route !== 'Caller' && route !== 'Voices') voice.stop(); return; }
    const key = `${game.round}:${game.count}`;
    if (game.call && announced.current !== key) {
      announced.current = key;
      if (game.at && (game.now ?? 0) - game.at < 2800) voice.speak(game.call);
    }
  }, [game, allowed, route, voice.speak, voice.stop]);
  useEffect(() => {
    const immersive = ['Table', 'Numbers', 'Players'].includes(route) && !!game.phase && game.phase !== 'lobby';
    void setGameUi(immersive, playing).catch(() => {});
  }, [route, game.phase, playing]);
  useEffect(() => { if (!allowed) voice.stop(); }, [allowed, voice.stop]);
  useEffect(() => {
    const receive = (url: string) => {
      const invite = parseInvite(url); if (!invite) return;
      void savedInvite.set(url);
      setPendingInvite(invite);
    };
    void Linking.getInitialURL().then(url => { if (url) receive(url); });
    const listener = Linking.addEventListener('url', event => receive(event.url));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    // Cold links must wait for saved sign-in, the native root, and the update gate.
    if (!pendingInvite || !identityLoaded || !languageSelected || !allowed || !appeared) return;
    pushScreen(onlineStore.getState().identity?.profile ? 'JoinTable' : 'Registration', { invite: pendingInvite });
    setPendingInvite(null);
  }, [pendingInvite, identityLoaded, languageSelected, allowed, appeared]);
  return <FirstLanguagePicker allowed={allowed && !!active} />;
}
