export function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      {/* Two-column grid skeleton */}
      <div className="flex flex-col lg:grid lg:grid-cols-[340px_1fr] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* ProfileCard skeleton */}
          <div className="rounded-lg border border-graphite bg-surface p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full skeleton flex-shrink-0" />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="skeleton h-3 w-20 rounded" />
                <div className="skeleton h-5 w-32 rounded-full" />
              </div>
            </div>
            <div className="skeleton h-6 w-3/4 rounded mb-3" />
            <div className="space-y-1.5">
              {[90, 80, 70].map((w) => (
                <div
                  key={w}
                  className="skeleton h-3 rounded"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>

          {/* StatsBar skeleton */}
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-graphite bg-surface h-16 skeleton"
              />
            ))}
          </div>

          {/* SkillProgression skeleton */}
          <div className="rounded-lg border border-graphite bg-surface p-5">
            <div className="skeleton h-3 w-24 rounded mb-3" />
            <div className="flex justify-between mb-3">
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
            <div className="skeleton h-3 w-full rounded" />
          </div>

          {/* SuggestedProject skeleton */}
          <div className="rounded-lg bg-surface p-4" style={{ border: "1px solid #30363D", borderLeft: "3px solid #30363D" }}>
            <div className="skeleton h-3 w-32 rounded mb-2" />
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-5/6 rounded" />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Charts skeleton */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-graphite bg-surface h-[220px] skeleton" />
            <div className="rounded-lg border border-graphite bg-surface h-[220px] skeleton" />
          </div>

          {/* TopRepos skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-graphite bg-surface p-4"
              >
                <div className="flex justify-between mb-2">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-4 w-10 rounded" />
                </div>
                <div className="skeleton h-3 w-full rounded mb-1.5" />
                <div className="skeleton h-3 w-2/3 rounded mb-3" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JobMatchPanel skeleton */}
      <div className="rounded-lg border border-graphite bg-surface h-14 skeleton" />
    </div>
  );
}
