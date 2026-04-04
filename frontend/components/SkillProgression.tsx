import type { AIProfile } from "@/lib/api";

interface Props {
  ai: AIProfile;
}

const TREND_CONFIG = {
  growing: {
    label: "Growing",
    color: "#3FB950",
    arrow: "↑",
  },
  stable: {
    label: "Stable",
    color: "#D29922",
    arrow: "→",
  },
  declining: {
    label: "Declining",
    color: "#F85149",
    arrow: "↓",
  },
} as const;

export function SkillProgression({ ai }: Props) {
  if (!ai.available || !ai.skill_progression) return null;

  const sp = ai.skill_progression;
  const trend = TREND_CONFIG[sp.trend];

  return (
    <section
      aria-labelledby="skill-progression-heading"
      className="rounded-lg border border-graphite bg-surface p-5"
    >
      <h3
        id="skill-progression-heading"
        className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-3"
      >
        Skill Progression
      </h3>

      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm text-snow">
          {sp.primary_language}
        </span>
        <span
          className="flex items-center gap-1 font-body font-semibold text-sm"
          style={{ color: trend.color }}
          aria-label={`Trend: ${trend.label}`}
        >
          <span aria-hidden="true">{trend.arrow}</span>
          {trend.label}
        </span>
      </div>

      <p className="font-body text-xs text-ash leading-relaxed">{sp.summary}</p>
    </section>
  );
}
