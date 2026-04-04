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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://avatars.githubusercontent.com/${username}`}
          alt={`${username}'s GitHub avatar`}
          width={64}
          height={64}
          className="rounded-full border border-graphite flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="font-mono text-snow text-base leading-tight truncate">
            @{username}
          </p>
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

          {/* Strengths */}
          {card.strengths.length > 0 && (
            <div>
              <p className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-2">
                Strengths
              </p>
              <ul className="space-y-1">
                {card.strengths.map((strength) => (
                  <li
                    key={strength}
                    className="flex items-center gap-2 font-body text-sm text-snow"
                  >
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#22D3A0" }}
                    />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
