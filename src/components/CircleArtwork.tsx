import { t as tr, useLanguage } from '../i18n';
import React, { useId } from "react";
import { Image, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

// One vector family for every surface: no platform-dependent emoji or text glyph icons.
export function Icon({
  name,
  size = 24,
  color = "#fff",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, string> = {
    image: "M3 5H29V27H3Z M5 25L12 16 18 22 23 15 29 23 M12 10h.1",
    bell: "M7 13A9 9 0 0 1 25 13V21L29 25H3L7 21Z M12 28Q16 32 20 28",
    'user-plus': "M3 28V25Q3 17 12 17Q21 17 21 25V28 M12 3a5 5 0 1 1 0 10a5 5 0 1 1 0-10 M26 8V20 M20 14H32",
    back: "M20 5L9 16 20 27",
    chevron: "M12 6L22 16 12 26",
    down: "M6 12L16 22 26 12",
    download: "M16 3V22 M9 15L16 22 23 15 M5 23V29H27V23",
    arrow: "M5 16H27 M18 7L27 16 18 25",
    close: "M7 7L25 25 M25 7L7 25",
    check: "M6 16L13 23 27 8",
    coins: "M4 15C4 10 21 10 21 15C21 20 4 20 4 15 M4 15V24C4 30 21 30 21 24V15 M4 20C4 25 21 25 21 20 M13 6C13 1 30 1 30 6C30 11 13 11 13 6 M13 6V10 M30 6V17Q28 20 24 20 M24 13Q29 13 30 10",
    calendar: "M6 5H27V29H6Z M6 12H27 M11 2V8 M22 2V8 M12 18H16V22H12Z",
    edit: "M5 22L22 5Q24 3 27 6Q30 9 28 11L11 28 4 29Z M20 7L26 13 M5 22L11 28",
    search: "M22 22L30 30 M25 14a11 11 0 1 1 -22 0a11 11 0 1 1 22 0",
    plus: "M16 5V27 M5 16H27",
    minus: "M6 16H26",
    menu: "M5 8H27 M5 16H27 M5 24H27",
    more: "M7 16h.1 M16 16h.1 M25 16h.1",
    home: "M3 15L16 4 29 15 M7 12V28H13V20H20V28H25V12",
    play: "M10 5L27 16 10 27Z",
    pause: "M11 6V26 M22 6V26",
    clock: "M16 7V16L22 20",
    history: "M4 14A12 12 0 1 1 7 24 M2 7V15H10 M16 8V16L22 21",
    stop: "M7 7H25V25H7Z",
    circle: "M16 9a7 7 0 1 1 0 14a7 7 0 1 1 0-14",
    refresh: "M27 11A12 12 0 1 0 28 21 M27 4V12H19",
    share: "M10 14L23 7 M10 19L23 25",
    link: "M13 19L20 12 M11 12L7 16A6 6 0 0 0 9 26Q13 29 17 25L21 21 M21 20L25 16A6 6 0 0 0 23 6Q19 3 15 7L11 11",
    copy: "M11 7V27H27V7Z M6 23H3V2H20V4",
    lock: "M9 14V9A7 7 0 0 1 23 9V14 M5 14H27V29H5Z M16 20V24",
    globe: "M3 16H29 M16 3C6 10 6 22 16 29C26 22 26 10 16 3 M6 8H26 M6 24H26",
    user: "M5 28V26Q5 17 16 17Q27 17 27 26V28Z",
    groups:
      "M9 29V25Q9 18 16 18Q23 18 23 25V29Z M2 26V22Q2 17 7 17L10 18 M30 26V22Q30 17 25 17L22 18",
    settings:
      "M12 3H20L21 7 25 9 29 8 32 15 29 18 29 22 26 28 21 27 18 30 11 29 10 25 6 23 2 23 0 16 4 13 5 9 8 5 12 6Z M21 16a5 5 0 1 1 -10 0a5 5 0 1 1 10 0Z",
    palette: "M17 2C-4 2-3 30 17 30Q23 29 21 23Q18 18 27 18C35 17 31 2 17 2Z M10 9h.1 M19 7h.1 M26 11h.1 M7 18h.1",
    motion: "M8 7L19 16 8 25Z M19 7L30 16 19 25Z M2 2L30 30",
    board: "M4 3H11V10H4Z M15 3H22V10H15Z M26 3H33V10H26Z M4 14H11V21H4Z M15 14H22V21H15Z M26 14H33V21H26Z M4 25H11V32H4Z M15 25H22V32H15Z M26 25H33V32H26Z",
    dice: "M5 4H27V28H5Z M10 10h.1 M16 16h.1 M22 22h.1",
    star: "M16 2L20 11 30 12 23 19 25 29 16 24 7 29 9 19 2 12 12 11Z",
    ticket:
      "M6 4H26V10Q20 10 26 16V28H6V22Q12 22 6 16Z M15 8V11 M15 15V18 M15 22V25",
    sim: "M8 3H20L27 10V29H5V6Z M10 14H22V25H10Z M10 19H22 M16 14V25",
    phone:
      "M7 4L12 3 16 10 12 14Q15 21 21 22L25 18 30 23 27 29C17 33 0 15 7 4Z",
    mobile: "M9 2H24V30H9Z M14 26H19",
    info: "M16 14V24 M16 8h.1",
    eye: "M2 16Q16 -1 30 16Q16 33 2 16Z",
    crown: "M4 9L10 16 16 5 22 16 28 9 25 26H7Z",
    trophy:
      "M9 3H24V12Q24 21 16 21Q9 21 9 12Z M9 6H3V10Q3 17 10 17 M24 6H30V10Q30 17 23 17 M16 21V28 M10 29H23",
    log: "M10 5H5V30H27V5H22 M11 2H21V8H11Z M10 14H22 M10 20H22 M10 26H18",
    bookmark: "M8 3H25V29L16 22 8 29Z",
    heart: "M16 28C-6 14 3 -4 16 8C29 -4 38 14 16 28Z",
    sound: "M4 12H10L17 6V26L10 20H4Z M22 10Q29 16 22 22 M26 5Q36 16 26 27",
    muted: "M4 12H10L17 6V26L10 20H4Z M23 12L30 21 M30 12L23 21",
    exit: "M15 5H5V27H15 M18 9L26 16 18 23 M11 16H26",
    ban: "M6 6L26 26",
    wifi: "M3 9Q16 -1 29 9 M8 15Q16 8 24 15 M12 21Q16 17 20 21 M16 27h.1",
    gavel: "M14 3L27 16 23 20 10 7Z M6 12L19 25 M11 17L3 25 M15 29H29",
  };
  const filled = [
    "play",
    "heart",
    "bookmark",
    "user",
    "groups",
    "settings",
    "crown",
    "star",
  ].includes(name);
  return (
    <Svg
      style={{ zIndex: 1 }}
      width={size}
      height={size}
      viewBox="0 0 34 32"
      fill="none"
      accessibilityElementsHidden
    >
      {["clock", "globe", "info", "ban"].includes(name) && (
        <Circle cx="16" cy="16" r="13" stroke={color} strokeWidth="2" />
      )}
      {name === 'sound' || name === 'muted' ? <>
        <Path d="M4 12H10L17 6V26L10 20H4Z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <Path d={name === 'sound' ? 'M22 10Q29 16 22 22 M27 5Q36 16 27 27' : 'M23 12L30 21 M30 12L23 21'} stroke={color} strokeWidth={2.3} strokeLinecap="round" />
      </> : <Path
        d={paths[name] ?? paths.menu}
        stroke={color}
        strokeWidth={name === "pause" ? 5 : name === "back" ? 4 : 2}
        fill={filled ? color : "none"}
        fillRule="evenodd"
        strokeLinecap="round"
        strokeLinejoin="round"
      />}
      {name === "user" && <Circle cx="16" cy="8" r="6" fill={color} />}
      {name === "groups" && (
        <>
          <Circle cx="16" cy="10" r="5" fill={color} />
          <Circle cx="6" cy="11" r="4" fill={color} />
          <Circle cx="26" cy="11" r="4" fill={color} />
        </>
      )}
      {name === "share" &&
        [
          [7, 16],
          [25, 5],
          [25, 27],
        ].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r="4" fill={color} stroke={color} strokeWidth="2" />
        ))}
      {name === "eye" && <Circle cx="16" cy="16" r="5" fill={color} />}
    </Svg>
  );
}

