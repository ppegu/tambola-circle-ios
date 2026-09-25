import React, { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Path, Pattern, Rect, Stop, Text as SvgText, TextPath } from 'react-native-svg';
import { LinearGradient } from './LinearGradient';
import { Text } from '../i18n/Text';
import { gameFont } from '../gameTypography';

export type GameTone = 'gold' | 'purple' | 'cyan' | 'red' | 'paper';
export const gamePalettes: Record<GameTone, string[]> = {
  gold: ['#fffab3', '#ffe653', '#ffd02a', '#f7b020'],
  purple: ['#db8cff', '#b447ff', '#8e12e7', '#6106af'],
  cyan: ['#99ffff', '#31eef6', '#08cadc', '#009bb9'],
  red: ['#ffa8ad', '#f66071', '#e33250', '#b41936'],
  paper: ['#fffef2', '#fff2d3', '#f6dfb2', '#e9c68a'],
};

/** Static native layers, shared by buttons of any size. No layout measurement or animation loop. */
export const GameFinish = memo(function GameFinish({ tone = 'gold', radius = 24 }: { tone?: GameTone; radius?: number }) {
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
    <LinearGradient colors={gamePalettes[tone]} style={StyleSheet.absoluteFill} />
    <View style={{ ...StyleSheet.absoluteFill, borderRadius: radius, borderWidth: 1.5, borderColor: '#ffffff7a', borderTopColor: '#fffde0', borderBottomColor: '#54221c44' }} />
    <View style={{ position: 'absolute', left: 3, right: 3, top: 3, bottom: 3, borderRadius: Math.max(4, radius - 3), borderWidth: 1, borderColor: '#ffffff45', borderTopWidth: 2, borderTopColor: '#ffffffa8' }} />
    <LinearGradient colors={['#ffffff35', '#ffffff00']} style={{ position: 'absolute', top: 5, left: 6, right: 6, height: '42%', borderRadius: radius }} />
    <View style={{ position: 'absolute', left: 7, top: 10, width: 4, height: 13, borderRadius: 4, backgroundColor: '#ffffffb0', transform: [{ rotate: '24deg' }] }} />
    <View style={{ position: 'absolute', right: 7, bottom: 9, width: 3, height: 10, borderRadius: 4, backgroundColor: '#ffffff55', transform: [{ rotate: '25deg' }] }} />
  </View>;
});

export const VelvetTexture = memo(function VelvetTexture() {
  const id = 'cloth' + useId().replace(/:/g, '');
  return <Svg pointerEvents="none" accessible={false} width="100%" height="100%" style={StyleSheet.absoluteFill}>
    <Defs><Pattern id={id} width={28} height={34} patternUnits="userSpaceOnUse"><Path d="M14 3Q8 10 14 17Q20 10 14 3ZM14 17Q2 14 3 24Q10 26 14 17ZM14 17Q26 14 25 24Q18 26 14 17Z" fill="none" stroke="#d789e8" strokeWidth={.7} opacity={.13} /></Pattern></Defs>
    <Rect width="100%" height="100%" fill={`url(#${id})`} />
  </Svg>;
});

