"use client";

import dynamic from "next/dynamic";
import type { DayCount } from "@/lib/api";

const LanguageChart = dynamic(
  () => import("@/components/LanguageChart").then((m) => m.LanguageChart),
  { ssr: false }
);

const ActivityHeatmap = dynamic(
  () => import("@/components/ActivityHeatmap").then((m) => m.ActivityHeatmap),
  { ssr: false }
);

interface Props {
  languages: Record<string, number>;
  commitFrequency: DayCount[];
}

export function ChartGroup({ languages, commitFrequency }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <LanguageChart languages={languages} />
      <ActivityHeatmap data={commitFrequency} />
    </div>
  );
}
