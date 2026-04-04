import type { AIProfile } from "@/lib/api";

interface Props {
  ai: AIProfile;
}

/** Highlight a quoted project name 'LikThis' in the suggestion text. */
function renderProjectText(text: string) {
  const parts = text.split(/('[\w\s\-]+')/);
  return parts.map((part, i) =>
    /^'[\w\s\-]+'$/.test(part) ? (
      <span key={i} className="font-mono text-primary font-semibold">
        {part.slice(1, -1)}
      </span>
    ) : (
      part
    )
  );
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
          className="flex items-center gap-1.5 font-body font-semibold text-xs text-ash uppercase tracking-widest mb-2"
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22D3A0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a7 7 0 0 1 5 11.9V17a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3.1A7 7 0 0 1 12 2z" />
            <path d="M9 21h6" />
            <path d="M12 17v4" />
          </svg>
          Suggested next project
        </p>
        <p className="font-body text-sm text-snow leading-relaxed">
          {renderProjectText(ai.suggested_project)}
        </p>
      </div>
    </section>
  );
}
