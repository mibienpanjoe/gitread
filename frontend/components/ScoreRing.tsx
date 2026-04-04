"use client";

import { useEffect, useState } from "react";

const R = 40;
const CIRCUMFERENCE = 2 * Math.PI * R;

function scoreColor(score: number): string {
  if (score >= 70) return "#22D3A0";
  if (score >= 40) return "#D29922";
  return "#F85149";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Strong match";
  if (score >= 40) return "Partial match";
  return "Weak match";
}

interface Props {
  score: number;
}

export function ScoreRing({ score }: Props) {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const targetOffset = CIRCUMFERENCE * (1 - score / 100);

  // Start at empty (full offset) so the arc animates in, unless motion is reduced
  const [offset, setOffset] = useState(
    prefersReducedMotion ? targetOffset : CIRCUMFERENCE
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setOffset(targetOffset);
      return;
    }
    // Kick off after a single frame so the CSS transition runs
    const raf = requestAnimationFrame(() => setOffset(targetOffset));
    return () => cancelAnimationFrame(raf);
  }, [targetOffset, prefersReducedMotion]);

  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={108}
        height={108}
        viewBox="0 0 108 108"
        aria-label={`Match score: ${score} out of 100`}
        role="img"
      >
        {/* Track ring */}
        <circle
          cx={54}
          cy={54}
          r={R}
          fill="none"
          stroke="#30363D"
          strokeWidth={8}
        />
        {/* Filled arc */}
        <circle
          cx={54}
          cy={54}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 54 54)"
          style={{
            transition: prefersReducedMotion
              ? "none"
              : "stroke-dashoffset 800ms ease-out",
          }}
        />
        {/* Score number */}
        <text
          x={54}
          y={52}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 30,
          }}
        >
          {score}
        </text>
        {/* /100 */}
        <text
          x={54}
          y={70}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#7D8590"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
        >
          / 100
        </text>
      </svg>
      <span
        className="font-body font-semibold text-xs"
        style={{ color }}
      >
        {scoreLabel(score)}
      </span>
    </div>
  );
}
