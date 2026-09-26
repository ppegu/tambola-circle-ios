import React from "react";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text,
} from "react-native-svg";

/** Painted controls that share the game's glossy illustrated style. */
export function PreferenceArtwork({
  name,
  size = 34,
}: {
  name:
    "palette" | "mobile" | "star" | "motion" | "numbers" | "sound" | "replay";
  size?: number;
}) {
  const id = React.useId().replace(/:/g, "");
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      accessibilityElementsHidden
    >
      <Defs>
        <LinearGradient id={`${id}purple`} x1="0%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0" stopColor="#d78bff" />
          <Stop offset="0.45" stopColor="#8c2de2" />
          <Stop offset="1" stopColor="#48057d" />
        </LinearGradient>
        <LinearGradient id={`${id}gold`} x1="0%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0" stopColor="#fff6a4" />
          <Stop offset="0.5" stopColor="#ffd338" />
          <Stop offset="1" stopColor="#f2940b" />
        </LinearGradient>
        <LinearGradient id={`${id}blue`} x1="0%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0" stopColor="#aaf8ff" />
          <Stop offset="0.5" stopColor="#168bec" />
          <Stop offset="1" stopColor="#0942a3" />
        </LinearGradient>
      </Defs>
      {name === "palette" && (
        <>
          <Path
            d="M24 4C5 3 0 27 12 39C23 49 38 41 31 31C25 22 44 31 43 18C42 9 33 4 24 4Z"
            fill={`url(#${id}gold)`}
            stroke="#a95d17"
            strokeWidth="1.5"
          />
          <Circle cx="16" cy="14" r="4" fill="#ec343d" />
          <Circle cx="27" cy="10" r="4" fill="#7733c4" />
          <Circle cx="11" cy="26" r="4" fill="#65bc2e" />
          <Circle cx="19" cy="35" r="4" fill="#ff6b22" />
          <Path
            d="M27 33L42 8Q47 2 47 8L33 35Z"
            fill="#a56a26"
            stroke="#67311a"
          />
          <Path
            d="M27 33Q22 39 29 42Q34 39 33 34Z"
            fill="#07b2c0"
            stroke="#056d76"
          />
        </>
      )}
      {name === "mobile" && (
        <>
          <Rect
            x="12"
            y="3"
            width="25"
            height="42"
            rx="7"
            fill={`url(#${id}purple)`}
            stroke="#43056d"
            strokeWidth="2"
          />
          <Rect
            x="16"
            y="7"
            width="17"
            height="28"
            rx="3"
            fill="#bc71ff"
            opacity=".6"
          />
          <Circle cx="24" cy="40" r="2" fill="#f5e5ff" />
          <Path
            d="M7 13Q1 21 7 29M42 13Q48 21 42 29"
            fill="none"
            stroke="#9436d9"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {name === "star" && (
        <Path
          d="M24 3L30 16 45 18 34 29 37 44 24 37 11 44 14 29 3 18 18 16Z"
          fill={`url(#${id}gold)`}
          stroke="#a94f0b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {name === "motion" && (
        <>
          <Circle
            cx="24"
            cy="24"
            r="21"
            fill={`url(#${id}blue)`}
            stroke="#07368d"
            strokeWidth="2"
          />
          <Path d="M12 14L25 24 12 34ZM25 14L38 24 25 34Z" fill="#134398" />
          <Path d="M8 7L39 40" stroke="#effdff" strokeWidth="5" />
        </>
      )}
      {name === "numbers" && (
        <>
          <Rect
            x="4"
            y="3"
            width="40"
            height="42"
            rx="9"
            fill={`url(#${id}blue)`}
            stroke="#05316f"
            strokeWidth="2"
          />
          <Text
            x="24"
            y="31"
            textAnchor="middle"
            fill="white"
            fontSize="21"
            fontWeight="bold"
          >
            123
          </Text>
        </>
      )}
      {name === "sound" && (
        <>
          <Path
            d="M4 17H13L26 7V41L13 31H4Z"
            fill={`url(#${id}purple)`}
            stroke="#430579"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path
            d="M32 15Q41 24 32 33M38 9Q52 24 38 39"
            stroke="#8831d1"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
      {name === "replay" && (
        <>
          <Circle
            cx="24"
            cy="24"
            r="21"
            fill={`url(#${id}purple)`}
            stroke="#430579"
            strokeWidth="2"
          />
          <Path
            d="M15 19A11 11 0 1 1 19 35M14 12V22H24"
            fill="none"
            stroke="#fff6e9"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </Svg>
  );
}
