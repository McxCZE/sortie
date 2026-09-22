import { COLORS, complete } from "../game";
type Transfer = {
  color: number;
  amount: number;
  progress: number;
  incoming: boolean;
};
export default function BottleFallback({
  contents,
  id,
  transfer,
  capacity = 4,
}: {
  contents: number[];
  id: number;
  transfer?: Transfer;
  capacity?: number;
}) {
  const visibleContents = transfer?.incoming
    ? [...contents, ...Array<number>(transfer.amount).fill(transfer.color)]
    : contents;
  const units =
    contents.length +
    (transfer
      ? transfer.amount * transfer.progress * (transfer.incoming ? 1 : -1)
      : 0);
  const unitHeight = 108 / capacity;
  const surface = 165 - units * unitHeight;
  return (
    <svg viewBox="0 0 100 180" aria-hidden="true">
      <defs>
        <clipPath id={`liquid-${id}`}>
          <rect
            x="0"
            y={surface}
            width="100"
            height={Math.max(0, units * unitHeight)}
          />
        </clipPath>
        <clipPath id={`glass-${id}`}>
          <path d="M34 12 H66 V43 Q66 50 77 59 Q84 65 84 79 V151 Q84 165 70 165 H30 Q16 165 16 151 V79 Q16 65 23 59 Q34 50 34 43Z" />
        </clipPath>
        <linearGradient id={`shine-${id}`}>
          <stop stopColor="#fff" stopOpacity=".19" />
          <stop offset=".4" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity=".08" />
        </linearGradient>
      </defs>
      <path
        d="M34 12 H66 V43 Q66 50 77 59 Q84 65 84 79 V151 Q84 165 70 165 H30 Q16 165 16 151 V79 Q16 65 23 59 Q34 50 34 43Z"
        fill="#ffffff08"
      />
      <g clipPath={`url(#glass-${id})`}>
        <g clipPath={`url(#liquid-${id})`}>
          {visibleContents.map((color, i) => (
            <g key={i}>
              <rect
                x="15"
                y={165 - (i + 1) * unitHeight}
                width="70"
                height={unitHeight}
                fill={COLORS[color]}
              />
              <rect
                x="15"
                y={165 - (i + 1) * unitHeight}
                width="70"
                height="2"
                fill="white"
                opacity=".17"
              />
              <text
                x="51"
                y={184 - (i + 1) * unitHeight}
                textAnchor="middle"
                fill="#25243f"
                opacity=".52"
                fontSize="13"
              >
                {["✦", "●", "◆", "♥", "☾", "✳"][color]}
              </text>
            </g>
          ))}
        </g>
        {transfer?.incoming &&
          transfer.progress > 0 &&
          transfer.progress < 1 && (
            <g
              className="liquid-ripple"
              style={
                { "--liquid": COLORS[transfer.color] } as React.CSSProperties
              }
            >
              <ellipse
                cx="50"
                cy={surface + 2}
                rx="26"
                ry="3"
                fill={COLORS[transfer.color]}
              />
              <ellipse
                cx="50"
                cy={surface + 1}
                rx="18"
                ry="2.5"
                fill="none"
                stroke="white"
                strokeOpacity=".6"
                strokeWidth="1.5"
              />
            </g>
          )}
      </g>
      <path
        d="M34 12 H66 V43 Q66 50 77 59 Q84 65 84 79 V151 Q84 165 70 165 H30 Q16 165 16 151 V79 Q16 65 23 59 Q34 50 34 43Z"
        fill={`url(#shine-${id})`}
        stroke="#63b7ef"
        strokeOpacity=".4"
        strokeWidth="2"
      />
      <path
        d="M24 84 V145 Q24 155 32 155"
        fill="none"
        stroke="white"
        strokeOpacity=".25"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="30"
        y="9"
        width="40"
        height="8"
        rx="3"
        fill="#174978"
        stroke="#63b7ef"
        strokeOpacity=".6"
      />
      {complete(contents) && (
        <text x="50" y="40" textAnchor="middle" fill="#c2f5d6" fontSize="18">
          ✧
        </text>
      )}
    </svg>
  );
}
