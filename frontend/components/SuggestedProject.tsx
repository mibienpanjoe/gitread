import type { AIProfile } from "@/lib/api";

interface Props {
  ai: AIProfile;
}

export function SuggestedProject({ ai }: Props) {
  if (!ai.available || !ai.suggested_project) return null;

  return (
    <section aria-labelledby="suggested-project-heading">
      <div
        className="rounded-lg bg-surface px-4 py-3.5"
        style={{
          border: "1px solid #30363D",
          borderLeft: "3px solid #22D3A0",
        }}
      >
        <p
          id="suggested-project-heading"
          className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-1.5"
        >
          Suggested next project
        </p>
        <p className="font-body text-sm text-snow leading-relaxed">
          {ai.suggested_project}
        </p>
      </div>
    </section>
  );
}
