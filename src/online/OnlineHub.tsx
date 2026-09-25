import { InvitationBell } from './InvitationBell';
import { TableAvatar } from '../components/TableAvatar';
import { t as tr, useLanguage } from '../i18n';
import { Text } from '../i18n/Text';
import { useScreenNavigation } from '../navigation/ScreenContext';
import React, { useEffect, useId, useState } from 'react';
import { BackHandler, Image, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import type { PastGame, PastGameDetails, TableSummary } from '../../shared/online';
import { request } from '../api';
import { RoundArchive } from './RoundArchive';
import { CoinChip, GameButton, GameCard, GameIcon, GameLogo } from '../components/GameArtwork';
import { hubBannerImage } from '../components/gameAssets';
import { LinearGradient } from '../components/LinearGradient';
import { Pressable } from '../components/Pressable';
import { GameFinish } from '../components/GameFinish';
import { gameFont } from '../gameTypography';
import { Avatar, Icon, IconButton, PageHeader, Sheet } from './components';
import type { OnlineModel } from './useOnline';
import { RoundArchiveSkeleton, TableCardsSkeleton } from '../navigation/skeletons';

function isPastGame(table: TableSummary): table is PastGame { return 'endedAt' in table && 'completed' in table; }

const FamilyBanner = React.memo(function FamilyBanner() {
  useLanguage();
  const width = Math.min(useWindowDimensions().width, 520);
  return <View accessible={false} style={{ alignItems: 'center', marginHorizontal: -12 }}><Image source={hubBannerImage} fadeDuration={0} resizeMode="contain" style={{ width, height: width * 235 / 841 }} /></View>;
});

function InviteTicket({ size }: { size: number }) {
  useLanguage();
  const id = useId().replace(/:/g, '');
  return <Svg width={size} height={size} viewBox="0 0 140 120" pointerEvents="none">
    <Defs><SvgGradient id={id} x1="0%" y1="0%" x2="85%" y2="100%"><Stop offset="0" stopColor="#fffef3" /><Stop offset="1" stopColor="#ffdf9e" /></SvgGradient></Defs>
    <G rotation={-13} origin="70,60"><Path d="M17 30H126V41Q113 47 126 54V77Q113 83 126 89V100H17V89Q30 83 17 77V54Q30 47 17 41Z" fill="#07758a" opacity={.4} transform="translate(0 5)" /><Path d="M13 22H122V33Q109 39 122 46V69Q109 75 122 81V92H13V81Q26 75 13 69V46Q26 39 13 33Z" fill={`url(#${id})`} stroke="#c8965b" strokeWidth={2} /><Rect x={27} y={29} width={81} height={56} rx={2} fill="none" stroke="#ae5532" strokeWidth={1.5} strokeDasharray="4 2" /><G fill="#7924d4"><Circle cx={68} cy={46} r={10} /><Circle cx={44} cy={49} r={8} /><Circle cx={91} cy={49} r={8} /><Path d="M53 77V68Q53 57 68 57Q83 57 83 68V77Z M30 74V66Q30 56 44 58L50 61V74Z M86 74V61Q102 53 105 65V74Z" /></G></G>
    <Path d="M126 22L134 15M130 40L138 39" stroke="#ffef59" strokeWidth={6} strokeLinecap="round" />
  </Svg>;
}

function HubWidget({ join = false, onPress }: { join?: boolean; onPress: () => void }) {
  useLanguage();
  const size = Math.min((useWindowDimensions().width - 36) / 2, 244);
  return <Pressable accessibilityRole="button" accessibilityLabel={join ? tr("Join table") : tr("Create table")} accessibilityHint={join ? tr("Join with a code or invite link") : tr("Create a private table")} onPress={onPress}
    style={({ pressed }) => [styles.widget, { borderColor: join ? '#64f9ff' : '#fff181', borderBottomColor: join ? '#008594' : '#c47a04', transform: [{ translateY: pressed ? 2 : 0 }] }]}>
    <GameFinish tone={join ? 'cyan' : 'gold'} radius={27} />
    <View style={{ height: size * .61, alignItems: 'center', justifyContent: 'center' }}>
      {join ? <InviteTicket size={size * .78} /> : <><GameIcon index={1} size={size * .72} /><LinearGradient colors={['#67ff8c', '#00bc4e', '#008433']} style={styles.addBadge}><Icon name="plus" size={26} /></LinearGradient></>}
    </View>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75} maxFontSizeMultiplier={1.2} style={[styles.widgetTitle, { color: join ? '#fffdf2' : '#542104', textShadowColor: join ? '#007589' : '#fff0a4' }]}>{join ? tr("Join table") : tr("Create table")}</Text>
    <View style={styles.widgetCaption}><Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.caption, { color: join ? '#26116a' : '#542104' }]}>{join ? tr("Code or link") : tr("Private table")}</Text></View>
  </Pressable>;
}

