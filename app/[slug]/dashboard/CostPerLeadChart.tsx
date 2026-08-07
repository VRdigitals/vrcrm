import type { DailyTrendPoint } from "@/lib/metrics";

const WIDTH = 720;
const HEIGHT = 240;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;

export default function CostPerLeadChart({ data }: { data: DailyTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-400">
        No data yet for this month.
      </p>
    );
  }

  const values = data.map((d) => d.costPerLead);
  const maxVal = Math.max(...values, 0.01);
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = data.map((d, i) => {
    const x = PAD_LEFT + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = PAD_TOP + plotH - (d.costPerLead / maxVal) * plotH;
    return { x, y, d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(
    PAD_TOP + plotH
  ).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} Z`;

  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="Cost per lead trend over the month"
    >
      <defs>
        <linearGradient id="costPerLeadFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-cost)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--brand-cost)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD_TOP + plotH - t * plotH;
        return (
          <line
            key={t}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={y}
            y2={y}
            stroke="#eef2f7"
            strokeWidth={1}
          />
        );
      })}

      <path d={areaPath} fill="url(#costPerLeadFill)" stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--brand-cost)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="white"
          stroke="var(--brand-cost)"
          strokeWidth={2.5}
        />
      ))}

      {points.map((p, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={p.x}
            y={HEIGHT - 8}
            fontSize={11}
            fill="#64748b"
            textAnchor="middle"
          >
            {p.d.date.slice(5)}
          </text>
        ) : null
      )}

      <text x={4} y={PAD_TOP + 4} fontSize={11} fill="#64748b">
        {maxVal.toFixed(2)}
      </text>
      <text x={4} y={PAD_TOP + plotH} fontSize={11} fill="#64748b">
        0
      </text>
    </svg>
  );
}
