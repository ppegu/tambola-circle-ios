import { t as tr, useLanguage } from '../i18n';
import { TextInput } from '../i18n/Text';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, G, Image as SvgImage, LinearGradient as SvgGradient, Mask, Rect, Stop } from 'react-native-svg';
import { ticketCost, type TablePreview } from '../../shared/online';
import { ApiError, request } from '../api';
import { TableAvatar } from '../components/TableAvatar';
import { CoinChip, GameButton } from '../components/GameArtwork';
import { LinearGradient } from '../components/LinearGradient';
import { gameFont } from '../gameTypography';
import { Avatar, Icon, PageHeader, Pressable, ScrollView, Text, View, ui } from './components';
import type { OnlineModel } from './useOnline';
import { JoinPreviewSkeleton } from '../navigation/skeletons';

type Invite = { tableId: string; invite: string };
type Target = Invite | { code: string };

function InvitationArtwork({ width, height }: { width: number; height: number }) {
  useLanguage();
  const id = React.useId().replace(/:/g, '');
  return <Svg accessible={false} pointerEvents="none" width={width} height={height} viewBox="0 128 841 365" preserveAspectRatio="xMidYMid meet">
    <Defs>
      <SvgGradient id={`${id}fade`} x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset={0} stopColor="#fff" stopOpacity={0} /><Stop offset={.06} stopColor="#fff" /><Stop offset={.93} stopColor="#fff" /><Stop offset={1} stopColor="#fff" stopOpacity={0} /></SvgGradient>
      <SvgGradient id={`${id}edges`} x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset={0} stopColor="#fff" stopOpacity={0} /><Stop offset={.045} stopColor="#fff" /><Stop offset={.955} stopColor="#fff" /><Stop offset={1} stopColor="#fff" stopOpacity={0} /></SvgGradient>
      <Mask id={id} x={0} y={128} width={841} height={365} maskUnits="userSpaceOnUse"><Rect x={0} y={128} width={841} height={365} fill={`url(#${id}fade)`} /></Mask>
      <Mask id={`${id}sideMask`} x={0} y={128} width={841} height={365} maskUnits="userSpaceOnUse"><Rect x={0} y={128} width={841} height={365} fill={`url(#${id}edges)`} /></Mask>
    </Defs>
    <G mask={`url(#${id})`}><SvgImage href={require('../../assets/game-v3/join-table-reference.png')} width={841} height={1870} mask={`url(#${id}sideMask)`} /></G>
  </Svg>;
}

