import type { DailyTrendPoint } from "@/lib/metrics";

const WIDTH = 720;
const HEIGHT = 260;
const PAD_LEFT = 40;
const PAD_RIGHT = 40;
const PAD_TOP = 20;
const PAD_BOTTOM = 30;

/**
 * Combo chart: bars for daily spend (left axis) + a line for daily leads
 * (right axis, scaled independently since the two are different units).
 */
export default function SpendLeadsChart({ data }: { data: DailyTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-400">
        No data yet for this month.
      </p>
    );
  }

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const maxSpend = Math.max(...data.map((d) => d.spend), 1);
  const maxLeads = Math.max(...data.map((d) => d.leads), 1);

  const slot = plotW / data.length;
  const barW = Math.min(28, slot * 0.5);

  const linePoints = data.map((d, i) => {
    const x = PAD_LEFT + slot * i + slot / 2;
    const y = PAD_TOP + plotH - (d.leads / maxLeads) * plotH;
    return { x, y, d };
  });
  const linePath = linePoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Daily spend and leads"
      >
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

        {data.map((d, i) => {
          const x = PAD_LEFT + slot * i + slot / 2 - barW / 2;
          const h = (d.spend / maxSpend) * plotH;
          const y = PAD_TOP + plotH - h;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx={4}
              fill="var(--brand-spend)"
              opacity={0.85}
            />
          );
        })}

        <path
          d={linePath}
          fill="none"
          stroke="var(--brand-leads)"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {linePoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="white"
            stroke="var(--brand-leads)"
            strokeWidth={2.5}
          />
        ))}

        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <text
              key={d.date}
              x={PAD_LEFT + slot * i + slot / 2}
              y={HEIGHT - 8}
              fontSize={11}
              fill="#64748b"
              textAnchor="middle"
            >
              {d.date.slice(5)}
            </text>
          ) : null
        )}
      </svg>

      <div className="mt-2 flex items-center justify-center gap-6 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "var(--brand-spend)" }}
          />
          Spend
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--brand-leads)" }}
          />
          Leads
        </span>
      </div>
    </div>
  );
}
