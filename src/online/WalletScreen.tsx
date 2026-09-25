import { t as tr, useLanguage } from '../i18n';
import { useScreenNavigation } from '../navigation/ScreenContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, RefreshControl, StyleSheet } from 'react-native';
import type { CoinTransaction, CoinTransactionFilter, CoinTransactionPage } from '../../shared/online';
import { request } from '../api';
import { CoinPile, GameButton, GameCard, GameLogo } from '../components/GameArtwork';
import { LinearGradient } from '../components/LinearGradient';
import { gameFont } from '../gameTypography';
import { Action, GameIcon, Icon, Notice, PageHeader, Pressable, ScrollView, Sheet, Text, View, ui } from './components';
import { CoinsContent, CoinShopBalance } from './CoinShop';
import type { OnlineModel } from './useOnline';
import { TransactionRowsSkeleton, WalletBalanceSkeleton } from '../navigation/skeletons';

const count = (n?: number) => Number.isFinite(n) && n! > 0 ? Math.floor(n!).toLocaleString() : '0';
const transactionTitle = (t: CoinTransaction) => t.kind === 'reserve' ? t.status === 'reserved' ? tr("Ticket reservation") : tr("Round entry") : ({ refunded: tr("Round refund"), released: tr("Reservation returned"), test_purchase: tr("Test top-up"), welcome: tr("Welcome coins") }[t.kind] ?? tr("Coin activity"));
const transactionStatus = (t: CoinTransaction) => ({ reserved: tr("Reserved"), consumed: tr("Played"), released: tr("Returned"), refunded: tr("Returned"), added: tr("Added") }[t.status]);
const context = (t: CoinTransaction) => t.tableName ? `${t.tableName}${t.round ? ` · Round ${t.round}` : ''}` : new Date(t.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function WalletSheet({ model, onClose }: { model: OnlineModel; onClose: () => void }) {
  useLanguage();
  const backAction = useRef(onClose);
  return <Sheet full hideHeader title={tr("Wallet")} onClose={() => backAction.current()}><WalletScreen model={model} onBack={onClose} backAction={backAction} /></Sheet>;
}
export function WalletScreen({ model, onBack, backAction }: { model: OnlineModel; onBack: () => void; backAction?: React.MutableRefObject<() => void> }) {
  useLanguage();
  const navigation = useScreenNavigation();
  const [page, setLocalPage] = useState<'wallet' | 'history' | 'shop'>(navigation?.name === 'Transactions' ? 'history' : navigation?.name === 'TopUp' ? 'shop' : 'wallet');
  const setPage = (next: 'wallet' | 'history' | 'shop') => navigation ? navigation.push(next === 'shop' ? 'TopUp' : next === 'history' ? 'Transactions' : 'Wallet') : setLocalPage(next);
  const [filter, setFilter] = useState<CoinTransactionFilter>('all'), [detail, setDetail] = useState<CoinTransaction | null>(null);
  const [data, setData] = useState<CoinTransactionPage>({ transactions: [], nextCursor: null });
  const [loading, setLoading] = useState(false), [loaded, setLoaded] = useState(false), [error, setError] = useState('');
  const sequence = useRef(0), active = useRef(true), pending = useRef(false), previousPage = useRef(page);
  const token = model.identity?.key;
  const load = useCallback(async (cursor?: string) => {
    if (!token) return;
    const seq = ++sequence.current;
    pending.current = true; setLoading(true); setError('');
    try {
      const result = await request<CoinTransactionPage>(`/v2/wallet/transactions?kind=${filter}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`, { token });
      if (!active.current || seq !== sequence.current) return;
      setData(old => cursor ? { ...result, transactions: [...old.transactions, ...result.transactions.filter(t => !old.transactions.some(p => p.id === t.id))] } : result);
      setLoaded(true);
    } catch { if (active.current && seq === sequence.current) setError(tr("Couldn’t load transactions. Please try again.")); }
    finally { if (active.current && seq === sequence.current) { pending.current = false; setLoading(false); } }
  }, [filter, token]);
  useEffect(() => { active.current = true; return () => { active.current = false; sequence.current++; }; }, []);
  useEffect(() => { setData({ transactions: [], nextCursor: null }); setLoaded(false); if (page !== 'shop') void load(); }, [load]);
  useEffect(() => { if (page === 'wallet') { void model.refreshWallet(); if (previousPage.current === 'shop') void load(); } previousPage.current = page; }, [page, model.refreshWallet, load]);
  const back = () => { if (detail) setDetail(null); else if (navigation) onBack(); else if (page !== 'wallet') { setPage('wallet'); setFilter('all'); } else onBack(); };
  if (backAction) backAction.current = back;
  useEffect(() => { if (navigation) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => sub.remove(); }, [page, detail, onBack]);
  const refresh = () => { if (!pending.current) { void model.refreshWallet(); void load(); } };
  const groups = data.transactions.reduce<Record<string, CoinTransaction[]>>((all, t) => { const day = new Date(t.at).toLocaleDateString(); (all[day] ??= []).push(t); return all; }, {});
  function openHistory() { setFilter('all'); setPage('history'); }
  function chooseFilter(next: CoinTransactionFilter) {
    if (next === filter) return;
    sequence.current++;
    setData({ transactions: [], nextCursor: null });
    setLoaded(false);
    setError('');
    setFilter(next);
  }
  return <View style={ui.page}><PageHeader title={page === 'wallet' ? tr("Wallet") : page === 'shop' ? tr("Top up") : tr("Back")} onBack={back} right={page === 'wallet' ? <GameLogo width={106} /> : <CoinShopBalance balance={model.wallet?.balance} />} />
    {page === 'shop' ? <View style={{ flex: 1, paddingHorizontal: 12 }}><CoinsContent model={model} /></View> : <ScrollView refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={refresh} colors={['#8d3dd1']} tintColor="#ffe875" />} contentContainerStyle={styles.body}>
      {page === 'wallet' ? <>
        {!model.wallet && !model.walletError ? <WalletBalanceSkeleton /> : <LinearGradient colors={['#7f28b5', '#451073', '#2d0d57']} style={styles.balanceCard}><View style={styles.balanceRow}><CoinPile index={2} size={119} /><View style={{ flex: 1 }}><Text style={styles.available}>{tr("Available coins")}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.balance}>{count(model.wallet?.balance)}</Text></View></View><GameCard style={styles.reserved}><GameIcon index={6} size={34} /><Text style={styles.reservedText}>{tr("Reserved for tickets")}</Text><Text style={styles.reservedAmount}>{count(model.wallet?.held)}</Text></GameCard></LinearGradient>}
        {!!model.walletError && <Notice tone="red"><Text>{tr("Couldn’t load your latest balance.")}</Text><Action small onPress={() => { void model.refreshWallet(); }}>{tr("Try again")}</Action></Notice>}
        <GameButton icon={3} onPress={() => setPage('shop')} style={styles.primary}>{tr("+ Top up coins")}</GameButton>
        <GameCard style={styles.transactions}><View style={styles.headingRow}><Text style={styles.sectionTitle}>{tr("Recent transactions")}</Text><Pressable accessibilityRole="button" onPress={openHistory} style={styles.link}><Text style={styles.linkText}>{tr("See all ›")}</Text></Pressable></View>{!loaded && !error ? <TransactionRowsSkeleton embedded /> : data.transactions.slice(0, 4).map(t => <TransactionRow key={t.id} transaction={t} onPress={() => setDetail(t)} />)}{loaded && !data.transactions.length && <Text style={styles.empty}>{tr("Your coin activity will appear here.")}</Text>}</GameCard>
        <Text style={styles.footnote}>{tr("Play coins · No cash value")}</Text>
      </> : <>
        <View style={styles.hero}><GameLogo width={177} /><Text style={styles.title}>{tr("Transactions")}</Text><Text style={styles.subtitle}>{tr("Your coin activity in one place")}</Text></View>
        <View style={styles.filters}>{(['all', 'topups', 'entries', 'refunds'] as const).map(f => <Pressable key={f} accessibilityRole="tab" accessibilityState={{ selected: filter === f }} onPress={() => chooseFilter(f)} style={{ flex: 1 }}><LinearGradient colors={f === filter ? ['#fff986', '#ffcd31'] : ['#795099', '#573274']} style={[styles.filter, f === filter && styles.selected]}><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.filterText, f === filter && { color: '#492600' }]}>{({ all: tr("All"), topups: tr("Top-ups"), entries: tr("Entries"), refunds: tr("Refunds") })[f]}</Text></LinearGradient></Pressable>)}</View>
        {!loaded && !error && <TransactionRowsSkeleton full />}
        {Object.entries(groups).map(([day, rows]) => <GameCard key={day} style={styles.transactions}><View style={styles.headingRow}><Text style={styles.sectionTitle}>{day === new Date().toLocaleDateString() ? tr("Today") : day === new Date(Date.now() - 86400000).toLocaleDateString() ? tr("Yesterday") : new Date(rows[0]!.at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text><Text style={styles.date}>{day}</Text></View>{rows.map(t => <TransactionRow key={t.id} transaction={t} onPress={() => setDetail(t)} showStatus />)}</GameCard>)}
        {loaded && !data.transactions.length && !error && <GameCard><Text style={styles.empty}>{tr("No")}{' '}{filter === 'all' ? tr("transactions") : filter === 'topups' ? tr("top-ups") : filter} {' '}{tr("yet.")}</Text></GameCard>}
        {data.nextCursor && <Action small disabled={loading} onPress={() => { if (!pending.current) void load(data.nextCursor!); }}>{tr("Load more transactions")}</Action>}
      </>}
      {!!error && <Notice tone="red"><Text>{error}</Text><Action small onPress={() => { void load(); }}>{tr("Retry")}</Action></Notice>}
    </ScrollView>}
    {detail && <Sheet title={tr("Transaction")} onClose={() => setDetail(null)}><GameCard><Text style={styles.sectionTitle}>{transactionTitle(detail)}</Text><Text style={[styles.detailAmount, { color: detail.amount < 0 ? '#d91d49' : '#04844c' }]}>{detail.amount > 0 ? '+' : ''}{detail.amount.toLocaleString()} {' '}{tr("coins")}</Text><Text style={styles.rowTitle}>{transactionStatus(detail)}</Text><Text style={styles.rowContext}>{context(detail)}</Text><Text style={styles.rowContext}>{new Date(detail.at).toLocaleString()}</Text><Text selectable style={styles.reference}>{tr("Reference:")}{' '}{detail.id}</Text></GameCard></Sheet>}
  </View>;
}
function TransactionRow({ transaction: t, onPress, showStatus }: { transaction: CoinTransaction; onPress: () => void; showStatus?: boolean }) {
  useLanguage();
  const refund = ['released', 'refunded'].includes(t.kind), debit = t.amount < 0;
  return <Pressable accessibilityRole="button" accessibilityLabel={tr("{v0}, {v1}{v2} coins, {v3}", { v0: transactionTitle(t), v1: t.amount > 0 ? '+' : '', v2: t.amount, v3: transactionStatus(t) })} onPress={onPress} style={styles.row}><LinearGradient colors={refund ? ['#25d083', '#008052'] : debit ? ['#b55dfa', '#6713ba'] : ['#ffe954', '#ed9910']} style={styles.coinIcon}><Icon name={refund ? 'refresh' : debit ? 'ticket' : 'coins'} color={refund || debit ? '#fffce3' : '#8b4600'} size={24} /></LinearGradient><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.rowTitle}>{transactionTitle(t)}</Text><Text style={styles.rowContext}>{context(t)}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={[styles.amount, { color: debit ? '#e62945' : '#00894f' }]}>{t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}</Text>{showStatus && <Text style={styles.rowContext}>{transactionStatus(t)}</Text>}</View>{showStatus && <Icon name="chevron" color="#695c64" size={15} />}</Pressable>;
}
const styles = StyleSheet.create({
  body: { padding: 12, paddingBottom: 24, gap: 14 }, balanceCard: { padding: 12, borderRadius: 29, borderWidth: 3, borderBottomWidth: 5, borderColor: '#ffdc53', borderBottomColor: '#e59c18' }, balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9 }, available: { color: '#fff9e7', fontFamily: gameFont.medium, fontSize: 19 }, balance: { color: '#ffe55b', fontFamily: gameFont.bold, fontSize: 51, textShadowColor: '#9b4d06', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 }, reserved: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 18 }, reservedText: { flex: 1, color: '#30113f', fontFamily: gameFont.medium, fontSize: 14 }, reservedAmount: { color: '#30113f', fontFamily: gameFont.bold, fontSize: 25 }, primary: { borderRadius: 29, minHeight: 58 }, transactions: { padding: 12, borderRadius: 24, gap: 0 }, headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionTitle: { color: '#2e123f', fontFamily: gameFont.bold, fontSize: 20, flexShrink: 1 }, link: { minHeight: 40, justifyContent: 'center' }, linkText: { color: '#087a9b', fontFamily: gameFont.medium, fontSize: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: .6, borderColor: '#dac4a9' }, coinIcon: { width: 39, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderBottomWidth: 2, borderColor: '#fff4b2' }, rowTitle: { fontFamily: gameFont.medium, color: '#2a103d', fontSize: 15 }, rowContext: { color: '#81737c', fontFamily: gameFont.medium, fontSize: 11, marginTop: 2 }, amount: { fontSize: 20, fontFamily: gameFont.medium }, footnote: { color: '#d3b6e7', textAlign: 'center', fontFamily: gameFont.medium, fontSize: 12, paddingTop: 5 }, hero: { alignItems: 'center', gap: 5 }, title: { fontFamily: gameFont.bold, color: '#fff4d8', fontSize: 36, textShadowColor: '#1e052d', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 }, subtitle: { color: '#e9c7ff', fontFamily: gameFont.medium, fontSize: 16 }, filters: { flexDirection: 'row', gap: 6 }, filter: { minHeight: 38, borderRadius: 24, borderWidth: 1, borderColor: '#bc8bdb', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, selected: { borderColor: '#ffe87b', borderBottomWidth: 3 }, filterText: { color: '#fff4ec', fontFamily: gameFont.medium, fontSize: 14 }, date: { color: '#827783', fontSize: 11, fontFamily: gameFont.medium }, empty: { color: '#796281', padding: 12, textAlign: 'center', fontFamily: gameFont.medium, fontSize: 14 }, detailAmount: { fontFamily: gameFont.bold, fontSize: 35 }, reference: { fontSize: 10, color: '#827087' },
});
