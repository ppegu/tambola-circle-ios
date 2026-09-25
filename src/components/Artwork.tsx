import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';

export { Icon } from './CircleArtwork';

function Ticket({ x, y, rotation }: { x: number; y: number; rotation: number }) {
  return <G transform={`translate(${x} ${y}) rotate(${rotation})`}>
    <Rect width="126" height="96" rx="3" fill="#e7abc9" stroke="#ffddbc" strokeWidth="3" />
    <Rect x="5" y="5" width="116" height="86" fill="none" stroke="#ae597e" strokeWidth="1" />
    {[1, 2, 3, 4].map(n => <Line key={'v' + n} x1={5 + n * 23.2} y1="5" x2={5 + n * 23.2} y2="91" stroke="#b9698d" />)}
    {[1, 2].map(n => <Line key={'h' + n} x1="5" y1={5 + n * 28.7} x2="121" y2={5 + n * 28.7} stroke="#b9698d" />)}
    {[12, 21, 43, 58, 71, 1, 19, 34, 44, 65, 7, 28, 45, 68, 90].map((n, i) =>
      <SvgText key={i} x={16.6 + (i % 5) * 23.2} y={25 + Math.floor(i / 5) * 28.7} fill="#6e1a5b" fontSize="12" fontWeight="bold" textAnchor="middle">{n}</SvgText>)}
  </G>;
}

export function Ball({ number, size = 60, green = false, style }: { number: number; size?: number; green?: boolean; style?: StyleProp<ViewStyle> }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ballId = `ball${id}`;
  const faceId = `face${id}`;
  return <Svg width={size} height={size} viewBox="0 0 72 72" style={style}>
    <Defs><RadialGradient id={ballId} cx="35%" cy="20%" r="80%">
      <Stop offset="0" stopColor={green ? '#c5f683' : '#f298dd'} /><Stop offset="0.44" stopColor={green ? '#49ab1b' : '#af39aa'} />
      <Stop offset="1" stopColor={green ? '#0d3800' : '#37003d'} /></RadialGradient>
      <LinearGradient id={faceId} x1="0" y1="0" x2="0.8" y2="1"><Stop stopColor="#fffefa" /><Stop offset="1" stopColor="#deb5d6" /></LinearGradient></Defs>
    <Ellipse cx="38" cy="64" rx="27" ry="6" fill="#100016" opacity="0.35" />
    <Circle cx="35" cy="34" r="32" fill={`url(#${ballId})`} stroke={green ? '#538a29' : '#711d79'} strokeWidth="1.5" />
    <Ellipse cx="33" cy="31" rx="23.5" ry="24" fill={`url(#${faceId})`} stroke={green ? '#8eb94d' : '#be69ba'} strokeWidth="2" />
    <Path d="M13 21Q29 -1 51 15" stroke="white" strokeWidth="2.4" fill="none" opacity="0.55" />
    <SvgText x="33.5" y="42" textAnchor="middle" fill={green ? '#143b0c' : '#5b1459'} fontSize="29" fontWeight="bold">{number}</SvgText>
  </Svg>;
}

export function HomeBackdrop() {
  return <Svg width="100%" height="100%" viewBox="0 0 360 710" preserveAspectRatio="xMidYMid slice">
    <Defs>
      <LinearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><Stop stopColor="#220329" /><Stop offset="0.5" stopColor="#4a0647" /><Stop offset="1" stopColor="#6d004e" /></LinearGradient>
      <RadialGradient id="glow"><Stop stopColor="#ec09b0" stopOpacity="0.6" /><Stop offset="1" stopColor="#9d056b" stopOpacity="0" /></RadialGradient>
      <LinearGradient id="gold"><Stop stopColor="#814019" /><Stop offset="0.25" stopColor="#fff4ad" /><Stop offset="0.5" stopColor="#d99221" /><Stop offset="0.75" stopColor="#fce886" /><Stop offset="1" stopColor="#76410b" /></LinearGradient>
    </Defs>
    <Rect width="360" height="710" fill="url(#bg)" />
    <Ellipse cx="160" cy="507" rx="240" ry="260" fill="url(#glow)" />
    <Ellipse cx="206" cy="670" rx="185" ry="170" fill="url(#glow)" />
    {Array.from({ length: 10 }, (_, i) => <Path key={i} d={`M-65 ${245 + i * 9} C155 ${385 + i * 13} 104 ${628 - i * 4} 411 ${485 + i * 8}`} stroke="#f44bbd" strokeWidth="0.7" opacity={0.06 + i * 0.009} fill="none" />)}
    {Array.from({ length: 48 }, (_, i) => {
      const x = (i * 73 + 13) % 360, y = (i * 97 + 223) % 710;
      return <Circle key={i} cx={x} cy={y} r={i % 7 === 0 ? 2 : 0.7} fill="#fbc07e" opacity={i % 7 === 0 ? 0.75 : 0.25} />;
    })}
    <Ticket x={-15} y={485} rotation={-18} /><Ticket x={278} y={282} rotation={15} />
    <Path d="M-10 173C38 184-15 207 27 219L43 241C-11 226 22 209-9 197Z" fill="url(#gold)" />
    <Path d="M357 213C323 231 376 241 332 253L308 267C368 262 340 241 372 233Z" fill="url(#gold)" />
    <Path d="M10 390C39 409-1 416 23 436L37 452C-1 437 29 418 7 414Z" fill="url(#gold)" />
    <Path d="M326 585C290 592 333 607 303 625L289 641C347 615 304 605 348 600Z" fill="url(#gold)" />
    {[{ x: 93, y: 374 }, { x: 239, y: 616 }, { x: 288, y: 139 }, { x: 44, y: 588 }].map(({ x, y }, i) => <G key={i} opacity="0.8">
      <Path d={`M${x - 6} ${y}h12 M${x} ${y - 8}v16`} stroke="#ffd09c" strokeWidth="0.7" /><Circle cx={x} cy={y} r="1.7" fill="#fff4c5" />
    </G>)}
  </Svg>;
}

export function Lotus({ size = 46 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 50 46" fill="none">
    <Path d="M25 3C15 13 15 23 25 30C35 23 35 13 25 3Z M22 31C9 31 4 24 3 17C15 16 22 21 22 31Z M28 31C41 31 46 24 47 17C35 16 28 21 28 31Z" fill="#931162" stroke="#f1d07b" strokeWidth="2" />
    <Circle cx="25" cy="37" r="5" fill="#edc253" /><Path d="M25 0V5" stroke="#ffeec3" strokeWidth="2" />
  </Svg>;
}
