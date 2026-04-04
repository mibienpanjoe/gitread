import type { Profile } from "@/lib/api";

interface Props {
  profile: Profile;
}

export function ProfileCard({ profile }: Props) {
  const { username, ai } = profile;
  const card = ai.card;

  return (
    <div className="rounded-lg border border-graphite bg-surface p-5">
      {/* Avatar + username row */}
      <div className="flex items-center gap-4 mb-4">
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${username} on GitHub`}
          className="flex-shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://avatars.githubusercontent.com/${username}`}
            alt={`${username}'s GitHub avatar`}
            width={80}
            height={80}
            className="rounded-full border border-graphite hover:border-primary transition-colors duration-150"
          />
        </a>
        <div className="min-w-0">
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-snow text-base leading-tight truncate hover:text-primary transition-colors duration-100 focus-visible:outline-none focus-visible:text-primary block"
          >
            @{username}
          </a>
          {ai.archetype && (
            <span
              className="mt-1.5 inline-block rounded-full px-3 py-0.5 font-body font-semibold text-xs tracking-wide"
              style={{
                background: "rgba(188, 140, 255, 0.12)",
                border: "1px solid rgba(188, 140, 255, 0.3)",
                color: "#BC8CFF",
              }}
            >
              {ai.archetype}
            </span>
          )}
        </div>
      </div>

      {/* AI unavailable notice */}
      {!ai.available && (
        <div className="rounded-md border border-graphite bg-neutral-700/30 px-3 py-2 mb-4">
          <p className="font-body text-xs text-ash">
            AI analysis unavailable for this profile.
          </p>
        </div>
      )}

      {/* AI-generated content */}
      {card && (
        <>
          <h2 className="font-display font-semibold text-snow text-xl leading-snug mb-2">
            {card.title}
          </h2>
          <p className="font-body text-ash text-sm leading-relaxed mb-4">
            {card.bio}
          </p>

          {/* Strengths as chips */}
          {card.strengths.length > 0 && (
            <div>
              <p className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-2.5">
                Strengths
              </p>
              <div className="flex flex-wrap gap-2">
                {card.strengths.map((strength, i) => (
                  <span
                    key={strength}
                    className="inline-flex items-center rounded-full px-2.5 py-1 font-body text-xs"
                    style={
                      i === 0
                        ? {
                            background: "rgba(34, 211, 160, 0.12)",
                            border: "1px solid rgba(34, 211, 160, 0.35)",
                            color: "#22D3A0",
                          }
                        : {
                            background: "rgba(48, 54, 61, 0.5)",
                            border: "1px solid #30363D",
                            color: "#C9D1D9",
                          }
                    }
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
