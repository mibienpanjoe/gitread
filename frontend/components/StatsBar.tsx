import type { GitHubData } from "@/lib/api";

interface Props {
  github: GitHubData;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const STATS = (github: GitHubData) => [
  { icon: "★", label: "Stars", value: fmt(github.total_stars) },
  { icon: "⑂", label: "Forks", value: fmt(github.total_forks) },
  { icon: "▤", label: "Repos", value: fmt(github.total_public_repos) },
  {
    icon: "◷",
    label: "Account age",
    value: `${(github.account_age_days / 365).toFixed(1)}y`,
  },
];

export function StatsBar({ github }: Props) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-4"
      role="list"
      aria-label="Profile statistics"
    >
      {STATS(github).map(({ icon, label, value }) => (
        <div
          key={label}
          role="listitem"
          className="flex-shrink-0 min-w-[90px] rounded-lg border border-graphite bg-surface px-3 py-3 text-center"
        >
          <div className="font-mono text-lg text-snow font-medium leading-none">
            <span aria-hidden="true">{icon} </span>
            {value}
          </div>
          <div className="font-body text-xs text-ash mt-1.5">{label}</div>
        </div>
      ))}
    </div>
  );
}