/** Curved native vector lettering for Latin; native text preserves Indic shaping. */
export const CurvedGameTitle = memo(function CurvedGameTitle({ children, size = 37 }: { children: string; size?: number }) {
  const id = 'title' + useId().replace(/:/g, '');
  if (/[\u0900-\u09ff]/.test(children)) return <Text accessibilityRole="header" style={{ fontFamily: gameFont.bold, color: '#ffde64', fontSize: size - 4, textAlign: 'center', textShadowColor: '#7d3908', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 }}>{children}</Text>;
  return <View accessible accessibilityRole="header" accessibilityLabel={children} style={{ width: '100%', height: 72 }}>
    <Svg pointerEvents="none" accessible={false} width="100%" height="100%" viewBox="0 0 320 80">
      <Defs><Path id={id} d="M8 63Q160 23 312 63" /><SvgGradient id={id + 'gold'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#fff8b7" /><Stop offset=".6" stopColor="#ffe466" /><Stop offset="1" stopColor="#f8b832" /></SvgGradient></Defs>
      <G transform="translate(0 4)"><SvgText fill="#8a400c" stroke="#290337" strokeWidth={4} fontFamily={gameFont.bold} fontSize={size} textAnchor="middle"><TextPath href={'#' + id} startOffset="50%">{children}</TextPath></SvgText></G>
      <SvgText fill={`url(#${id}gold)`} stroke="#ffefaa" strokeWidth={.6} fontFamily={gameFont.bold} fontSize={size} textAnchor="middle"><TextPath href={'#' + id} startOffset="50%">{children}</TextPath></SvgText>
    </Svg>
  </View>;
});

export const MenuMedallion = memo(function MenuMedallion({ name, cyan = false }: { name: string; cyan?: boolean }) {
  const id = 'medal' + useId().replace(/:/g, '');
  const path = name === 'home' ? 'M13 31L32 15 51 31H46V49H36V37H28V49H18V31Z' : name === 'refresh' ? 'M20 25A17 17 0 1 1 16 39 M13 15V29H27' : 'M25 18L46 32 25 46Z';
  return <Svg width={46} height={46} viewBox="0 0 64 66"><Defs><SvgGradient id={id} x1="0" y1="0" x2={.8} y2="1"><Stop offset="0" stopColor={cyan ? '#0a98b9' : '#a643e4'} /><Stop offset="1" stopColor={cyan ? '#075878' : '#4b0b76'} /></SvgGradient></Defs><Circle cx={32} cy={35} r={29} fill={cyan ? '#084459' : '#33054e'} /><Circle cx={32} cy={31} r={29} fill={`url(#${id})`} stroke={cyan ? '#93f9ff' : '#e9adff'} strokeWidth={1.4} /><Path d="M11 22Q18 5 36 7" stroke="#ffffff9c" strokeWidth={2} fill="none" strokeLinecap="round" /><Path d={path} fill={name === 'refresh' ? 'none' : '#fff7dd'} stroke="#fff7dd" strokeWidth={name === 'refresh' ? 5 : 1.5} strokeLinejoin="round" strokeLinecap="round" /></Svg>;
});

export const TicketOrnament = memo(function TicketOrnament() {
  return <View pointerEvents="none" accessible={false} style={{ ...StyleSheet.absoluteFill, margin: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#c39648', borderRadius: 18 }}>
    {['left', 'right'].map(side => <Svg key={side} width={27} height={27} viewBox="0 0 32 32" style={{ position: 'absolute', top: 8, [side]: 8 }}><Path d="M16 2L20 11 30 12 23 19 25 29 16 24 7 29 9 19 2 12 12 11Z" fill="#e6b253" stroke="#fff4c8" strokeWidth={1.5} /></Svg>)}
  </View>;
});

export const GoldGear = memo(function GoldGear() {
  const id = 'gear' + useId().replace(/:/g, '');
  return <Svg pointerEvents="none" width={30} height={30} viewBox="0 0 36 38"><Defs><SvgGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#fff5b3" /><Stop offset="1" stopColor="#ffbf38" /></SvgGradient></Defs><Path d="M14 3H22L23 8 27 10 31 9 35 16 31 20 31 24 27 29 23 28 20 33 13 33 11 28 7 27 3 28 0 20 4 17 5 12 10 8 14 9Z" transform="translate(1 2) scale(.94)" fill="#7b3906" /><Path d="M14 3H22L23 8 27 10 31 9 35 16 31 20 31 24 27 29 23 28 20 33 13 33 11 28 7 27 3 28 0 20 4 17 5 12 10 8 14 9Z" transform="translate(1 0) scale(.94)" fill={`url(#${id})`} stroke="#fff5c2" strokeWidth={1} /><Circle cx={18} cy={17} r={5.6} fill="#3c105e" stroke="#b77417" strokeWidth={1.1} /></Svg>;
});

export const PaperFiligree = memo(function PaperFiligree() {
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    {[[false,false],[true,false],[false,true],[true,true]].map(([right,bottom], i) => <Svg key={i} width={42} height={42} viewBox="0 0 44 44" style={{ position: 'absolute', [right ? 'right' : 'left']: 5, [bottom ? 'bottom' : 'top']: 5, transform: [{ rotate: `${(bottom ? 180 : 0) + (right ? (bottom ? -90 : 90) : 0)}deg` }] }}><Path d="M6 37V18Q6 6 18 6H37 M11 30Q23 24 15 17Q9 14 11 23 M19 10Q27 11 23 18Q19 22 16 18 M10 11Q13 3 17 10 M29 6Q35 13 38 7" fill="none" stroke="#c99543" strokeWidth={1.6} opacity={.6} strokeLinecap="round" /></Svg>)}
  </View>;
});
