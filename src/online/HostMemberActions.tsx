import { t as tr, useLanguage } from '../i18n';
import React from 'react';
import { Alert } from 'react-native';
import type { Member, RoomSnapshot } from '../../shared/online';
import type { OnlineModel } from './useOnline';
import { Action, Notice, View } from './components';

export function HostMemberActions({ model, snapshot: s, member }: { model: OnlineModel; snapshot: RoomSnapshot; member: Member }) {
  useLanguage();
  const owner = s.ownerId === s.viewerId, host = s.hostId === s.viewerId;
  if ((!owner && !host) || member.id === s.viewerId || member.removed || member.left) return null;
  const connected = member.onlineUntil > s.serverNow, disabled = model.busy || !model.connected;
  function confirm(type: 'TRANSFER' | 'COHOST' | 'KICK') {
    const title = type === 'TRANSFER' ? tr('Make {name} the captain?', { name: member.name }) : type === 'COHOST' ? tr('Choose {name} as co-captain?', { name: member.name }) : tr('Remove {name}?', { name: member.name });
    const message = type === 'TRANSFER' ? tr("Table ownership and captain controls will move to this player.") : type === 'COHOST' ? tr("They will take over captain controls if you disconnect.") : tr("This player will no longer be able to join this table.");
    Alert.alert(title, message, [{ text: tr("Cancel"), style: 'cancel' }, { text: type === 'KICK' ? tr("Remove") : tr("Confirm"), style: type === 'KICK' ? 'destructive' : 'default', onPress: () => { void model.command(type, { memberId: member.id }); } }]);
  }
  return <View style={{ gap: 7, paddingVertical: 7 }}>
    {owner && <><Action small secondary icon="crown" disabled={disabled || !connected || s.coHostId === member.id} busy={!!model.pending['table:COHOST']} onPress={() => confirm('COHOST')}>{s.coHostId === member.id ? tr("Co-captain") : tr("Make co-captain")}</Action>
      <Action small purple icon="refresh" disabled={disabled || !connected} busy={!!model.pending['table:TRANSFER']} onPress={() => confirm('TRANSFER')}>{tr("Transfer captain")}</Action>
      {!connected && <Notice>{tr("This player must reconnect to receive captain controls.")}</Notice>}</>}
    {host && member.id !== s.ownerId && <Action small danger icon="close" disabled={disabled} busy={!!model.pending['table:KICK']} onPress={() => confirm('KICK')}>{tr("Remove player")}</Action>}
  </View>;
}
