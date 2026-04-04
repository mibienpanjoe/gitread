import type { GitHubData } from "@/lib/api";

interface Props {
  github: GitHubData;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function StarIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm3-8.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 13.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}

const STATS = (github: GitHubData) => [
  {
    Icon: StarIcon,
    label: "Stars",
    value: fmt(github.total_stars),
    title: github.total_stars.toLocaleString() + " stars",
  },
  {
    Icon: ForkIcon,
    label: "Forks",
    value: fmt(github.total_forks),
    title: github.total_forks.toLocaleString() + " forks",
  },
  {
    Icon: RepoIcon,
    label: "Repos",
    value: fmt(github.total_public_repos),
    title: github.total_public_repos.toLocaleString() + " public repos",
  },
  {
    Icon: ClockIcon,
    label: "Age",
    value: `${(github.account_age_days / 365).toFixed(1)}y`,
    title: `Account created ${Math.round(github.account_age_days / 365)} years ago`,
  },
];

export function StatsBar({ github }: Props) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-4"
      role="list"
      aria-label="Profile statistics"
    >
      {STATS(github).map(({ Icon, label, value, title }) => (
        <div
          key={label}
          role="listitem"
          title={title}
          className="flex-shrink-0 min-w-[80px] rounded-lg border border-graphite bg-surface px-3 py-3 text-center"
        >
          <div className="flex items-center justify-center gap-1.5 font-mono text-base text-snow font-medium leading-none">
            <span className="text-ash">
              <Icon />
            </span>
            {value}
          </div>
          <div className="font-body text-xs text-ash mt-1.5 whitespace-nowrap">{label}</div>
        </div>
      ))}
    </div>
  );
}
