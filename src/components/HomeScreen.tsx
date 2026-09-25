import { InvitationBell } from '../online/InvitationBell';
import { t as tr, useLanguage } from '../i18n';
import { Text } from '../i18n/Text';
import React, { useState } from 'react';
import { View } from 'react-native';
import { GameAvatar, GameBackground, GameHero, GameIcon, CoinChip } from './GameArtwork';
import { HomeActionButton } from './HomeActionButton';
import { gameFont } from '../gameTypography';
import { UpdateBanner } from '../updates/UpdateRoot';
import { Pressable } from './Pressable';
import { Notice, ScrollView, Sheet } from '../online/components';
export function HomeScreen({ width, height, username, avatarId, avatarPhoto, balance, onInvitations, onStart, onOnline, onSettings, onAccount, onCoins }: { width: number; height: number; username?: string | null; avatarId?: number; avatarPhoto?: string; balance?: number; onInvitations?: () => void; onStart: () => void; onOnline: () => void; onSettings: () => void; onAccount: () => void; onCoins: () => void; onShare: () => void }) {
  useLanguage();
  const [help, setHelp] = useState(false);
  const compact = height < 680;
  const buttonHeight = Math.max(76, Math.min(108, height * .128));
  return <GameBackground style={{ width, flex: 1, minHeight: 0, paddingHorizontal: 14, paddingTop: compact ? 8 : 12, paddingBottom: compact ? 8 : 15, gap: compact ? 6 : 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Pressable onPress={onAccount} accessibilityRole="button" accessibilityLabel={tr("Your profile")} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 }}><GameAvatar size={48} index={avatarId} photo={avatarPhoto} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} maxFontSizeMultiplier={1.2} style={{ flex: 1, color: '#fff7f2', fontFamily: gameFont.medium, fontSize: 19, includeFontPadding: false, textShadowColor: '#1d062e', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>{tr("Hi, {name}!", { name: username?.split(' ')[0] ?? tr("friend") })}</Text></Pressable><CoinChip compact={width < 380} balance={balance} onPress={onCoins} /></View>
    <UpdateBanner />
    <View style={{ flex: 1, minHeight: 0 }}><GameHero height="100%" />{onInvitations && <View style={{ position: 'absolute', right: 0, top: 0 }}><InvitationBell onPress={onInvitations} /></View>}</View>
    <View style={{ gap: compact ? 9 : 11 }}><HomeActionButton icon={0} height={buttonHeight} label={tr("Play online")} onPress={onOnline} /><HomeActionButton icon={2} height={buttonHeight} tone="paper" label={tr("Offline caller")} onPress={onStart} /></View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: compact ? 4 : 8 }}>{[{ name: tr("Wallet"), icon: 3, action: onCoins }, { name: tr("How to play"), icon: 4, action: () => setHelp(true) }, { name: tr("Settings"), icon: 5, action: onSettings }].map(item => <Pressable key={item.name} onPress={item.action} accessibilityRole="button" style={{ alignItems: 'center', gap: 3 }}><GameIcon index={item.icon} size={compact ? 47 : 57} /><Text maxFontSizeMultiplier={1.15} style={{ color: '#fff4dd', fontSize: 14, fontFamily: gameFont.medium, includeFontPadding: false, textShadowColor: '#190425', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>{item.name}</Text></Pressable>)}</View>
    {help && <Sheet title={tr("How to play")} onClose={() => setHelp(false)}><ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 15 }}><Notice>{tr("Invite your friends to a private table. Half has 3 tickets; Full has 6.")}</Notice><Notice tone="gold">{tr("Choose your tickets and tap Ready to reserve the entry coins. The captain starts, or sets a countdown.")}</Notice><Notice>{tr("Listen to each number and tap it on your tickets. Complete one 15-number ticket and tap Full house!")}</Notice><Notice tone="green">{tr("Your full house is checked against the called numbers. Coins are for fun; test packs are free.")}</Notice></ScrollView></Sheet>}
  </GameBackground>;
}
