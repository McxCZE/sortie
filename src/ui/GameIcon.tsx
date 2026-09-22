import { useId } from "react";
export type IconName =
  | "undo"
  | "restart"
  | "bottle"
  | "settings"
  | "sound"
  | "mute"
  | "close"
  | "hint"
  | "skull"
  | "check";
export function GameIcon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`game-icon ${className}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <g
        fill="#fff9df"
        stroke="#40176f"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke"
      >
        {name === "undo" && (
          <path
            d="M27 9 8 26l19 15V30h9c9 0 13 5 13 11s-5 10-13 10H24v11h13c16 0 24-9 24-21 0-13-9-23-25-23h-9Z"
            transform="translate(-2 -4)"
          />
        )}
        {name === "restart" && (
          <>
            <path d="M51 26A21 21 0 0 0 13 18L7 12v23h23l-8-8a12 12 0 0 1 21-1Z" />
            <path d="M13 39a21 21 0 0 0 38 7l6 6V29H34l8 8a12 12 0 0 1-21 2Z" />
          </>
        )}
        {name === "bottle" && (
          <>
            <path d="M30 7h16v8h-3v10l8 9v21a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5V35l11-11v-9h-3V7Z" />
            <path
              d="M9 19v18M0 28h18"
              fill="none"
              stroke="#fff9df"
              strokeWidth="8"
            />
            <path d="M29 41v10" fill="none" stroke="#d7bcff" strokeWidth="3" />
          </>
        )}
        {name === "settings" && (
          <path
            fillRule="evenodd"
            d="m26 4-2 8-5 2-7-4-7 9 6 6-1 6-8 4 3 11 9-1 4 4 1 10h12l3-8 6-2 8 4 7-9-6-7 1-5 8-4-3-11-9 1-4-4-1-10Zm6 17a12 12 0 1 1 0 24 12 12 0 0 1 0-24Z"
          />
        )}
        {(name === "sound" || name === "mute") && (
          <>
            <path d="M7 24h11L33 11v42L18 40H7Z" />
            {name === "sound" ? (
              <path
                d="M42 22q11 10 0 20M49 14q20 18 0 36"
                fill="none"
                stroke="#fff9df"
                strokeWidth="5"
              />
            ) : (
              <path
                d="m43 24 14 16m0-16L43 40"
                stroke="#fff9df"
                strokeWidth="5"
              />
            )}
          </>
        )}
        {name === "close" && (
          <path d="m16 13 16 14 16-14 5 5-14 15 14 15-6 6-15-15-15 15-6-6 14-15-14-15Z" />
        )}
        {name === "hint" && (
          <>
            <path d="M21 43c0-8-9-11-9-22a20 20 0 1 1 40 0c0 11-9 14-9 22Z" />
            <path
              d="M23 49h18v5H23Zm4 10h10"
              stroke="#ffce4d"
              strokeWidth="5"
            />
            <path
              d="m27 22 5 8 6-8M32 30v10"
              fill="none"
              stroke="#d79f4c"
              strokeWidth="3"
            />
          </>
        )}
        {name === "skull" && (
          <>
            <path d="M12 29a20 20 0 1 1 40 0c0 9-5 12-9 15v10H21V44c-5-3-9-6-9-15Z" />
            <circle cx="24" cy="29" r="6" fill="#361538" stroke="none" />
            <circle cx="41" cy="29" r="6" fill="#361538" stroke="none" />
            <path
              d="m32 36-4 7h8ZM28 48v6m8-6v6"
              fill="#361538"
              stroke="#361538"
              strokeWidth="2"
            />
          </>
        )}
        {name === "check" && <path d="m9 34 9-8 10 11 21-26 9 8-30 36Z" />}
      </g>
    </svg>
  );
}
export function CoinIcon() {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="coin-art" viewBox="0 0 72 80" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}edge`} x2=".2" y2="1">
          <stop stopColor="#ffff92" />
          <stop offset=".5" stopColor="#ffcf24" />
          <stop offset="1" stopColor="#cb6e00" />
        </linearGradient>
        <radialGradient id={`${id}face`} cx=".35" cy=".25">
          <stop stopColor="#fff87b" />
          <stop offset="1" stopColor="#ffb916" />
        </radialGradient>
      </defs>
      <ellipse cx="38" cy="43" rx="32" ry="35" fill="#9a4b00" />
      <ellipse
        cx="35"
        cy="38"
        rx="32"
        ry="35"
        fill={`url(#${id}edge)`}
        stroke="#c47908"
        strokeWidth="2"
      />
      <ellipse
        cx="35"
        cy="37"
        rx="25"
        ry="28"
        fill={`url(#${id}face)`}
        stroke="#e6970b"
        strokeWidth="3"
      />
      <ellipse
        cx="34"
        cy="36"
        rx="28"
        ry="31"
        fill="none"
        stroke="#fffbb4"
        strokeWidth="2"
        opacity=".6"
      />
      <path
        d="m35 17 6 12 13 2-9 10 2 14-12-6-12 6 2-14-9-10 13-2Z"
        fill="#ffe84f"
        stroke="#d49410"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="m15 20 5-5"
        stroke="#fffcc1"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
