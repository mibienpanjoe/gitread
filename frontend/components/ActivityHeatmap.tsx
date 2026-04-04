"use client";

import { useState } from "react";
import type { DayCount } from "@/lib/api";

interface Props {
  data: DayCount[];
}

// 5-level intensity scale (0 = no commits, 4 = many)
function cellColor(count: number): string {
  if (count === 0) return "#21262D";
  if (count < 3)   return "rgba(34,211,160,0.22)";
  if (count < 6)   return "rgba(34,211,160,0.45)";
  if (count < 10)  return "rgba(34,211,160,0.7)";
  return "#22D3A0";
}

const LEGEND_COLORS = [
  "#21262D",
  "rgba(34,211,160,0.22)",
  "rgba(34,211,160,0.45)",
  "rgba(34,211,160,0.7)",
  "#22D3A0",
];

const DOW_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

const CELL = 11; // px
const GAP  = 3;  // px
const STEP = CELL + GAP;

function fmtFull(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });
}

export function ActivityHeatmap({ data }: Props) {
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  if (!data || data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);

  // Build 7-row grid aligned to Monday
  const firstDow = (new Date(data[0].date + "T00:00:00").getDay() + 6) % 7; // 0=Mon
  const cells: (DayCount | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...data,
  ];
  const tail = cells.length % 7;
  if (tail > 0) cells.push(...Array<null>(7 - tail).fill(null));

  const weeks: (DayCount | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Month labels: show when month changes
  const monthLabels: { label: string; col: number }[] = [];
  data.forEach((d, i) => {
    const date = new Date(d.date + "T00:00:00");
    if (date.getDate() === 1) {
      const col = Math.floor((i + firstDow) / 7);
      monthLabels.push({
        label: date.toLocaleDateString("en-US", { month: "short" }),
        col,
      });
    }
  });

  function handleEnter(e: React.MouseEvent<HTMLDivElement>, day: DayCount) {
    const grid = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-heatmap]");
    if (!grid) return;
    const gr = grid.getBoundingClientRect();
    const cr = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      text:
        day.count === 0
          ? `No commits · ${fmtFull(day.date)}`
          : `${day.count} commit${day.count === 1 ? "" : "s"} · ${fmtFull(day.date)}`,
      x: cr.left - gr.left + CELL / 2,
      y: cr.top  - gr.top,
    });
  }

  return (
    <section
      aria-labelledby="activity-heading"
      className="rounded-lg border border-graphite bg-surface p-4"
    >
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <p
          id="activity-heading"
          className="font-body font-semibold text-xs text-ash uppercase tracking-widest"
        >
          90-day commit activity
        </p>
        <p className="font-mono text-xs text-ash">
          <span className="text-snow font-semibold">{total}</span> commits
        </p>
      </div>

      {/* Heatmap */}
      <div
        data-heatmap
        role="img"
        aria-label="90-day commit activity heatmap"
        className="relative select-none"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Month labels */}
        <div
          className="relative mb-1"
          style={{ height: 14, marginLeft: 28 }}
        >
          {monthLabels.map(({ label, col }) => (
            <span
              key={label + col}
              className="absolute font-mono text-ash"
              style={{ fontSize: 10, left: col * STEP }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Day labels + cell grid */}
        <div className="flex" style={{ gap: GAP }}>
          {/* Day-of-week labels */}
          <div className="flex flex-col" style={{ gap: GAP, width: 24 }}>
            {DOW_LABELS.map((label, i) => (
              <div
                key={i}
                className="font-mono text-ash flex items-center"
                style={{ fontSize: 9, height: CELL }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex overflow-x-auto" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="flex flex-col flex-shrink-0"
                style={{ gap: GAP }}
              >
                {week.map((day, di) => (
                  <div
                    key={di}
                    style={{
                      width:        CELL,
                      height:       CELL,
                      borderRadius: 2,
                      flexShrink:   0,
                      background:   day ? cellColor(day.count) : "transparent",
                      cursor:       day ? "default" : "default",
                    }}
                    onMouseEnter={day ? (e) => handleEnter(e, day) : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded px-2 py-1 font-mono text-snow"
            style={{
              fontSize:  11,
              background: "#0D1117",
              border:    "1px solid #30363D",
              left:      tooltip.x,
              top:       tooltip.y,
              transform: "translate(-50%, calc(-100% - 6px))",
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="font-mono text-ash" style={{ fontSize: 10 }}>Less</span>
        {LEGEND_COLORS.map((color, i) => (
          <span
            key={i}
            style={{
              display:      "inline-block",
              width:        10,
              height:       10,
              borderRadius: 2,
              background:   color,
            }}
          />
        ))}
        <span className="font-mono text-ash" style={{ fontSize: 10 }}>More</span>
      </div>

      {/* Screen-reader fallback */}
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
              <td>{fmtFull(d.date)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
