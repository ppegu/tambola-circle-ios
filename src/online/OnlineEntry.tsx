import { t as tr, useLanguage } from '../i18n';
import React, { useEffect, useState } from 'react';
import { BackHandler, DevSettings, Platform } from 'react-native';
import { API_URL } from '../api';
import { Action, Avatar, GameIcon, Icon, Notice, PageHeader, Pill, Pressable, ScrollView, Text, View, ui } from './components';
import { CoinChip, GameCard } from '../components/GameArtwork';
import type { OnlineModel } from './useOnline';
import { WalletScreen } from './WalletScreen';
import { RegistrationScreen } from './RegistrationScreen';
import { PolicyScreen } from './PolicyScreen';
import { AvatarPicker } from './AvatarPicker';
import { JoinTableScreen } from './JoinTableScreen';
import { CreateTableScreen } from './CreateTableScreen';
import { OnlineHub } from './OnlineHub';
export const duration = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
export function OnlineEntry({ model, invite, onInviteUsed, onOffline, onHome, initialMode = 'home', phoneEntryMode = Platform.OS === 'ios' ? 'manual' : 'device' }: { model: OnlineModel; invite: { tableId: string; invite: string } | null; onInviteUsed: () => void; onOffline: () => void; onHome?: () => void; initialMode?: 'home' | 'profile' | 'coins'; phoneEntryMode?: 'manual' | 'device' }) {
  useLanguage();
  const [mode, setMode] = useState<'home' | 'profile' | 'coins' | 'create' | 'join'>(initialMode);
  const [previewRegistration, setPreviewRegistration] = useState(false), [policy, setPolicy] = useState(false);
  const [joinInvite, setJoinInvite] = useState<typeof invite>(null);
  const [avatarsOpen, setAvatarsOpen] = useState(false);
  const person = model.identity?.profile;
  useEffect(() => {
    if (__DEV__ && API_URL === 'http://127.0.0.1:8791') DevSettings.addMenuItem('Preview registration', () => setPreviewRegistration(true));
  }, []);
  useEffect(() => { if (person && invite) { setJoinInvite(invite); setMode('join'); } }, [person?.id, invite?.tableId, invite?.invite]);
  const title = !person ? tr("Registration") : ({ home: tr("Play online"), profile: tr("Your profile"), coins: tr("Coin shop"), create: tr("Create table"), join: tr("Join table") }[mode]);
  const back = () => { if (mode === initialMode || mode === 'home') onHome?.(); else setMode('home'); };
  useEffect(() => {
    if (person && !previewRegistration && !policy && (mode === 'home' || mode === 'coins')) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (policy) setPolicy(false); else if (previewRegistration) setPreviewRegistration(false); else back(); return true; });
    return () => sub.remove();
  }, [mode, policy, previewRegistration, person, onHome]);
  if (policy) return <PolicyScreen onClose={() => setPolicy(false)} />;
  if (!person || previewRegistration) return <RegistrationScreen busy={model.busy} phoneEntryMode={phoneEntryMode} onGuest={onOffline} onBack={() => { if (previewRegistration) setPreviewRegistration(false); else onHome?.(); }} onRegister={(name, mobile, avatarId, avatarPhoto) => { void model.register(name, mobile, avatarId, avatarPhoto).then(ok => { if (ok) setPreviewRegistration(false); }); }} />;
  if (mode === 'create') return <CreateTableScreen model={model} onBack={back} onCoins={() => setMode('coins')} />;
  if (mode === 'join') return <JoinTableScreen model={model} invite={joinInvite} onInviteUsed={onInviteUsed} onBack={back} onCoins={() => setMode('coins')} />;
  if (mode === 'home') return <OnlineHub model={model} onBack={back} onCreate={() => setMode('create')} onJoin={() => { setJoinInvite(null); setMode('join'); }} onCoins={() => setMode('coins')} invitation={invite ? <GameCard><Text style={ui.heading}>{tr("Your invitation is ready!")}</Text><Action disabled={model.busy} onPress={() => { setJoinInvite(invite); setMode('join'); }}>{tr("View invitation")}</Action></GameCard> : undefined} />;
  if (person && mode === 'coins') return <WalletScreen model={model} onBack={back} />;
  return <View style={ui.page}><PageHeader title={title} onBack={back} right={person ? <CoinChip compact balance={model.wallet?.balance} onPress={() => setMode('coins')} /> : undefined} /><ScrollView contentContainerStyle={ui.body}>
    <>
    {!!invite && <GameCard><Text style={ui.heading}>{tr("Your invitation is ready!")}</Text><Action disabled={model.busy} onPress={() => { setJoinInvite(invite); setMode('join'); }}>{tr("View invitation")}</Action></GameCard>}
    {mode === 'profile' && <GameCard><View style={{ alignItems: 'center', gap: 12 }}><Pressable accessibilityRole="button" accessibilityLabel={tr("Choose your avatar")} disabled={model.busy} onPress={() => setAvatarsOpen(true)}><Avatar name={person.name} avatarId={person.avatarId} photo={person.avatarPhoto} size={100} /><Text style={{ color: '#7421c6', textAlign: 'center', marginTop: 5 }}>{tr("Change avatar")}</Text></Pressable><Text style={ui.heading}>{person.name}</Text><Text selectable style={ui.text}>{person.mobile}</Text></View><Action small secondary onPress={() => setPolicy(true)}>{tr("Terms & Privacy Policy")}</Action><Action onPress={() => setMode('home')}>{tr("Back to the fun")}</Action></GameCard>}
    </>
  </ScrollView>{avatarsOpen && <AvatarPicker selected={person.avatarId ?? 0} selectedPhoto={person.avatarPhoto} onClose={() => setAvatarsOpen(false)} onSelect={async (id, photo) => { if (await model.setAvatar(id, photo)) setAvatarsOpen(false); }} />}</View>;
}
