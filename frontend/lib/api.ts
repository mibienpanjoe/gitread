// TypeScript interfaces matching backend Pydantic models exactly.

export interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushed_at: string;
  created_at: string;
}

export interface DayCount {
  date: string;
  count: number;
}

export interface GitHubData {
  username: string;
  account_age_days: number;
  total_public_repos: number;
  total_stars: number;
  total_forks: number;
  language_weighted: Record<string, number>;
  commit_frequency_90d: DayCount[];
  repos: Repo[];
}

export interface ProfileCard {
  title: string;
  bio: string;
  strengths: string[];
}

export interface SkillProgression {
  primary_language: string;
  trend: "growing" | "stable" | "declining";
  summary: string;
}

export interface AIProfile {
  available: boolean;
  card: ProfileCard | null;
  archetype: string | null;
  repo_descriptions: Record<string, string>;
  skill_progression: SkillProgression | null;
  suggested_project: string | null;
}

export interface TopRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushed_at: string;
  created_at: string;
  ai_description: string | null;
}

export interface Profile {
  username: string;
  generated_at: string;
  cached: boolean;
  ai_available: boolean;
  github: GitHubData;
  ai: AIProfile;
  top_repos: TopRepo[];
}

export interface JobMatchResult {
  username: string;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  recommended_project: string;
}

export interface JobMatchRequest {
  job_text?: string;
  job_url?: string;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class APIError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body.detail ?? {}) as Record<string, string>;
    throw new APIError(
      res.status,
      detail.code ?? "UNKNOWN_ERROR",
      detail.message ?? `HTTP ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

export async function fetchProfile(username: string): Promise<Profile> {
  return apiFetch<Profile>(
    `/api/v1/profile/${encodeURIComponent(username)}`,
    { cache: "no-store" },
  );
}

export async function scoreJobMatch(
  username: string,
  body: JobMatchRequest,
): Promise<JobMatchResult> {
  return apiFetch<JobMatchResult>(
    `/api/v1/profile/${encodeURIComponent(username)}/job-match`,
    { method: "POST", body: JSON.stringify(body) },
  );
}
