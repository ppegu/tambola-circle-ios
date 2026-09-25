import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { LinearGradient as BackgroundGradient } from '../components/LinearGradient';
export function UpdateBackground({ children, style, gold = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gold?: boolean }) {
  return <BackgroundGradient colors={['#26033f', '#36055c', '#280442']} style={[{ flex: 1 }, style]}>
    <View pointerEvents="none" accessible={false} style={{ position: 'absolute', inset: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 390 820" preserveAspectRatio="none">
        <Path d="M37 126L42 139L56 140L45 149L48 163L37 155L25 163L28 149L17 140L31 139Z M345 250L350 261L362 263L353 271L355 283L345 277L334 283L337 271L327 263L340 261Z M44 652L48 662L59 664L51 671L53 682L44 677L34 682L36 671L28 664L39 662Z" fill="#ffda59" opacity={.9} />
        <Path d="M330 135L335 148L349 150L339 159L341 173L330 166L318 173L321 159L310 150L324 148Z M47 440L53 453L65 455L54 464L56 478L45 470L33 477L36 462L26 453L41 451Z" fill="#a557b9" opacity={.28} />
        <Path d="M0 755Q56 727 124 761T256 761T390 746V820H0Z" fill="#530c82" />
        <Path d="M0 770Q100 758 185 779T390 768V820H0Z" fill="#3d086a" />
        {gold && <><Path d="M0 758Q60 781 127 764T264 774T390 758" fill="none" stroke="#f5c134" strokeWidth={7} /><Path d="M0 754Q60 777 127 760T264 770T390 754" fill="none" stroke="#ffed86" strokeWidth={2} /></>}
      </Svg>
    </View>
    {children}
  </BackgroundGradient>;
}
export function UpdateArtwork({ kind, size = 116, progress }: { kind: 'download' | 'lock' | 'success' | 'wifi' | 'tools' | 'install'; size?: number; progress?: number }) {
  const id = React.useId().replace(/:/g, '');
  const green = kind === 'success', gold = kind === 'download';
  return <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}>
    <Defs><LinearGradient id={id} x1="10%" y1="0%" x2="85%" y2="100%"><Stop offset="0" stopColor={green ? '#b5f966' : gold ? '#fff28a' : '#b351f4'} /><Stop offset="0.5" stopColor={green ? '#70ce20' : gold ? '#ffbf1d' : '#7620c4'} /><Stop offset="1" stopColor={green ? '#32920c' : gold ? '#ed8a00' : '#38016e'} /></LinearGradient></Defs>
    {kind === 'lock' || (gold && progress === undefined) ? <><Path d="M60 10Q78 23 103 27V61Q100 91 60 111Q20 91 17 61V27Q42 23 60 10Z" fill="#250541" opacity={.6} transform="translate(0 4)" /><Path d="M60 7Q78 20 103 24V58Q100 88 60 108Q20 88 17 58V24Q42 20 60 7Z" fill={'url(#' + id + ')'} stroke={gold ? '#fff380' : '#d788ff'} strokeWidth={3} /><Path d="M60 17Q79 30 94 32V58Q90 83 60 97Q30 82 26 58V32Q41 30 60 17Z" fill="none" stroke={gold ? '#ca7406' : '#4c0475'} strokeWidth={3} /></> : <><Circle cx={60} cy={64} r={48} fill="#160427" opacity={.45} /><Circle cx={60} cy={59} r={48} fill={'url(#' + id + ')'} stroke={green ? '#dbff81' : '#ca78fc'} strokeWidth={2.5} /></>}
    {progress !== undefined && <Circle cx={60} cy={59} r={49} fill="none" stroke="#ffe257" strokeWidth={7} strokeDasharray={String(Math.max(0, Math.min(1, progress)) * 308) + ' 308'} strokeLinecap="round" transform="rotate(-90 60 59)" />}
    {kind === 'download' && <Path d="M60 34V78M43 63L60 81L77 63" fill="none" stroke="#fff7cf" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />}
    {kind === 'success' && <Path d="M36 58L53 75L85 42" fill="none" stroke="#f7ffe5" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />}
    {kind === 'lock' && <><Path d="M45 55V44A15 15 0 0 1 75 44V55" fill="none" stroke="#fff08d" strokeWidth={7} /><Path d="M38 53H82V81Q82 87 76 87H44Q38 87 38 81Z" fill="#ffd432" stroke="#a8650b" strokeWidth={2} /><Path d="M60 65V75" stroke="#63236f" strokeWidth={5} strokeLinecap="round" /></>}
    {kind === 'wifi' && <><Path d="M29 45Q60 18 91 45M40 59Q60 40 80 59M51 73Q60 64 69 73" fill="none" stroke="#fff1fc" strokeWidth={8} strokeLinecap="round" /><Circle cx={60} cy={87} r={5} fill="#fff1fc" /></>}
    {kind === 'tools' && <><Path d="M34 33L84 84M83 33L34 85" stroke="#ffc931" strokeWidth={12} strokeLinecap="round" /><Path d="M28 26L41 39M77 38L90 25" stroke="#eecbff" strokeWidth={15} strokeLinecap="round" /></>}
    {kind === 'install' && <><Path d="M52 27H68L71 39L83 37L92 51L82 59L91 70L82 83L69 79L66 92H51L48 80L35 83L27 69L38 59L28 48L38 36L49 40Z" fill="#ffdf3c" stroke="#eea41c" strokeWidth={2} /><Circle cx={60} cy={59} r={14} fill="#6d16a5" /></>}
  </Svg>;
}
