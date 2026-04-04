import { Suspense } from "react";
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
import { JobMatchPanel } from "@/components/JobMatchPanel";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";
import { ErrorPage } from "@/components/ErrorPage";
import { ChartGroup } from "@/components/ChartGroup";

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
      return <ErrorPage username={username} errorCode={err.code} />;
    }
    return <ErrorPage username={username} errorCode="UNKNOWN" />;
  }

  return (
    <div className="animate-fade-up space-y-5">
      {/* Two-column layout: left sidebar + right main */}
      <div className="flex flex-col lg:grid lg:grid-cols-[340px_1fr] gap-5">

        {/* ── Left column ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          <ProfileCard profile={profile} />
          <StatsBar github={profile.github} />
          <SkillProgression ai={profile.ai} languages={profile.github.language_weighted} />
          <SuggestedProject ai={profile.ai} />
        </div>

        {/* ── Right column ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Charts */}
          <ChartGroup
            languages={profile.github.language_weighted}
            commitFrequency={profile.github.commit_frequency_90d}
          />

          {/* Top repos */}
          <TopRepos
            username={profile.username}
            repos={profile.top_repos}
          />
        </div>
      </div>

      {/* Job match — full width below the grid */}
      <JobMatchPanel username={profile.username} />
    </div>
  );
}

