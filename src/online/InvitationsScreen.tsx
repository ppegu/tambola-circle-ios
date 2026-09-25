import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useStore } from 'zustand';
import { t as tr, useLanguage } from '../i18n';
import { useScreenActive, useScreenNavigation } from '../navigation/ScreenContext';
import { GameButton, GameCard } from '../components/GameArtwork';
import { TableAvatar } from '../components/TableAvatar';
import { Avatar, Icon, Notice, PageHeader, Text, View, ui } from './components';
import { invitationResource, refreshInvitations } from './invitationStore';
import type { OnlineModel } from './onlineStore';
import { InvitationSkeleton } from '../navigation/skeletons';

export function InvitationsScreen({ model }: { model: OnlineModel }) {
  useLanguage();
  const navigation = useScreenNavigation()!, active = useScreenActive(), state = useStore(invitationResource.store);
  useEffect(() => { if (active) void refreshInvitations(); }, [active]);
  const [refreshing, setRefreshing] = useState(false), [reply, setReply] = useState('');
  async function respond(id: string, response: 'accept' | 'decline') {
    setReply(id + ':' + response);
    try { const ok = await model.respondToInvite(id, response); if (ok && response === 'accept' && navigation.active) navigation.push('Table'); }
    finally { setReply(''); }
  }
  const busy = Object.keys(model.pending).some(key => key.startsWith('table:'));
  return <View style={ui.page}><PageHeader title={tr('Invitations')} onBack={navigation.back} /><FlatList data={state.data} keyExtractor={invite => invite.id} initialNumToRender={5} maxToRenderPerBatch={4} windowSize={5} contentContainerStyle={ui.body}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void refreshInvitations(true).finally(() => setRefreshing(false)); }} tintColor="#ffde78" />}
    ListHeaderComponent={state.error ? <Notice tone="red">{tr('Could not load invitations. Pull down to retry.')}</Notice> : null}
    ListEmptyComponent={!state.loaded && !state.error ? <InvitationSkeleton /> : state.loaded ? <GameCard><Icon name="bell" size={38} color="#7e38af" /><Text style={ui.heading}>{tr('No invitations yet')}</Text></GameCard> : null}
    renderItem={({ item: invite }) => {
      const pending = invite.status === 'accepting' || invite.status === 'pending';
      return <GameCard key={invite.id} style={{ gap: 10 }}><View style={ui.row}><TableAvatar id={invite.tableAvatarId} photo={invite.tableAvatarPhoto} size={54} /><Text style={[ui.heading, { flex: 1 }]}>{invite.tableName}</Text></View>
        <View style={ui.row}><Avatar name={invite.sender.name} avatarId={invite.sender.avatarId} photo={invite.sender.avatarPhoto} size={32} /><Text style={[ui.text, { flex: 1 }]}>{tr('{name} invited you to play', { name: invite.sender.name })}</Text></View>
        {pending ? <View style={ui.row}><View style={{ flex: 1 }}><GameButton small tone="purple" busy={reply === invite.id + ':decline'} disabled={busy || invite.status === 'accepting'} onPress={() => { void respond(invite.id, 'decline'); }}>{tr('Decline')}</GameButton></View><View style={{ flex: 1.3 }}><GameButton small glyph="check" busy={reply === invite.id + ':accept'} disabled={busy} onPress={() => { void respond(invite.id, 'accept'); }}>{tr('Accept & join')}</GameButton></View></View>
          : <Text style={ui.text}>{invite.status === 'accepted' ? tr('Accepted') : invite.status === 'declined' ? tr('Declined') : tr('Expired')}</Text>}
      </GameCard>;
    }} /></View>;
}
