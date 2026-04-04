import type { AIProfile } from "@/lib/api";

interface Props {
  ai: AIProfile;
  languages: Record<string, number>;
}

const TREND_CONFIG = {
  growing: { label: "Growing", color: "#3FB950", arrow: "↑" },
  stable: { label: "Stable", color: "#D29922", arrow: "→" },
  declining: { label: "Declining", color: "#F85149", arrow: "↓" },
} as const;

export function SkillProgression({ ai, languages }: Props) {
  if (!ai.available || !ai.skill_progression) return null;

  const sp = ai.skill_progression;
  const trend = TREND_CONFIG[sp.trend];

  // Top 3 languages sorted by weight, excluding tiny fractions
  const topLangs = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .filter(([, pct]) => pct > 0.005);

  const showSecondary = topLangs.length > 1;

  return (
    <section
      aria-labelledby="skill-progression-heading"
      className="rounded-lg border border-graphite bg-surface p-5"
    >
      <h3
        id="skill-progression-heading"
        className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-3"
      >
        Language Trend
      </h3>

      {/* Primary language + trend badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm text-snow font-medium">
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

      {/* Secondary languages */}
      {showSecondary && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topLangs.slice(1).map(([lang, pct]) => (
            <span
              key={lang}
              className="font-mono text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(48,54,61,0.6)",
                border: "1px solid #30363D",
                color: "#7D8590",
              }}
            >
              {lang} <span style={{ color: "#C9D1D9" }}>{Math.round(pct * 100)}%</span>
            </span>
          ))}
        </div>
      )}

      <p className="font-body text-sm text-snow/70 leading-relaxed">{sp.summary}</p>
    </section>
  );
}
