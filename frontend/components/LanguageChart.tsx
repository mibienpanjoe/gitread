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

  if (otherTotal > 0) {
    main.push({ name: "Other", value: otherTotal });
  }

  return main;
}

function fmtPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

// Custom label rendered outside each slice
function renderLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  value,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  value: number;
  index: number;
}) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#7D8590"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
    >
      {`${name} ${fmtPct(value)}`}
    </text>
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

      <div
        aria-label="Language breakdown chart"
        role="img"
        style={{ height: 220 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={74}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
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
                }}
              />
            </Pie>
            <Tooltip
              formatter={(value: number) => [fmtPct(value), "Share"]}
              contentStyle={{
                background: "#161B22",
                border: "1px solid #30363D",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#E6EDF3",
              }}
              itemStyle={{ color: "#E6EDF3" }}
            />
          </PieChart>
        </ResponsiveContainer>
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
