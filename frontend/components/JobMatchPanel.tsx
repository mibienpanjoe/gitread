"use client";

import { useState } from "react";
import { useJobMatch } from "@/lib/queries";
import type { JobMatchResult } from "@/lib/api";
import { APIError } from "@/lib/api";
import { ScoreRing } from "@/components/ScoreRing";
import { SkillList } from "@/components/SkillList";

type Tab = "paste" | "url";

function errorMessage(err: unknown): string {
  if (err instanceof APIError) {
    if (err.code === "AI_UNAVAILABLE") {
      return "AI scoring is temporarily unavailable. Please try again shortly.";
    }
    if (err.code === "JOB_URL_FETCH_FAILED") {
      return "Couldn't fetch that URL. Try pasting the job description instead.";
    }
    if (err.code === "JOB_TEXT_TOO_SHORT") {
      return "The job description is too short. Paste at least a paragraph.";
    }
  }
  return "Something went wrong. Please try again.";
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

interface Props {
  username: string;
}

export function JobMatchPanel({ username }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [urlText, setUrlText] = useState("");
  const [result, setResult] = useState<JobMatchResult | null>(null);

  const mutation = useJobMatch(username);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const body =
      tab === "paste"
        ? { job_text: pasteText.trim() }
        : { job_url: urlText.trim() };

    mutation.mutate(body, {
      onSuccess: (data) => setResult(data),
    });
  }

  const canSubmit =
    !mutation.isPending &&
    (tab === "paste" ? pasteText.trim().length > 0 : urlText.trim().length > 0);

  return (
    <div className="rounded-lg border border-graphite bg-surface overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 font-body font-semibold text-sm text-snow hover:bg-graphite/20 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22D3A0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Score Against a Job Description
        </span>
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
            color: "#7D8590",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-graphite px-5 pb-5 pt-4 space-y-4">
          {/* Input form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Tab switcher */}
            <div className="flex gap-1 p-0.5 rounded-md bg-ink w-fit">
              {(["paste", "url"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  disabled={mutation.isPending}
                  className="px-3 py-1.5 rounded font-body text-xs font-semibold transition-colors duration-100 focus-visible:outline-none"
                  style={{
                    background: tab === t ? "#22D3A0" : "transparent",
                    color: tab === t ? "#0D1117" : "#7D8590",
                  }}
                >
                  {t === "paste" ? "Paste JD" : "Enter URL"}
                </button>
              ))}
            </div>

            {/* Input area */}
            {tab === "paste" ? (
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                disabled={mutation.isPending}
                placeholder="Paste the job description here…"
                rows={6}
                className="w-full rounded-md border border-graphite bg-ink px-3 py-2.5 font-body text-sm text-snow placeholder:text-graphite resize-none focus:outline-none focus:border-primary transition-colors duration-100 disabled:opacity-50"
              />
            ) : (
              <input
                type="url"
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                disabled={mutation.isPending}
                placeholder="https://jobs.example.com/software-engineer"
                className="w-full rounded-md border border-graphite bg-ink px-3 py-2.5 font-mono text-sm text-snow placeholder:text-graphite focus:outline-none focus:border-primary transition-colors duration-100 disabled:opacity-50"
              />
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-md px-4 py-2 font-body font-semibold text-sm transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#22D3A0", color: "#0D1117" }}
            >
              {mutation.isPending ? (
                <>
                  <Spinner />
                  Scoring…
                </>
              ) : (
                "Score it →"
              )}
            </button>
          </form>

          {/* Live region — announces result/error to screen readers */}
          <div aria-live="polite" aria-atomic="true">
            {/* Error state */}
            {mutation.isError && (
              <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3">
                <p className="font-body text-sm text-error">
                  {errorMessage(mutation.error)}
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-5 pt-1" aria-label="Job match results">
              {/* Divider */}
              <div className="border-t border-graphite" />

              {/* Score ring + skill list */}
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <ScoreRing score={result.score} />
                <div className="flex-1 min-w-0">
                  <SkillList
                    matched={result.matched_skills}
                    missing={result.missing_skills}
                  />
                </div>
              </div>

              {/* Recommended project */}
              {result.recommended_project && (
                <div
                  className="rounded-lg bg-surface px-4 py-3.5"
                  style={{
                    border: "1px solid #30363D",
                    borderLeft: "3px solid #58A6FF",
                  }}
                >
                  <p className="font-body font-semibold text-xs text-ash uppercase tracking-widest mb-1.5">
                    Recommended to close the gap
                  </p>
                  <p className="font-body text-sm text-snow leading-relaxed">
                    {result.recommended_project}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