function JoinAction({ label, icon, onPress, disabled, loading }: { label: string; icon: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  useLanguage();
  return <GameButton glyph={icon} busy={loading} disabled={disabled} label={label} onPress={onPress} style={{ minHeight: 56, borderRadius: 30 }}>{label}</GameButton>;
}

export function JoinTableScreen({ model, invite, onInviteUsed, onBack, onCoins }: { model: OnlineModel; invite?: Invite | null; onInviteUsed: () => void; onBack: () => void; onCoins: () => void }) {
  useLanguage();
  const [code, setCode] = useState(''), [focused, setFocused] = useState(false), [selection, setSelection] = useState(0);
  const [looking, setLooking] = useState(false), [error, setError] = useState('');
  const [found, setFound] = useState<{ preview: TablePreview; target: Target } | null>(null);
  const generation = useRef(0), active = useRef(true), input = useRef<TextInput>(null);
  const { width, height } = useWindowDimensions(), bodyWidth = Math.min(width - 24, 460);
  const key = model.identity?.key;
  useEffect(() => { active.current = true; return () => { active.current = false; generation.current++; }; }, []);
  function changeCode(value: string) {
    generation.current++; setCode(value.replace(/\D/g, '').slice(0, 6)); setFound(null); setError(''); setLooking(false);
  }
  async function find(target: Target) {
    if (!key) return;
    const current = ++generation.current;
    Keyboard.dismiss(); setLooking(true); setFound(null); setError('');
    try {
      const preview = await request<TablePreview>('/v2/preview', { method: 'POST', token: key, body: target });
      if (active.current && current === generation.current) { setCode(preview.code); setFound({ preview, target }); }
    } catch (e) {
      if (active.current && current === generation.current) setError(e instanceof ApiError && e.status === 404 ? tr("Table not found. Check the code and try again.") : e instanceof ApiError && e.status === 403 ? tr("This invite is no longer available. Ask your captain for a new one.") : tr("Could not find your table. Please try again."));
    } finally { if (active.current && current === generation.current) setLooking(false); }
  }
  useEffect(() => { if (invite) void find(invite); }, [invite?.tableId, invite?.invite, key]);
  const preview = found?.preview;
  return <KeyboardAvoidingView style={ui.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <PageHeader title={tr("Join a table")} onBack={onBack} right={<CoinChip compact balance={model.wallet?.balance} onPress={onCoins} />} />
    <ScrollView contentContainerStyle={styles.body} keyboardDismissMode="on-drag">
      <InvitationArtwork width={bodyWidth} height={Math.min(bodyWidth * .40, height * .18)} />
      <LinearGradient colors={['#fffcef', '#fff6e5', '#f6dfbe']} style={[styles.codeCard, { width: bodyWidth }]}>
        <View pointerEvents="none" style={styles.stitch} />
        <Text style={styles.codeTitle}>{tr("Table code")}</Text>
        <View style={styles.codeField}>
          <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.digits}>
            {Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.digitBox, focused && index === Math.min(5, selection) && styles.focusedDigit]}><Text maxFontSizeMultiplier={1.1} style={styles.digit}>{code[index] ?? ''}</Text></View>)}
          </View>
          <TextInput ref={input} accessibilityLabel={tr("Six digit table code")} value={code} onChangeText={changeCode} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSelectionChange={e => setSelection(e.nativeEvent.selection.start)} keyboardType="number-pad" autoComplete="off" autoCorrect={false} maxLength={6} editable={!model.busy} caretHidden selectionColor="transparent" style={styles.codeInput} />
        </View>
        <JoinAction label={looking ? tr("Finding table…") : tr("Find table")} icon="search" disabled={code.length !== 6 || looking || model.busy} loading={looking} onPress={() => { void find({ code }); }} />
        {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
      </LinearGradient>
      {looking && !preview && <View style={{ width: bodyWidth }}><JoinPreviewSkeleton /></View>}
      {preview && <View style={[styles.preview, { width: bodyWidth }]}>
        <LinearGradient colors={['#8544ca', '#4c187e', '#301153']} style={styles.previewHeader}>
          <TableAvatar id={preview.tableAvatarId} photo={preview.tableAvatarPhoto} size={42} /><Text accessibilityRole="header" numberOfLines={2} style={styles.tableName}>{preview.name}</Text>
          <View style={styles.private}><Icon name="lock" size={15} color="#f9e6ff" /><Text style={styles.privateText}>{tr("Private")}</Text></View>
        </LinearGradient>
        <LinearGradient colors={['#fffdf4', '#f8ebd6', '#fff6e4']} style={styles.previewBody}>
          <View style={styles.hostRow}>
            <Avatar name={preview.host} avatarId={preview.hostAvatarId} photo={preview.hostAvatarPhoto} size={60} />
            <View style={styles.hostName}><Text style={styles.meta}>{tr("Captain")}</Text><Text numberOfLines={2} style={styles.host}>{preview.host}</Text></View>
            <View style={styles.people}>
              {!!preview.players.length && <View style={styles.faces}>{preview.players.map((player, index) => <Avatar key={index} name={player.name} avatarId={player.avatarId} photo={player.avatarPhoto} size={30} />)}</View>}
              <View style={styles.counts}><Icon name="groups" color="#64547c" size={16} /><Text style={styles.countText}>{preview.playerCount} {preview.playerCount === 1 ? tr("player") : tr("players")} · {preview.watchingCount} {' '}{tr("watching")}</Text></View>
            </View>
          </View>
          <View style={styles.divider} /><Text style={styles.feeTitle}>{tr("Entry per round")}</Text>
          <Text style={styles.feeCopy}>{tr("Half (3 tickets): {half} coins · Full (6 tickets): {full} coins per round", { half: ticketCost(preview.config, 'half'), full: ticketCost(preview.config, 'full') })}</Text>
          <JoinAction label={model.busy ? tr("Entering table…") : preview.phase === 'live' || preview.phase === 'claim' ? tr("Join game") : tr("Enter lobby")} icon="groups" disabled={model.busy} loading={model.busy} onPress={() => { void model.join(found!.target).then(ok => { if (ok && 'invite' in found!.target) onInviteUsed(); }); }} />
          <View style={styles.hint}><Icon name="info" color="#514068" size={15} /><Text style={styles.hintText}>{preview.phase === 'live' || preview.phase === 'claim' ? tr("Watch this round. Play in the next one.") : tr("Choose tickets in the lobby.")}</Text></View>
        </LinearGradient>
      </View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 20, gap: 10 },
  codeCard: { borderRadius: 27, borderWidth: 1.5, borderColor: '#fff6d6', padding: 15, gap: 9, elevation: 4 },
  stitch: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 4, borderRadius: 23, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d39869' },
  codeTitle: { color: '#290e45', fontFamily: gameFont.bold, fontSize: 26, textAlign: 'center', includeFontPadding: false },
  codeField: { height: 53 }, digits: { flexDirection: 'row', gap: 5, height: '100%' },
  digitBox: { flex: 1, backgroundColor: '#fff8ec', borderRadius: 10, borderWidth: 1.2, borderTopWidth: 1.8, borderColor: '#cfaa92', alignItems: 'center', justifyContent: 'center' },
  focusedDigit: { borderColor: '#9844d8', borderWidth: 2, backgroundColor: '#fffef5' },
  digit: { color: '#2d1048', fontFamily: gameFont.bold, fontSize: 31, includeFontPadding: false },
  codeInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'transparent', backgroundColor: 'transparent', opacity: .01, fontSize: 1, padding: 0 },
  action: { minHeight: 60, borderRadius: 32, backgroundColor: '#b2680a', borderWidth: 1.2, borderColor: '#e58a22', padding: 2, paddingBottom: 5, elevation: 3 },
  actionFace: { flex: 1, minHeight: 51, borderRadius: 29, borderWidth: 1.2, borderColor: '#fff6b1', flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  shine: { position: 'absolute', top: 6, left: 10, width: 23, height: 8, borderRadius: 9, backgroundColor: '#ffffffad', transform: [{ rotate: '-30deg' }] },
  actionLabel: { color: '#452000', fontFamily: gameFont.bold, fontSize: 25, includeFontPadding: false, flexShrink: 1 },
  error: { fontSize: 13, color: '#a61d3c', fontFamily: gameFont.medium, textAlign: 'center' },
  preview: { borderRadius: 28, borderWidth: 2, borderColor: '#b25bed', backgroundColor: '#3f1269', overflow: 'hidden', elevation: 4 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, paddingVertical: 13, borderTopWidth: 1.5, borderColor: '#dca4ff' },
  tableName: { flex: 1, color: '#fff8f1', fontFamily: gameFont.bold, fontSize: 24, lineHeight: 27, includeFontPadding: false },
  private: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: '#bf78f3', backgroundColor: '#381163' },
  privateText: { color: '#fff4ff', fontFamily: gameFont.medium, fontSize: 13 },
  previewBody: { borderRadius: 23, padding: 13, gap: 7 }, hostRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  hostName: { flex: 1, minWidth: 48 }, meta: { color: '#5e5275', fontFamily: gameFont.medium, fontSize: 11 },
  host: { color: '#32144d', fontFamily: gameFont.bold, fontSize: 18, lineHeight: 22 },
  people: { flex: 1.4, gap: 5, alignItems: 'flex-end' }, faces: { flexDirection: 'row', gap: 1 },
  counts: { flexDirection: 'row', gap: 3, alignItems: 'center' }, countText: { color: '#5e5275', fontFamily: gameFont.medium, fontSize: 10, flexShrink: 1 },
  divider: { height: 1, backgroundColor: '#cbb7b1' },
  feeTitle: { color: '#32144d', fontFamily: gameFont.bold, fontSize: 17, textAlign: 'center', includeFontPadding: false },
  feeCopy: { color: '#614571', fontFamily: gameFont.medium, fontSize: 14, lineHeight: 21, marginBottom: 7 },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, hintText: { color: '#5b4d73', fontFamily: gameFont.medium, fontSize: 12, flexShrink: 1 },
});