export function CircleLogo({ size = 160 }: { size?: number }) {
  useLanguage();
  const id = "friends" + useId().replace(/[^a-z0-9]/gi, "");
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      accessibilityLabel={tr("Tambola Circle friends logo")}
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0.7" y2="1">
          <Stop stopColor="#fff1b0" />
          <Stop offset="0.48" stopColor="#efd080" />
          <Stop offset="1" stopColor="#c99636" />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${id})`}>
        <Circle
          cx="90"
          cy="90"
          r="82"
          stroke={`url(#${id})`}
          strokeWidth="7"
          fill="none"
        />
        <Circle cx="90" cy="64" r="17" />
        <Circle cx="48" cy="80" r="14" />
        <Circle cx="132" cy="80" r="14" />
        <Path d="M59 110Q63 88 90 88Q117 88 121 110L111 122Q91 96 69 122Z M25 107Q44 88 59 111L76 134Q80 145 70 148Q61 148 51 137L37 122Q40 140 61 153L60 167Q33 153 25 107Z M155 107Q136 88 121 111L104 134Q100 145 110 148Q119 148 129 137L143 122Q140 140 119 153L120 167Q147 153 155 107Z" />
      </G>
    </Svg>
  );
}

export function TicketIllustration({ width = 290 }: { width?: number }) {
  useLanguage();
  const nums = [
    5,
    null,
    17,
    33,
    null,
    56,
    null,
    72,
    null,
    9,
    21,
    null,
    null,
    45,
    null,
    68,
    null,
    87,
    null,
    14,
    29,
    null,
    51,
    null,
    76,
    null,
    90,
  ];
  return (
    <Svg
      width={width}
      height={width * 0.48}
      viewBox="0 0 310 150"
      accessibilityElementsHidden
    >
      <G transform="translate(9 22) rotate(-4 145 50)">
        <Rect width="290" height="118" rx="4" fill="#fffaf2" />
        <Rect
          x="9"
          y="8"
          width="272"
          height="101"
          fill="none"
          stroke="#88727c"
        />
        {Array.from({ length: 8 }, (_, i) => (
          <Line
            key={i}
            x1={9 + (i + 1) * 30.22}
            x2={9 + (i + 1) * 30.22}
            y1={8}
            y2={109}
            stroke="#88727c"
            strokeWidth={0.8}
          />
        ))}
        {[42, 75].map((y) => (
          <Line
            key={y}
            x1={9}
            x2={281}
            y1={y}
            y2={y}
            stroke="#88727c"
            strokeWidth={0.8}
          />
        ))}
        {nums.map(
          (n, i) =>
            n && (
              <G key={i}>
                {[33, 68, 14, 76].includes(n) && (
                  <Circle
                    cx={24 + (i % 9) * 30.22}
                    cy={25 + Math.floor(i / 9) * 33.6}
                    r="13"
                    fill="none"
                    stroke="#76207d"
                    strokeWidth="2"
                  />
                )}
                <SvgText
                  x={24 + (i % 9) * 30.22}
                  y={30 + Math.floor(i / 9) * 33.6}
                  fill="#290435"
                  fontSize="14"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {n}
                </SvgText>
              </G>
            ),
        )}
      </G>
    </Svg>
  );
}

