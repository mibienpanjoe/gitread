"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { DayCount } from "@/lib/api";

interface Props {
  data: DayCount[];
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Show a tick label every N days
function buildTicks(data: DayCount[], intervalDays: number): string[] {
  return data
    .filter((_, i) => i % intervalDays === 0)
    .map((d) => d.date);
}

// Custom bar tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const count = payload[0].value;
  const dateStr = formatDate(label);
  const text =
    count === 0
      ? `No commits on ${dateStr}`
      : `${count} commit${count === 1 ? "" : "s"} on ${dateStr}`;
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
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
}

export function ActivityHeatmap({ data }: Props) {
  if (!data || data.length === 0) return null;

  // Determine if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Show a tick every 14 days (roughly 2 weeks), or 7 on larger displays
  // We pick 14 as the default safe interval for 90 bars
  const ticks = buildTicks(data, 14);

  return (
    <section
      aria-labelledby="activity-heading"
      className="rounded-lg border border-graphite bg-surface p-4"
    >
      <p
        id="activity-heading"
        className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-3"
      >
        90-day commit activity
      </p>

      <div aria-label="90-day commit activity chart" role="img" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap={2}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={formatDate}
              axisLine={false}
              tickLine={false}
              tick={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fill: "#7D8590",
              }}
              interval="preserveStartEnd"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar
              dataKey="count"
              radius={[2, 2, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.count > 0 ? "#22D3A0" : "#30363D"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Screen-reader accessible fallback */}
      <table className="sr-only" aria-label="90-day commit activity data">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Commits</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{formatDate(d.date)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
