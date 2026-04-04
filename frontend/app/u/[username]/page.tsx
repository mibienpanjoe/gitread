import { Suspense } from "react";
import Link from "next/link";
import { fetchProfile, APIError } from "@/lib/api";
import type { Profile } from "@/lib/api";

// ---------------------------------------------------------------------------
// Page entry — server component
// ---------------------------------------------------------------------------

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <div className="min-h-dvh bg-ink">
      {/* Nav */}
      <nav className="border-b border-graphite px-6 sm:px-10 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link
          href="/"
          className="font-display font-bold text-snow text-xl tracking-tight hover:text-primary transition-colors duration-100"
        >
          gitread
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-sm text-ash hover:text-snow transition-colors duration-100 focus-visible:outline-none focus-visible:text-snow"
        >
          <svg
            aria-hidden="true"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Search again
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
        <Suspense fallback={<ProfileSkeleton username={username} />}>
          <ProfileContent username={username} />
        </Suspense>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async content — throws to Suspense boundary while loading
// ---------------------------------------------------------------------------

async function ProfileContent({ username }: { username: string }) {
  let profile: Profile;

  try {
    profile = await fetchProfile(username);
  } catch (err) {
    if (err instanceof APIError) {
      if (err.status === 404 || err.code === "GITHUB_USER_NOT_FOUND") {
        return (
          <ErrorState
            title="User not found"
            message={`GitHub user "${username}" not found — check the spelling and try again.`}
            code="404"
          />
        );
      }
      if (err.status === 429 || err.code === "GITHUB_RATE_LIMIT") {
        return (
          <ErrorState
            title="Rate limit hit"
            message="GitHub API rate limit exceeded. Please try again in a few minutes."
            code="429"
          />
        );
      }
      if (err.status === 502 || err.code === "GITHUB_UNAVAILABLE") {
        return (
          <ErrorState
            title="GitHub unavailable"
            message="GitHub API is temporarily unavailable. Please try again shortly."
            code="502"
          />
        );
      }
    }
    return (
      <ErrorState
        title="Something went wrong"
        message="Something went wrong. Please try again."
      />
    );
  }

  return <ProfileDataView profile={profile} />;
}

// ---------------------------------------------------------------------------
// Profile data view (Phase 7 placeholder — raw JSON)
// ---------------------------------------------------------------------------

function ProfileDataView({ profile }: { profile: Profile }) {
  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {/* Avatar */}
        <img
          src={`https://avatars.githubusercontent.com/${profile.username}`}
          alt={`${profile.username}'s GitHub avatar`}
          width={64}
          height={64}
          className="rounded-full border border-graphite"
        />
        <div>
          <h1 className="font-display font-bold text-snow text-2xl">
            {profile.username}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-sm text-ash">
              @{profile.username}
            </span>
            {profile.cached && (
              <span className="rounded-full border border-graphite px-2 py-0.5 font-mono text-xs text-ash">
                cached
              </span>
            )}
            {!profile.ai_available && (
              <span className="rounded-full border border-graphite px-2 py-0.5 font-mono text-xs text-ash">
                AI unavailable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Stars", value: profile.github.total_stars, icon: "★" },
          { label: "Forks", value: profile.github.total_forks, icon: "⑂" },
          { label: "Repos", value: profile.github.total_public_repos, icon: "▤" },
          {
            label: "Account age",
            value: `${Math.floor(profile.github.account_age_days / 365)}y`,
            icon: "◷",
          },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="rounded-lg border border-graphite bg-surface px-4 py-3"
          >
            <div className="font-mono text-xl text-snow font-medium">
              {icon} {value}
            </div>
            <div className="font-body text-xs text-ash mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Raw JSON — Phase 7 placeholder */}
      <div className="rounded-lg border border-graphite bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-graphite">
          <span className="font-mono text-xs text-ash">profile.json</span>
          <span className="font-mono text-xs text-ash">
            Phase 7 — full UI in Phase 8+
          </span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-xs text-snow/80 leading-relaxed whitespace-pre-wrap break-all">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ProfileSkeleton({ username }: { username: string }) {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full skeleton" />
        <div className="flex flex-col gap-2">
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-graphite bg-surface px-4 py-3"
          >
            <div className="skeleton h-6 w-16 rounded mb-1" />
            <div className="skeleton h-3 w-12 rounded" />
          </div>
        ))}
      </div>

      {/* Body skeleton */}
      <div className="rounded-lg border border-graphite bg-surface p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-4 rounded"
            style={{ width: `${65 + Math.sin(i) * 25}%` }}
          />
        ))}
      </div>

      <p className="mt-4 font-mono text-xs text-ash text-center">
        Fetching {username}&apos;s GitHub data…
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({
  title,
  message,
  code,
}: {
  title: string;
  message: string;
  code?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center animate-fade-in">
      {code && (
        <div className="font-display font-bold text-[80px] leading-none text-graphite mb-4 select-none">
          {code}
        </div>
      )}
      <h2 className="font-display font-bold text-snow text-2xl mb-3">
        {title}
      </h2>
      <p className="font-body text-ash text-base max-w-sm mb-8">{message}</p>
      <Link
        href="/"
        className="rounded-lg border border-graphite px-5 py-2.5 font-body font-semibold text-sm text-snow hover:border-primary hover:text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:border-primary"
      >
        ← Search again
      </Link>
    </div>
  );
}
