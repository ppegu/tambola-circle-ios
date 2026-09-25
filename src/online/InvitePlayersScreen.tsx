import React, { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { TextInput } from '../i18n/Text';
import { t as tr, useLanguage, localizeKnownCopy } from '../i18n';
import { isInviteMobile, type InvitePerson } from '../../shared/invitations';
import { request } from '../api';
import { useScreenNavigation } from '../navigation/ScreenContext';
import { GameButton, GameCard } from '../components/GameArtwork';
import { Avatar, Icon, Notice, PageHeader, Pressable, ScrollView, Text, View, ui } from './components';
import { InvitationSkeleton } from '../navigation/skeletons';
import type { OnlineModel } from './onlineStore';

export function InvitePlayersScreen({ model }: { model: OnlineModel }) {
  useLanguage();
  const navigation = useScreenNavigation()!, table = model.snapshot!, captain = table.hostId === table.viewerId;
  const [mobile, setMobile] = useState(''), [players, setPlayers] = useState<InvitePerson[] | null>(null), [selected, setSelected] = useState<InvitePerson | null>(null);
  const [loading, setLoading] = useState(false), [sending, setSending] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), mounted = useRef(true), sendLock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  async function search() {
    if (!isInviteMobile(mobile) || !captain) return;
    const seq = ++generation.current; Keyboard.dismiss(); setLoading(true); setError(''); setSelected(null); setPlayers(null); setSent(false);
    try { const result = await request<{ players: InvitePerson[] }>(`/v2/tables/${table.id}/invite-search`, { method: 'POST', token: model.identity!.key, body: { mobile } }); if (mounted.current && seq === generation.current) setPlayers(result.players); }
    catch { if (mounted.current && seq === generation.current) setError(tr('Could not find this player. Please try again.')); }
    finally { if (mounted.current && seq === generation.current) setLoading(false); }
  }
  async function invite() {
    if (!selected || !captain || sendLock.current) return; sendLock.current = true; setSending(true); setError('');
    try { await request(`/v2/tables/${table.id}/invitations`, { method: 'POST', token: model.identity!.key, body: { playerId: selected.id } }); if (mounted.current) setSent(true); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? localizeKnownCopy(e.message) : tr('Could not send the invitation. Please try again.')); }
    finally { sendLock.current = false; if (mounted.current) setSending(false); }
  }
  return <View style={ui.page}><PageHeader title={tr('Invite a player')} onBack={navigation.back} /><ScrollView contentContainerStyle={ui.body} keyboardShouldPersistTaps="handled">
    {!captain ? <Notice>{tr('Only the captain can invite players.')}</Notice> : <><GameCard style={{ gap: 10 }}><Text style={ui.heading}>{table.name}</Text><Text style={ui.text}>{tr('Enter their 10-digit mobile number')}</Text><TextInput accessibilityLabel={tr('10-digit mobile number')} style={ui.input} keyboardType="number-pad" maxLength={10} value={mobile} editable={!sending} onChangeText={value => { generation.current++; setMobile(value.replace(/\D/g, '').slice(0, 10)); setPlayers(null); setSelected(null); setSent(false); setError(''); setLoading(false); }} />
      <GameButton small glyph="search" busy={loading} disabled={!isInviteMobile(mobile) || loading || sending} onPress={() => { void search(); }}>{tr('Find player')}</GameButton></GameCard>
      {loading && <InvitationSkeleton search />}{!!error && <Notice tone="red">{error}</Notice>}
      {players?.length === 0 && <Notice>{tr('No registered player matches this number.')}</Notice>}
      {players?.map(player => <Pressable key={player.id} accessibilityRole="radio" accessibilityState={{ checked: selected?.id === player.id, disabled: sending }} disabled={sending} onPress={() => { setSelected(player); setSent(false); }}><GameCard style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: selected?.id === player.id ? '#ffd75b' : undefined }}><Avatar name={player.name} avatarId={player.avatarId} photo={player.avatarPhoto} size={58} /><Text style={[ui.heading, { flex: 1 }]}>{player.name}</Text><Icon name={selected?.id === player.id ? 'check' : 'circle'} color="#8b3db6" /></GameCard></Pressable>)}
      {selected && <GameButton glyph={sent ? 'check' : 'bell'} disabled={sending || sent} busy={sending} onPress={() => { void invite(); }}>{sent ? tr('Invitation sent') : tr('Send invitation')}</GameButton>}
      {sent && <Notice tone="green">{tr('They can accept or decline in Invitations.')}</Notice>}
    </>}
  </ScrollView></View>;
}
