import type { TopRepo } from "@/lib/api";

interface Props {
  username: string;
  repos: TopRepo[];
}

/** Best-effort language → dot colour mapping */
const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  PHP: "#4F5D95",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
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
              {/* Name + stars */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <a
                  href={`https://github.com/${username}/${repo.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-blue-accent hover:underline underline-offset-2 leading-tight truncate"
                >
                  {repo.name}
                </a>
                <span className="flex-shrink-0 flex items-center gap-1 font-mono text-xs text-ash">
                  <span aria-hidden="true">★</span>
                  {repo.stars.toLocaleString()}
                </span>
              </div>

              {/* Description */}
              {description && (
                <p className="font-body text-xs text-ash leading-relaxed mb-2 line-clamp-2">
                  {description}
                  {repo.ai_description && (
                    <span
                      aria-label="AI generated"
                      title="AI generated"
                      className="ml-1.5 inline-block align-middle"
                      style={{ color: "#BC8CFF", fontSize: "10px" }}
                    >
                      ✦ AI
                    </span>
                  )}
                </p>
              )}

              {/* Language badge */}
              {repo.language && <LangBadge language={repo.language} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
