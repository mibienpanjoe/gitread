import type { TopRepo } from "@/lib/api";

interface Props {
  username: string;
  repos: TopRepo[];
}

/** Best-effort language → dot colour mapping (tuned for dark backgrounds) */
const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#4584b6",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#e76f00",
  "C++": "#f34b7d",
  C: "#9e9e9e",       // #555555 is invisible on dark bg — use mid-gray
  Ruby: "#cc342d",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  PHP: "#7a86b8",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#7c5cbf",
  Dart: "#00B4AB",
  Elixir: "#6e4a7e",
  Vue: "#41b883",
};

function LangBadge({ language }: { language: string }) {
  const color = LANG_COLOR[language] ?? "#7D8590";
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs text-ash">
      <span
        aria-hidden="true"
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      {language}
    </span>
  );
}

function timeAgo(isoDate: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / 86_400_000
  );
  if (diffDays < 1) return "today";
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function TopRepos({ username, repos }: Props) {
  if (repos.length === 0) return null;

  return (
    <section aria-labelledby="top-repos-heading">
      <h3
        id="top-repos-heading"
        className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-3"
      >
        Top Repositories
      </h3>
      <ul className="space-y-3">
        {repos.map((repo) => {
          const description = repo.ai_description ?? repo.description;
          return (
            <li
              key={repo.name}
              className="rounded-lg border border-graphite bg-surface p-4 hover:border-ash transition-colors duration-150"
            >
              {/* Name + stars + forks */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <a
                  href={`https://github.com/${username}/${repo.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-blue-accent hover:underline underline-offset-2 leading-tight truncate"
                >
                  {repo.name}
                </a>
                <div className="flex-shrink-0 flex items-center gap-3 font-mono text-xs text-ash">
                  <span
                    className="flex items-center gap-1"
                    title={`${repo.stars.toLocaleString()} stars`}
                  >
                    <span aria-hidden="true">★</span>
                    {repo.stars.toLocaleString()}
                  </span>
                  {repo.forks > 0 && (
                    <span
                      className="flex items-center gap-1"
                      title={`${repo.forks.toLocaleString()} forks`}
                    >
                      <svg
                        aria-hidden="true"
                        width="11"
                        height="11"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm3-8.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" />
                      </svg>
                      {repo.forks.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Description + AI badge on same row but badge is outside prose */}
              {description && (
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-body text-xs text-ash leading-relaxed line-clamp-2">
                    {description}
                  </p>
                  {repo.ai_description && (
                    <span
                      aria-label="AI generated description"
                      title="AI generated"
                      className="flex-shrink-0 flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                      style={{
                        background: "rgba(188,140,255,0.1)",
                        border: "1px solid rgba(188,140,255,0.25)",
                        color: "#BC8CFF",
                      }}
                    >
                      ✦ AI
                    </span>
                  )}
                </div>
              )}

              {/* Language + last active */}
              <div className="flex items-center justify-between">
                {repo.language ? (
                  <LangBadge language={repo.language} />
                ) : (
                  <span />
                )}
                <span
                  className="font-body text-xs text-ash"
                  title={`Last pushed ${new Date(repo.pushed_at).toLocaleDateString()}`}
                >
                  {timeAgo(repo.pushed_at)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
