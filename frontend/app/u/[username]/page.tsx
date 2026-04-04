import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchProfile, APIError } from "@/lib/api";
import type { Profile } from "@/lib/api";
import { ProfileCard } from "@/components/ProfileCard";
import { StatsBar } from "@/components/StatsBar";
import { TopRepos } from "@/components/TopRepos";
import { SkillProgression } from "@/components/SkillProgression";
import { SuggestedProject } from "@/components/SuggestedProject";
import { ShareButton } from "@/components/ShareButton";

const LanguageChart = dynamic(
  () => import("@/components/LanguageChart").then((m) => m.LanguageChart),
  { ssr: false }
);

const ActivityHeatmap = dynamic(
  () => import("@/components/ActivityHeatmap").then((m) => m.ActivityHeatmap),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Open Graph metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  try {
    const profile = await fetchProfile(username);
    const title = profile.ai.card?.title ?? username;
    const description =
      profile.ai.card?.bio ?? `GitHub profile for ${username}`;
    return {
      title: `${title} — Gitread`,
      description,
      openGraph: {
        title: `${title} — Gitread`,
        description,
        url: `https://gitread.dev/u/${username}`,
        siteName: "Gitread",
      },
    };
  } catch {
    return { title: `${username} — Gitread` };
  }
}

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
      {/* Dot-grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, #E6EDF3 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.04,
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 border-b border-graphite px-6 sm:px-10 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Link
            href="/"
            className="font-display font-bold text-snow text-xl tracking-tight hover:text-primary transition-colors duration-100"
          >
            gitread
          </Link>
          <div className="flex items-center gap-3">
            <ShareButton />
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
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 py-8">
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileContent username={username} />
        </Suspense>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async profile content (Suspense boundary)
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

  return (
    <div className="animate-fade-up">
      {/* Two-column layout: left sidebar + right main */}
      <div className="flex flex-col lg:grid lg:grid-cols-[340px_1fr] gap-5">

        {/* ── Left column ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <ProfileCard profile={profile} />
          <StatsBar github={profile.github} />
          <SkillProgression ai={profile.ai} />
          <SuggestedProject ai={profile.ai} />
        </div>

        {/* ── Right column ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Charts */}
          <div className="grid sm:grid-cols-2 gap-4">
            <LanguageChart languages={profile.github.language_weighted} />
            <ActivityHeatmap data={profile.github.commit_frequency_90d} />
          </div>

          {/* Top repos */}
          <TopRepos
            username={profile.username}
            repos={profile.top_repos}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[340px_1fr] gap-5">
      {/* Left skeleton */}
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-graphite bg-surface p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full skeleton" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-5 w-36 rounded-full" />
            </div>
          </div>
          <div className="skeleton h-6 w-3/4 rounded mb-2" />
          <div className="space-y-1.5">
            {[80, 95, 70].map((w) => (
              <div
                key={w}
                className="skeleton h-3 rounded"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-graphite bg-surface h-16 skeleton"
            />
          ))}
        </div>
      </div>

      {/* Right skeleton */}
      <div className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-graphite bg-surface h-36 skeleton" />
          <div className="rounded-lg border border-graphite bg-surface h-36 skeleton" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-graphite bg-surface h-24 skeleton"
            />
          ))}
        </div>
      </div>
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
      {code && (
        <div className="font-display font-bold text-[88px] leading-none text-graphite mb-4 select-none">
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
