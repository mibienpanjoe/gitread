interface Props {
  matched: string[];
  missing: string[];
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22D3A0"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 mt-0.5"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F85149"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 mt-0.5"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function SkillList({ matched, missing }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Matched skills */}
      <div>
        <p className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-2">
          What you match
        </p>
        {matched.length === 0 ? (
          <p className="font-body text-xs text-ash italic">None detected</p>
        ) : (
          <ul className="space-y-1.5">
            {matched.map((skill) => (
              <li key={skill} className="flex items-start gap-2">
                <CheckIcon />
                <span className="font-body text-sm text-snow">{skill}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Missing skills */}
      <div>
        <p className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-2">
          What&apos;s missing
        </p>
        {missing.length === 0 ? (
          <p className="font-body text-xs text-ash italic">Nothing — great fit!</p>
        ) : (
          <ul className="space-y-1.5">
            {missing.map((skill) => (
              <li key={skill} className="flex items-start gap-2">
                <CrossIcon />
                <span className="font-body text-sm text-ash">{skill}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