// Reuse the approved illustration as an image sprite. Ticket grids and player data
// remain native components; only the decorative artwork is shown from the board.
function ApprovedArt({
  width,
  region,
}: {
  width: number;
  region: { x: number; y: number; width: number; height: number };
}) {
  useLanguage();
  const scale = width / region.width;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width, height: region.height * scale, overflow: "hidden" }}
    >
      {/* <Image
        source={require("../../docs/tambola-circle-design-v2/images/02-tables-and-lobby.png")}
        style={{
          position: "absolute",
          width: 1704 * scale,
          height: 923 * scale,
          left: -region.x * scale,
          top: -region.y * scale,
        }}
        resizeMode="stretch"
      /> */}
    </View>
  );
}
// export function FamilyIllustration({ width = 340 }: { width?: number }) {
//   useLanguage();
//   return (
//     <ApprovedArt
//       width={width}
//       region={{ x: 453, y: 649, width: 380, height: 152 }}
//     />
//   );
// }
// export function ApprovedHeader({
//   width,
//   kind,
// }: {
//   width: number;
//   kind: "tickets" | "family" | "join";
// }) {
//   useLanguage();
//   const x = kind === "family" ? 453 : kind === "join" ? 875 : 36;
//   return (
//     <ApprovedArt width={width} region={{ x, y: 84, width: 384, height: 116 }} />
//   );
// }

export function FooterWave() {
  useLanguage();
  return (
    <Svg
      width="100%"
      height="80"
      viewBox="0 0 390 80"
      preserveAspectRatio="none"
    >
      <Path d="M0 24Q100 90 204 54T390 20V80H0Z" fill="#f0e6f2" />
    </Svg>
  );
}

export function CelebrationArt() {
  useLanguage();
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 390 150"
      preserveAspectRatio="none"
      accessibilityElementsHidden
    >
      <G fill="#efd080">
        <Path d="M27 8l9 5-8 21 16 9-6 9-22-15Z M352 17l11 5-10 23 12 6-5 10-23-11Z M33 92l12-8 6 9-12 9 13 16-9 8-19-23Z M341 100l18-13 7 9-16 13 4 11-11 6Z" />
        <Path d="M78 20l3 8 9 2-9 3-3 8-3-8-8-3 8-2Z M315 115l3 8 9 2-9 3-3 8-3-8-8-3 8-2Z M305 30l2 6 7 2-7 2-2 7-2-7-7-2 7-2Z" />
        {[
          [62, 61],
          [321, 71],
          [20, 72],
          [371, 122],
          [97, 112],
          [284, 16],
        ].map(([x, y], i) => (
          <Rect
            key={i}
            x={x}
            y={y}
            width="5"
            height="8"
            rx="1"
            transform={`rotate(25 ${x} ${y})`}
          />
        ))}
      </G>
    </Svg>
  );
}
