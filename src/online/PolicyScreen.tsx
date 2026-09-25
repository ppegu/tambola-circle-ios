import { t as tr, useLanguage } from '../i18n';
import React, { useState } from 'react';
import { GameCard } from '../components/GameArtwork';
import { Action, PageHeader, ScrollView, Segments, Text, View, ui } from './components';

export const POLICY_VERSION = '2026-09-25';
export function PolicyScreen({ onClose, initialTab = 'terms' }: { onClose: () => void; initialTab?: 'terms' | 'privacy' }) {
  useLanguage();
  const [tab, setTab] = useState<string>(initialTab);
  const sections = tab === 'terms' ? [
    [tr("Play for fun"), tr("Tambola Circle is for private games with friends and family. Coins are virtual game credits and have no cash value. Test coin packs are free; payments and advertising are not enabled.")],
    [tr("Playing together"), tr("Choose your tickets and mark numbers yourself. The captain starts or schedules a round and can end it, manage players, or transfer captaincy. Full-house claims are checked against the server’s called numbers.")],
    [tr("Your profile"), tr("Use a name and mobile number you are entitled to use. Mobile ownership is currently unverified. Keep table codes and invite links within your intended circle.")],
    [tr("Fair play"), tr("Respect the other players. Do not impersonate people, harass players, or try to manipulate tickets, calls, or coin balances.")],
  ] : [
    [tr("Information saved"), tr("We save your player name, chosen avatar, mobile number, device UUID and device information, including platform and app version. Device information is recorded when the app opens and links your profile to the installation.")],
    [tr("Your table"), tr("People at your table can see your name and mobile number, selected ready tickets, and live markings. Table codes and invite links allow others to join that table.")],
    [tr("Photos & invitations"), tr("We upload only the photo you select for your profile or table, resized without location metadata. Shared photos are visible to people who can view your profile or table. Captains can find your profile using your complete 10-digit mobile number and send an in-app invitation. You can accept or decline. We save invitation status; we do not read your contacts or the rest of your photo library.")],
    [tr("Voice chat"), tr("Voice chat uses your microphone only after you unmute. Cloudflare relays live audio to other people at your table. We do not record or save voice chat. Muting the speaker silences table voices and number calls on this phone. Voice stops when you leave or background the app.")],
    [tr("Game records"), tr("The server saves table membership, tickets, marks, called numbers, round results, game events, and coin activity so you can return to an ongoing game.")],
    [tr("On this device"), tr("The app keeps preferences, offline game progress, and account credentials on your device. SIM selection uses Android’s number picker; iPhone currently uses a number you enter. Selecting a number does not verify ownership.")],
  ];
  return <View style={ui.page}><PageHeader title={tr("Terms & privacy")} onBack={onClose} /><ScrollView contentContainerStyle={ui.body}><Segments value={tab} onChange={setTab} options={[{ value: 'terms', get label() { return tr("Terms"); } }, { value: 'privacy', get label() { return tr("Privacy policy"); } }]} />{sections.map(([title, body]) => <GameCard key={title}><Text style={ui.heading}>{title}</Text><Text style={ui.text}>{body}</Text></GameCard>)}<Text style={{ color: '#ecd8f9', fontSize: 11, textAlign: 'center' }}>{tr("Updated 25 September 2026")}</Text><Action onPress={onClose}>{tr("Done")}</Action></ScrollView></View>;
}
