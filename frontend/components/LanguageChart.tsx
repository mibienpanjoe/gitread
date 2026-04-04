"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Label,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#22D3A0",
  "#58A6FF",
  "#BC8CFF",
  "#F0883E",
  "#3FB950",
  "#D29922",
  "#F85149",
];

const MIN_PCT = 0.03; // slices below 3% get merged into "Other"

interface Props {
  /** star-weighted language map from profile.github.language_weighted */
  languages: Record<string, number>;
}

interface Slice {
  name: string;
  value: number; // 0–1 float
}

function buildSlices(languages: Record<string, number>): Slice[] {
  const sorted = Object.entries(languages).sort(([, a], [, b]) => b - a);
  const main: Slice[] = [];
  let otherTotal = 0;

  for (const [lang, pct] of sorted) {
    if (pct >= MIN_PCT) {
      main.push({ name: lang, value: pct });
    } else {
      otherTotal += pct;
    }
  }
  if (otherTotal > 0) main.push({ name: "Other", value: otherTotal });
  return main;
}

function fmtPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { name: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const { name } = payload[0].payload;
  const value = payload[0].value;
  return (
    <div
      style={{
        background: "#161B22",
        border: "1px solid #30363D",
        borderRadius: 6,
        padding: "6px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "#E6EDF3",
      }}
    >
      <span style={{ color: "#7D8590" }}>{name}</span>{" "}
      <span style={{ color: "#E6EDF3", fontWeight: 600 }}>{fmtPct(value)}</span>
    </div>
  );
}

export function LanguageChart({ languages }: Props) {
  const slices = buildSlices(languages);
  if (slices.length === 0) return null;

  const topLang = slices[0].name;

  return (
    <section
      aria-labelledby="lang-chart-heading"
      className="rounded-lg border border-graphite bg-surface p-4"
    >
      <p
        id="lang-chart-heading"
        className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-3"
      >
        Language breakdown
      </p>

      {/* Donut — no external labels, more room to breathe */}
      <div
        aria-label="Language breakdown chart"
        role="img"
        style={{ height: 180 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              dataKey="value"
              label={false}
              isAnimationActive={true}
            >
              {slices.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                  stroke="transparent"
                />
              ))}
              <Label
                value={topLang}
                position="center"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fill: "#E6EDF3",
                  fontWeight: 600,
                }}
              />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — inside the card, never clips */}
      <div className="mt-3 space-y-1.5">
        {slices.map((slice, i) => (
          <div key={slice.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="font-mono text-xs text-ash truncate">
                {slice.name}
              </span>
            </div>
            <span className="font-mono text-xs text-snow ml-3 flex-shrink-0">
              {fmtPct(slice.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Screen-reader accessible fallback table */}
      <table className="sr-only" aria-label="Language breakdown data">
        <thead>
          <tr>
            <th scope="col">Language</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s) => (
            <tr key={s.name}>
              <td>{s.name}</td>
              <td>{fmtPct(s.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