function Status({ table }: { table: TableSummary | PastGame }) {
  useLanguage();
  const past = 'completed' in table;
  const completed = past && table.completed;
  const live = !past && table.phase !== 'lobby';
  const text = past ? (completed ? tr("Completed") : tr("Ended")) : live ? tr("Live") : tr("Lobby");
  return <LinearGradient colors={completed ? ['#d477ff', '#8104dd'] : live ? ['#35fb6f', '#00b34c'] : ['#ffef74', '#ffc529']} style={[styles.status, { borderColor: completed ? '#b65ef0' : live ? '#07c355' : '#eead24' }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Icon name={past ? completed ? 'check' : 'stop' : 'circle'} size={11} color={completed || live ? '#fff' : '#714208'} /><Text maxFontSizeMultiplier={1.15} style={[styles.statusText, { color: completed || live ? '#fff' : '#643301' }]}>{text}</Text></View>
  </LinearGradient>;
}

export function TableListCard({ table, busy, onPress }: { table: TableSummary | PastGame; busy?: boolean; onPress: () => void }) {
  useLanguage();
  const past = 'endedAt' in table;
  const players = table.players ?? [];
  const shown = players.slice(0, 3);
  const extra = Math.max(0, (table.playerCount ?? players.length) - shown.length);
  const label = past ? tr("View details") : table.phase === 'lobby' ? tr("Open table") : tr("Rejoin");
  return <LinearGradient colors={['#fff19b', '#ffd84b', '#f0aa24']} style={styles.cardFrame}>
    <LinearGradient colors={['#fffdf4', '#fff1d2', '#ffe3a0']} style={styles.card}>
      <View style={styles.cardTop}>
        <LinearGradient colors={['#c160ff', '#792bdd', '#501083']} style={styles.familyAvatar}><TableAvatar id={table.tableAvatarId} photo={table.tableAvatarPhoto} size={63} /></LinearGradient>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={styles.tableName}>{table.name}</Text><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}><Text style={[styles.meta, { flexShrink: 1 }]}>{tr("Round")}{' '}{table.round}{table.playerCount === undefined ? '' : ` · ${table.playerCount} ${!past && table.phase === 'lobby' ? tr("at table") : 'players'}`}</Text><Status table={table} /></View>{past && <Text style={styles.date}>{new Date(table.endedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>}</View>
      </View>
      <View style={styles.cardBottom}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>{shown.map(p => <Avatar key={p.id} name={p.name} avatarId={p.avatarId} photo={p.avatarPhoto} size={29} />)}{extra > 0 && <View style={styles.extra}><Text style={styles.extraText}>+{extra}</Text></View>}</View>
        <GameButton small tone="purple" label={tr("{v0}: {v1}, round {v2}", { v0: label, v1: table.name, v2: table.round })} disabled={busy} style={{ minWidth: 112, borderRadius: 18 }} onPress={onPress}>{label}</GameButton>
      </View>
    </LinearGradient>
  </LinearGradient>;
}

function ListFeedback({ loaded, loading, error, empty, history }: { loaded: boolean; loading: boolean; error: string; empty: boolean; history: boolean }) {
  useLanguage();
  if (!loaded && loading) return <TableCardsSkeleton history={history} />;
  if (error) return <GameCard><Text accessibilityLiveRegion="polite" style={styles.feedbackTitle}>{loaded ? tr("Couldn’t refresh") : (history ? tr('Couldn’t load history') : tr('Couldn’t load tables'))}</Text><Text style={styles.meta}>{loaded && !empty ? tr("Your last saved list is still here. ") : ''}{tr("Check your connection, then pull down to try again.")}</Text></GameCard>;
  if (loaded && empty) return <GameCard style={{ alignItems: 'center', paddingVertical: 22 }}><GameIcon index={history ? 4 : 1} size={52} /><Text style={styles.feedbackTitle}>{history ? tr("Your story starts here") : tr("Make room for fun")}</Text><Text style={[styles.meta, { textAlign: 'center' }]}>{history ? tr("Completed rounds will appear here.") : tr("Create a table or join your friends with a code.")}</Text></GameCard>;
  return null;
}

export function PastGameView({ game, model, onClose }: { game: PastGame; model: OnlineModel; onClose: () => void }) {
  useLanguage();
  const navigation = useScreenNavigation();
  const [data, setData] = useState<PastGameDetails | null>(null), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; setError(false);
    void request<PastGameDetails>(`/v2/table-history/${game.id}/${game.round}`, { token: model.identity?.key }).then(value => { if (active) setData(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [game.id, game.round, model.identity?.key, attempt]);
  return <Sheet full title={tr("Round {v0}", { v0: game.round })} onClose={onClose}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 18 }}>
    <Text style={styles.sectionTitle}>{game.name}</Text>
    {!data && !error && <RoundArchiveSkeleton />}
    {error && <GameCard><Text style={styles.meta}>{tr("Couldn’t load this game. Please try again.")}</Text><GameButton small onPress={() => setAttempt(n => n + 1)}>{tr("Try again")}</GameButton></GameCard>}
    {data && <><RoundArchive round={game.round} phase="finished" calls={data.calls} reason={data.reason} winner={data.game.winnerName} at={data.game.endedAt} tickets={data.tickets} /><GameButton small tone="purple" busy={model.busy} onPress={() => { if (navigation) navigation.push('Table', { tableId: game.id }); else void model.rejoin(game.id).then(ok => { if (ok) onClose(); }); }}>{tr("Open current table")}</GameButton></>}
  </ScrollView></Sheet>;
}

export function OnlineHub({ model, onBack, onCreate, onJoin, onCoins, invitation }: { model: OnlineModel; onBack: () => void; onCreate: () => void; onJoin: () => void; onCoins: () => void; invitation?: React.ReactNode }) {
  useLanguage();
  const navigation = useScreenNavigation();
  const [history, setHistory] = useState(navigation?.name === 'PastGames'), [detail, setDetail] = useState<PastGame | null>(null);
  const [pulling, setPulling] = useState({ tables: false, history: false });
  const ongoing = model.tableList.items.filter(t => t.phase !== 'finished');
  const back = () => { if (navigation) onBack(); else if (history) setHistory(false); else onBack(); };
  useEffect(() => { if (navigation) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => sub.remove(); }, [history, onBack]);
  useEffect(() => { if (history) void model.historyList.refresh(); else void model.tableList.refresh(); }, [history, model.historyList.refresh, model.tableList.refresh]);
  const list = (isHistory: boolean) => {
    const state = isHistory ? model.historyList : model.tableList;
    const items = isHistory ? model.historyList.items : ongoing;
    const key = isHistory ? 'history' : 'tables';
    const pull = () => {
      setPulling(old => ({ ...old, [key]: true }));
      void state.refresh().finally(() => setPulling(old => ({ ...old, [key]: false })));
    };
    return <ScrollView testID={isHistory ? 'history-list' : 'ongoing-tables-list'} style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} alwaysBounceVertical
      refreshControl={<RefreshControl refreshing={pulling[key] && state.loading} onRefresh={pull} tintColor="#ffdc65" colors={['#902ad9', '#e8aa17']} progressBackgroundColor="#fff2cc" />}>
      {isHistory ? <View style={{ alignItems: 'center', paddingVertical: 5 }}><GameLogo width={164} /></View> : <><FamilyBanner /><View style={styles.widgets}><HubWidget onPress={onCreate} /><HubWidget join onPress={onJoin} /></View></>}
      {!isHistory && invitation}
      <View style={styles.section}><Text accessibilityRole="header" style={[styles.sectionTitle, { flex: 1 }]}>{isHistory ? tr("Past games") : tr("Your tables")}</Text>{!isHistory && navigation && <InvitationBell onPress={() => navigation.push('Invitations')} />}{!isHistory && <IconButton light name="history" label={tr("View game history")} onPress={() => navigation ? navigation.push('PastGames') : setHistory(true)} />}</View>
      <ListFeedback loaded={state.loaded} loading={state.loading || (!state.loaded && !state.error)} error={state.error} empty={!items.length} history={isHistory} />
      {items.map(table => <TableListCard key={`${table.id}:${table.round}`} table={table} busy={!isHistory && model.busy} onPress={() => { if (navigation) navigation.push(isPastGame(table) ? 'PastGame' : 'Table', isPastGame(table) ? { game: table } : { tableId: table.id }); else if (isPastGame(table)) setDetail(table); else void model.rejoin(table.id); }} />)}
    </ScrollView>;
  };
  return <View style={{ flex: 1 }}><PageHeader title={history ? tr("History") : tr("Play online")} onBack={back} right={<CoinChip compact balance={model.wallet?.balance} onPress={onCoins} />} />
    {/* Keep both native lists mounted so Back preserves the previous scroll position. */}
    <View style={{ flex: 1, display: history ? 'none' : 'flex' }} importantForAccessibility={history ? 'no-hide-descendants' : 'auto'}>{(!navigation || !history) && list(false)}</View>
    <View style={{ flex: 1, display: history ? 'flex' : 'none' }} importantForAccessibility={history ? 'auto' : 'no-hide-descendants'}>{history && list(true)}</View>
    {detail && <PastGameView game={detail} model={model} onClose={() => setDetail(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 12, paddingBottom: 24, gap: 10, flexGrow: 1, width: '100%', maxWidth: 544, alignSelf: 'center' },
  widgets: { flexDirection: 'row', gap: 10, marginTop: -5, marginBottom: 5 },
  widget: { flex: 1, overflow: 'hidden', borderRadius: 29, borderWidth: 2, borderBottomWidth: 5, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 11, elevation: 5, backgroundColor: '#ffc423' },
  widgetRim: { position: 'absolute', top: 3, bottom: 3, left: 3, right: 3, borderWidth: 1.5, borderColor: '#ffffff9c', borderRadius: 23 },
  widgetShine: { position: 'absolute', width: 19, height: 8, borderRadius: 12, backgroundColor: '#ffffffaf', top: 12, left: 9, transform: [{ rotate: '-39deg' }] },
  addBadge: { position: 'absolute', bottom: 0, left: '50%', marginLeft: -18, width: 37, height: 39, borderWidth: 2, borderColor: '#ceffd2', borderBottomColor: '#00682e', borderBottomWidth: 3, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  widgetTitle: { fontFamily: gameFont.bold, fontSize: 24, lineHeight: 29, includeFontPadding: false, textAlign: 'center', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1, marginTop: 7 },
  widgetCaption: { paddingHorizontal: 6, paddingVertical: 5, backgroundColor: '#ffffffae', borderWidth: 1, borderColor: '#fffad1b3', borderRadius: 13, alignItems: 'center', marginHorizontal: 5, marginTop: 4 },
  caption: { fontFamily: gameFont.medium, color: '#40124f', fontSize: 14, includeFontPadding: false },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginVertical: 1 },
  sectionTitle: { fontFamily: gameFont.bold, fontSize: 27, color: '#fff7e9', includeFontPadding: false, textShadowColor: '#200338', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  cardFrame: { borderRadius: 26, borderWidth: 1.5, borderColor: '#fff5b3', borderBottomWidth: 4, borderBottomColor: '#d08a13', padding: 3, elevation: 3 },
  card: { borderRadius: 21, borderWidth: 1, borderColor: '#ffffff', padding: 9, gap: 9 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  familyAvatar: { width: 65, height: 65, borderRadius: 33, borderWidth: 1.5, borderColor: '#df93ff', alignItems: 'center', justifyContent: 'flex-end' },
  tableName: { fontFamily: gameFont.bold, color: '#28105e', fontSize: 19, lineHeight: 22, includeFontPadding: false },
  meta: { fontFamily: gameFont.medium, color: '#63524f', fontSize: 13, lineHeight: 17 },
  date: { fontFamily: gameFont.medium, color: '#70665c', fontSize: 11, lineHeight: 15 },
  status: { borderRadius: 13, borderWidth: 1, borderBottomWidth: 2, paddingHorizontal: 6, paddingVertical: 4 },
  statusText: { fontFamily: gameFont.medium, fontSize: 10, includeFontPadding: false },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  extra: { width: 29, height: 29, borderRadius: 16, backgroundColor: '#fff4e8', borderWidth: 1, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  extraText: { fontFamily: gameFont.medium, fontSize: 12, color: '#71476d' },
  feedbackTitle: { fontFamily: gameFont.bold, fontSize: 18, color: '#381059' },
  lightText: { color: '#fff1cc', fontSize: 15, fontFamily: gameFont.medium },
  number: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffdf90', alignItems: 'center', justifyContent: 'center' },
});
