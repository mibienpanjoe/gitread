"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = ["torvalds", "sindresorhus", "gaearon"] as const;

export default function Home() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    router.push(`/u/${trimmed}`);
  }

  function handleChip(name: string) {
    router.push(`/u/${name}`);
  }

  return (
    <div className="relative min-h-dvh bg-ink overflow-hidden flex flex-col">

      {/* ── Dot-grid background ─────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #E6EDF3 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.055,
        }}
      />

      {/* ── Radial green bloom behind hero ──────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] w-[720px] h-[480px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(34,211,160,0.07) 0%, transparent 68%)",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 max-w-5xl mx-auto w-full">
        <span className="font-display font-bold text-snow text-xl tracking-tight select-none">
          gitread
        </span>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-ash text-sm font-mono hover:text-snow transition-colors duration-100 focus-visible:outline-none focus-visible:text-snow"
        >
          GitHub
          <svg
            aria-hidden="true"
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2 10L10 2M10 2H4M10 2V8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </nav>

      {/* ── Main hero ───────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20">
        <div className="w-full max-w-xl text-center animate-fade-up">

          {/* Hero heading */}
          <h1 className="font-display font-bold leading-[1.12] mb-5">
            <span className="block text-snow text-5xl sm:text-[56px]">
              Your GitHub,
            </span>
            <span
              className="block text-5xl sm:text-[56px]"
              style={{
                color: "#22D3A0",
                textShadow:
                  "0 0 48px rgba(34,211,160,0.28), 0 0 12px rgba(34,211,160,0.12)",
              }}
            >
              read back to you.
            </span>
          </h1>

          {/* Subtext */}
          <p className="font-body text-ash text-lg leading-relaxed mb-10 max-w-sm mx-auto">
            Paste any GitHub username. Get a developer profile powered by real
            commit data.
          </p>

          {/* Search form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 max-w-[480px] mx-auto"
          >
            {/* Input row */}
            <div className="relative">
              {/* Terminal prompt */}
              <span
                aria-hidden="true"
                className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-primary text-sm select-none leading-none"
              >
                &gt;
              </span>

              {/* Search icon */}
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-ash"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter a GitHub username"
                autoComplete="off"
                spellCheck={false}
                aria-label="GitHub username"
                className="w-full rounded-lg border border-graphite bg-surface pl-14 pr-4 py-[14px] font-mono text-[15px] text-snow placeholder:text-ash outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(34,211,160,0.15)]"
              />
            </div>

            {/* CTA button */}
            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full rounded-lg bg-primary py-[14px] font-body font-semibold text-[15px] text-ink transition-colors duration-150 hover:bg-[#1ab889] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(34,211,160,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate Profile →
            </button>
          </form>

          {/* Example chips */}
          <div className="mt-9 flex flex-col items-center gap-4">
            <div className="flex w-full max-w-[480px] items-center gap-3">
              <div className="h-px flex-1 bg-graphite" />
              <span className="font-body text-xs text-ash whitespace-nowrap">
                or try an example
              </span>
              <div className="h-px flex-1 bg-graphite" />
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {EXAMPLES.map((name) => (
                <button
                  key={name}
                  onClick={() => handleChip(name)}
                  className="rounded-md border border-graphite px-3 py-1.5 font-mono text-sm text-ash transition-all duration-150 hover:border-primary hover:text-primary hover:bg-[rgba(34,211,160,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:text-primary"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
