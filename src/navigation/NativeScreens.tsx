import { t as tr, useLanguage } from '../i18n';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Dimensions, Platform, Share, View, useWindowDimensions } from 'react-native';
import { Navigation } from 'react-native-navigation';
import { SafeAreaProvider, useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { shallow } from 'zustand/shallow';
import { useShallow } from 'zustand/react/shallow';
import { onlineStore, type OnlineModel } from '../online/onlineStore';
import { offlineStore } from '../state/offlineStore';
import { audioStore } from '../state/audioStore';
import { AndroidUpdateRoot } from '../updates/UpdateRoot';
import { GameBackground, GameCard } from '../components/GameArtwork';
import { HomeScreen } from '../components/HomeScreen';
import { Action, Avatar, Notice, PageHeader, Pressable, ScrollView, Sheet, Text, TicketPanel, ui } from '../online/components';
import { savedInvite } from '../online/storage';
import { API_URL } from '../api';
import { SHARE_URL } from '../config';
import type { PastGame } from '../../shared/online';
import type { ControlPage } from '../online/TableManagement';
import { ScreenAppearanceContext, ScreenContext, ScreenVisibilityContext, useScreenActive, useScreenAppeared, useScreenNavigation, type Route, type RouteParams } from './ScreenContext';
import { backScreen, homeScreen, navigationStore, presentGameScreen, pushScreen, returnToOnline, trackScreen } from './router';
import { ApplicationServices } from './ApplicationServices';
import { ScreenSkeleton } from './skeletons';
import { HostMemberActions } from '../online/HostMemberActions';
import { initialScreenMetrics, rememberScreenMetrics } from './screenMetrics';

type Props = RouteParams & { componentId: string };
const noop = () => {};
const roomRoutes: Route[] = ['InvitePlayers', 'Table', 'Tickets', 'TableSettings', 'MemberTickets', 'Numbers', 'Players'];

// A native stack retains hidden screens. Freeze their subscriptions until they reappear.
// Select only this route's data, so socket marks cannot redraw Home, Wallet or forms.
function useRouteModel(name: Route) {
  const active = useScreenActive();
  const selected = useRef<Partial<OnlineModel> | null>(null);
  const selector = useCallback((state: OnlineModel) => {
    if (!active && selected.current) return selected.current;
    const keys: (keyof OnlineModel)[] = ['loaded', 'identity'];
    if (name !== 'Policy' && name !== 'Preferences') keys.push('wallet', 'walletLoading', 'walletError');
    if (name === 'Online') keys.push('tableList');
    if (name === 'PastGames') keys.push('historyList');
    if (roomRoutes.includes(name)) keys.push('snapshot', 'connected', 'pending', 'busy');
    if (['Invitations', 'CreateTable', 'JoinTable', 'Registration', 'Profile'].includes(name)) keys.push('pending');
    if (['Wallet', 'TopUp', 'Transactions'].includes(name)) keys.push('catalog', 'catalogLoading', 'catalogError', 'pending');
    const value = Object.fromEntries(keys.map(key => [key, state[key]])) as Partial<OnlineModel>;
    if (!selected.current || !shallow(selected.current, value)) selected.current = value;
    return selected.current;
  }, [name, active]);
  const data = useStore(onlineStore, selector);
  return useMemo(() => {
    const model = { ...onlineStore.getState(), ...data };
    // Unrelated purchases or avatar changes never disable table interactions.
    model.busy = roomRoutes.includes(name) ? Object.keys(model.pending).some(key => key.startsWith('table:'))
      : name === 'Registration' ? !!model.pending.register : name === 'Profile' ? !!model.pending.avatar
      : name === 'CreateTable' ? !!model.pending['table:CREATE'] : name === 'JoinTable' ? !!model.pending['table:JOIN']
      : name === 'TopUp' ? !!model.pending.purchase : false;
    return model;
  }, [name, data]);
}

function Loading({ kind, error, retry, back }: { kind?: Route; error?: string; retry?: () => void; back?: () => void }) {
  useLanguage();
  const title = kind === 'Table' ? tr("Your table") : kind === 'PastGames' ? tr("Past games") : kind === 'Transactions' ? tr("Transactions") : kind === 'Wallet' ? tr("Wallet") : kind === 'JoinTable' ? tr("Join a table") : 'Tambola Circle';
  return <View style={{ flex: 1 }}><PageHeader title={title} onBack={back ?? backScreen} /><View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 14 }}>
    {error ? <GameCard><Text accessibilityLiveRegion="polite" style={ui.text}>{error}</Text>{retry && <Action onPress={retry}>{tr("Try again")}</Action>}</GameCard> : <ScreenSkeleton kind={kind} />}
  </View></View>;
}
function HomeRoute({ model }: { model: OnlineModel }) {
  useLanguage();
  const navigation = useScreenNavigation()!;
  const ready = useStore(offlineStore, state => state.ready);
  const { width: w, height: h } = useWindowDimensions(), insets = useSafeAreaInsets();
  const width = Math.min(w, 576), height = h - insets.top - insets.bottom;
  const open = (destination: Route) => navigation.push(model.identity?.profile ? destination : 'Registration', { destination });
  const share = () => { const url = SHARE_URL.trim() || (API_URL ? API_URL + '/download/android' : ''); void Share.share({ title: 'Tambola Circle', message: `Let’s play Tambola Circle! Your people. Your game. ${url}` }).catch(noop); };
  return <><ApplicationServices />{ready ? <HomeScreen width={width} height={height} username={model.identity?.profile?.name} avatarId={model.identity?.profile?.avatarId} avatarPhoto={model.identity?.profile?.avatarPhoto} balance={model.wallet?.balance}
    onInvitations={() => open('Invitations')} onStart={() => navigation.push('Caller')} onOnline={() => open('Online')} onCoins={() => open('Wallet')} onAccount={() => open('Profile')} onSettings={() => navigation.push('Preferences')} onShare={share} /> : <Loading />}</>;
}
function ProfileRoute({ model }: { model: OnlineModel }) {
  useLanguage();
  const navigation = useScreenNavigation()!, [avatars, setAvatars] = useState(false), person = model.identity!.profile!;
  const { AvatarPicker } = require('../online/AvatarPicker') as typeof import('../online/AvatarPicker');
  return <><PageHeader title={tr("Your profile")} onBack={navigation.back} /><ScrollView contentContainerStyle={ui.body}><GameCard><View style={{ alignItems: 'center', gap: 12 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={tr("Choose your avatar")} disabled={model.busy} onPress={() => setAvatars(true)}><Avatar name={person.name} avatarId={person.avatarId} photo={person.avatarPhoto} size={100} /><Text style={ui.text}>{model.busy ? tr("Saving avatar…") : tr("Change avatar")}</Text></Pressable>
    <Text style={ui.heading}>{person.name}</Text><Text selectable style={ui.text}>{person.mobile}</Text></View>
    <Action secondary onPress={() => navigation.push('Policy')}>{tr("Terms & Privacy Policy")}</Action><Action onPress={returnToOnline}>{tr("Back to the fun")}</Action></GameCard></ScrollView>
    {avatars && <AvatarPicker selected={person.avatarId ?? 0} selectedPhoto={person.avatarPhoto} onClose={() => setAvatars(false)} busy={model.busy} onSelect={async (id, photo) => { if (await model.setAvatar(id, photo)) setAvatars(false); }} />}</>;
}
function TicketRouteGuard({ phase }: { phase: string }) {
  const navigation = useScreenNavigation()!, appeared = useScreenAppeared(), active = useScreenActive();
  useEffect(() => { if (active && appeared && phase !== 'lobby') navigation.back(); }, [active, appeared, phase, navigation.back]);
  return null;
}
function RoomBackHandler() {
  const active = useScreenActive();
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { returnToOnline(); return true; });
    return () => sub.remove();
  }, [active]);
  return null;
}
function RoomRoute({ name, params, model }: { name: Route; params: Props; model: OnlineModel }) {
  useLanguage();
  const navigation = useScreenNavigation()!, [attempt, setAttempt] = useState(0), [enterError, setEnterError] = useState('');
  const tableId = typeof params.tableId === 'string' ? params.tableId : undefined;
  const didEnter = useRef(false), active = useRef(true);
  useEffect(() => {
    if (name !== 'Table') return;
    active.current = true;
    return () => { active.current = false; onlineStore.getState().exitTableView(); };
  }, [name]);
  useEffect(() => {
    if (name !== 'Table' || !tableId || onlineStore.getState().snapshot?.id === tableId) return;
    setEnterError('');
    void model.rejoin(tableId).then(ok => {
      if (!active.current) { onlineStore.getState().exitTableView(); return; }
      if (!ok) setEnterError(onlineStore.getState().error || tr("Couldn’t open this table. Please try again."));
    });
  }, [name, tableId, attempt, model.rejoin]);
  const s = model.snapshot;
  useEffect(() => {
    if (name !== 'Table') return;
    if (s && (!tableId || s.id === tableId)) didEnter.current = true;
    else if (didEnter.current) returnToOnline();
  }, [name, s?.id, tableId]);
  if (!s || !s.members[s.viewerId] || tableId && s.id !== tableId) return <Loading kind="Table" error={enterError} retry={() => setAttempt(n => n + 1)} back={returnToOnline} />;
  const tableModel: OnlineModel = { ...model, exitTableView: returnToOnline,
    command: async (type, payload) => { const ok = await model.command(type, payload); if (ok && type === 'LEAVE') returnToOnline(); return ok; } };
  if (name === 'Table') {
    const { TableScreen } = require('../online/TableScreen') as typeof import('../online/TableScreen');
    return <><RoomBackHandler /><TableScreen model={tableModel} sound={offlineStore.getState().local.preferences.sound} onSound={sound => offlineStore.getState().updatePreferences({ sound })} onCall={n => audioStore.getState().speak(n, true)} onStop={noop} onGameplay={noop} /></>;
  }
  if (name === 'InvitePlayers') { const { InvitePlayersScreen } = require('../online/InvitePlayersScreen') as typeof import('../online/InvitePlayersScreen'); return <InvitePlayersScreen model={tableModel} />; }
  if (name === 'Tickets') {
    const { TicketChooser } = require('../online/TicketChooser') as typeof import('../online/TicketChooser');
    return <><TicketRouteGuard phase={s.phase} /><TicketChooser model={tableModel} onClose={navigation.back} onCoins={() => navigation.push('Wallet')} /></>;
  }
  if (name === 'Numbers') {
    const { NumbersDrawer } = require('../online/NumbersDrawer') as typeof import('../online/NumbersDrawer');
    return <NumbersDrawer native calls={s.calls} onReplay={n => audioStore.getState().speak(n, true)} onClose={navigation.back} />;
  }
  if (name === 'Players') {
    const { PlayersDrawer } = require('../online/PlayersDrawer') as typeof import('../online/PlayersDrawer');
    return <PlayersDrawer native snapshot={s} onClose={navigation.back} onMember={memberId => navigation.push('MemberTickets', { memberId })} />;
  }
  if (name === 'TableSettings') {
    const { TableManagement } = require('../online/TableManagement') as typeof import('../online/TableManagement');
    return <TableManagement model={tableModel} snapshot={s} initialPage={(params.page as ControlPage) ?? 'menu'} onClose={navigation.back} onPlay={() => navigation.push('Tickets')} onPreferences={() => navigation.push('Preferences')} />;
  }
  const member = s.members[String(params.memberId)];
  if (!member) return <Loading error={tr('This player is no longer at the table.')} back={navigation.back} />;
  return <Sheet full title={member.name} onClose={navigation.back}><GameCard><View style={ui.row}><Avatar name={member.name} avatarId={member.avatarId} photo={member.avatarPhoto} /><View style={{ flex: 1 }}><Text style={ui.heading}>{member.name}</Text><Text selectable style={ui.text}>{member.mobile}</Text></View></View></GameCard><ScrollView contentContainerStyle={{ paddingVertical: 5 }}>
    <HostMemberActions model={tableModel} snapshot={s} member={member} />
    {member.panels.length && (s.phase !== 'lobby' || member.ready || member.id === s.viewerId) ? member.panels.map((panel, index) => <TicketPanel compact key={`${s.roundId}:${index}`} panel={panel} index={index} count={member.panels.length} marks={member.marks} />) : <Notice>{tr("Tickets appear when ready.")}</Notice>}
  </ScrollView></Sheet>;
}
const ScreenView = React.memo(function ScreenView({ name, params }: { name: Route; params: Props }) {
  const model = useRouteModel(name);
  const preferences = useStore(offlineStore, state => state.local.preferences);
  return <ScreenContent name={name} params={params} model={model} preferences={preferences} />;
});
const ScreenContent = React.memo(function ScreenContent({ name, params, model, preferences }: {
  name: Route; params: Props; model: OnlineModel; preferences: ReturnType<typeof offlineStore.getState>['local']['preferences'];
}) {
  useLanguage();
  const navigation = useScreenNavigation()!;
  const source = useRef(navigation); source.current = navigation;
  const onCoins = () => navigation.push('Wallet');
  // API completion must not pull a user back after they have already left a form.
  const adapted = useMemo<OnlineModel>(() => ({ ...model,
    create: async (...args) => { const ok = await model.create(...args); if (ok && source.current.active) navigation.push('Table'); return ok; },
    join: async (...args) => { const ok = await model.join(...args); if (ok && source.current.active) navigation.push('Table'); return ok; },
  }), [model, navigation]);
  if (name === 'Home') return <HomeRoute model={model} />;
  if (name === 'Caller') { const { CallerRoute } = require('./CallerRoute') as typeof import('./CallerRoute'); return <CallerRoute />; }
  if (name === 'Preferences') {
    const { GamePreferencesSheet } = require('../online/GamePreferencesScreen') as typeof import('../online/GamePreferencesScreen');
    const last = onlineStore.getState().snapshot?.calls.at(-1) ?? offlineStore.getState().local.history.at(-1);
    return <GamePreferencesSheet sound={preferences.sound} onSound={sound => offlineStore.getState().updatePreferences({ sound })} onClose={navigation.back} onPreview={() => audioStore.getState().speak(23, true)} onReplay={last ? () => audioStore.getState().speak(last, true) : undefined} />;
  }
  if (name === 'Voices') { const { CallerVoicePicker } = require('../online/CallerVoicePicker') as typeof import('../online/CallerVoicePicker'); return <CallerVoicePicker onClose={navigation.back} />; }
  if (name === 'Policy') { const { PolicyScreen } = require('../online/PolicyScreen') as typeof import('../online/PolicyScreen'); return <PolicyScreen initialTab={params.tab === 'privacy' ? 'privacy' : 'terms'} onClose={navigation.back} />; }
  if (!model.loaded) return <Loading kind={name} back={navigation.back} />;
  if (!model.identity?.profile || name === 'Registration') {
    const { RegistrationScreen } = require('../online/RegistrationScreen') as typeof import('../online/RegistrationScreen');
    return <RegistrationScreen busy={!!model.pending.register} phoneEntryMode={Platform.OS === 'ios' ? 'manual' : 'device'} onBack={navigation.back} onGuest={() => navigation.push('Caller')}
      onRegister={(player, mobile, avatar, photo) => { void model.register(player, mobile, avatar, photo).then(ok => { if (ok && source.current.active) navigation.push(params.invite ? 'JoinTable' : (params.destination as Route) ?? 'Online', params.invite ? { invite: params.invite } : undefined); }); }} />;
  }
  if (roomRoutes.includes(name)) return <RoomRoute name={name} params={params} model={model} />;
  if (name === 'Invitations') { const { InvitationsScreen } = require('../online/InvitationsScreen') as typeof import('../online/InvitationsScreen'); return <InvitationsScreen model={model} />; }
  if (name === 'Profile') return <ProfileRoute model={model} />;
  if (name === 'CreateTable') { const { CreateTableScreen } = require('../online/CreateTableScreen') as typeof import('../online/CreateTableScreen'); return <CreateTableScreen model={adapted} onBack={navigation.back} onCoins={onCoins} />; }
  if (name === 'JoinTable') { const { JoinTableScreen } = require('../online/JoinTableScreen') as typeof import('../online/JoinTableScreen'); return <JoinTableScreen model={adapted} invite={params.invite as { tableId: string; invite: string } | undefined} onInviteUsed={() => { void savedInvite.set(null); }} onBack={navigation.back} onCoins={onCoins} />; }
  if (name === 'Online' || name === 'PastGames') {
    const { OnlineHub } = require('../online/OnlineHub') as typeof import('../online/OnlineHub');
    return <OnlineHub model={model} onBack={navigation.back} onCreate={() => navigation.push('CreateTable')} onJoin={() => navigation.push('JoinTable')} onCoins={onCoins} />;
  }
  if (name === 'PastGame') { const { PastGameView } = require('../online/OnlineHub') as typeof import('../online/OnlineHub'); return <PastGameView game={params.game as PastGame} model={model} onClose={navigation.back} />; }
  const { WalletScreen } = require('../online/WalletScreen') as typeof import('../online/WalletScreen');
  return <WalletScreen model={model} onBack={navigation.back} />;
});
function NativeRoot({ name, params }: { name: Route; params: Props }) {
  useLanguage();
  const [active, setActive] = useState(true), [appeared, setAppeared] = useState(false);
  const activeRef = useRef(true);
  const id = params.componentId;
  const [initialMetrics] = useState(() => initialScreenMetrics(
    ['Table', 'Numbers', 'Players'].includes(name) && !!onlineStore.getState().snapshot && onlineStore.getState().snapshot!.phase !== 'lobby',
    Dimensions.get('window').width,
  ));
  useEffect(() => {
    const untrack = trackScreen(id, name);
    const listener = Navigation.events().registerComponentListener({
      componentDidAppear: () => { activeRef.current = true; navigationStore.setState({ id, name }); setActive(true); setAppeared(true); },
      componentDidDisappear: () => { activeRef.current = false; setActive(false); },
    }, id);
    return () => { activeRef.current = false; listener.remove(); untrack(); };
  }, [id, name]);
  // Appearance listeners should not invalidate every consumer of navigation.
  const navigation = useMemo(() => ({ id, name, get active() { return activeRef.current; }, push: (route: Route, value?: RouteParams) => pushScreen(route, value, id), present: presentGameScreen, back: () => backScreen(id), home: homeScreen }), [id, name]);
  return <ScreenContext.Provider value={navigation}>
    <ScreenVisibilityContext.Provider value={active}><ScreenAppearanceContext.Provider value={appeared}>
      <SafeAreaProvider initialMetrics={initialMetrics}><AndroidUpdateRoot>
        <ScreenFrame name={name}><ScreenView name={name} params={params} /></ScreenFrame>
      </AndroidUpdateRoot></SafeAreaProvider>
    </ScreenAppearanceContext.Provider></ScreenVisibilityContext.Provider>
  </ScreenContext.Provider>;
}
function ScreenFrame({ name, children }: { name: Route; children: React.ReactNode }) {
  useLanguage();
  const insets = useSafeAreaInsets(), frame = useSafeAreaFrame(), navigation = useScreenNavigation()!;
  const active = useScreenActive();
  const immersive = useStore(onlineStore, s => ['Table', 'Numbers', 'Players'].includes(name) && !!s.snapshot && s.snapshot.phase !== 'lobby');
  useLayoutEffect(() => {
    if (active) rememberScreenMetrics(immersive, { insets, frame });
  }, [active, immersive, insets, frame]);
  useEffect(() => {
    if (!active) return;
    // Let the native stack own system-bar layout as well as visibility. Hiding
    // only React Native's StatusBar leaves a blank inset in an RNN controller.
    Navigation.mergeOptions(navigation.id, {
      statusBar: { visible: !immersive, drawBehind: true, backgroundColor: '#290435', style: 'light' },
      navigationBar: { visible: !immersive, backgroundColor: '#290435' },
    });
  }, [navigation.id, active, immersive]);
  const ownInsets = ['Tickets', 'TableSettings', 'MemberTickets', 'Preferences', 'Voices', 'PastGame'].includes(name);
  if (name === 'Numbers' || name === 'Players') return <View style={{ flex: 1, backgroundColor: 'transparent' }}>{children}</View>;
  // These full-screen surfaces already paint their own background and insets.
  // A second image, gradient and star layer adds work with no visible benefit.
  if (ownInsets) return <View style={{ flex: 1 }}>{children}</View>;
  return <GameBackground calm={name !== 'Home'} velvet={name === 'Caller' || name === 'Table'} style={{ paddingTop: immersive ? 0 : insets.top, paddingBottom: immersive ? 0 : insets.bottom }}>
    <View style={{ flex: 1, width: '100%', maxWidth: 576, alignSelf: 'center' }}>{children}</View>
  </GameBackground>;
}
export function registerScreens() {
  const routes: Route[] = ['Invitations', 'InvitePlayers', 'Home', 'Caller', 'Online', 'Registration', 'Profile', 'CreateTable', 'JoinTable', 'Table', 'Tickets', 'TableSettings', 'MemberTickets', 'Numbers', 'Players', 'Wallet', 'Transactions', 'TopUp', 'PastGames', 'PastGame', 'Preferences', 'Voices', 'Policy'];
  routes.forEach(name => Navigation.registerComponent(`Circle.${name}`, () => (props: Props) => <NativeRoot name={name} params={props} />));
}
