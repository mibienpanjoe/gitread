# Gitread — System Contract & Invariants
Version: v1.0, 2026-04-03

---

## Actors & Allowed Actions

| Actor | Permitted Actions |
|-------|------------------|
| Visitor | View any profile at `/u/{username}`; submit a GitHub username for profile generation; paste a job description for match analysis |
| GitHubAPI | Respond to authenticated REST requests with public user and repository data |
| LLM | Receive structured prompts with GitHub data; return structured JSON profile content |
| Cache | Store and retrieve profile data by username key; enforce TTL expiry |

No actor has write access to the profile data store of another user. No actor can modify LLM output before it is validated and serialised.

---

## System Guarantees (Invariants)

### Data Accuracy

**INV-01 — GitHub Data Integrity**
All data displayed on a profile page (repo names, star counts, language percentages, commit counts, account age) MUST originate exclusively from the GitHub REST API response for the queried username. No values may be synthesised, approximated, or carried over from a different username's data.

**INV-02 — AI Content Grounding**
Every AI-generated statement on a profile MUST be traceable to the actual GitHub data for that user. The LLM MUST NOT invent repositories, languages, frameworks, stars, or activity patterns that are not present in the fetched data. A profile that mentions Python must have Python in the user's actual language distribution.

**INV-03 — Fork Exclusion**
Fork repositories MUST be excluded from all calculations: language breakdown, activity heatmap, top repos list, archetype generation, skill progression, and suggested next project. A forked repo represents copied work, not the developer's own output.

### Caching

**INV-04 — TTL Enforcement**
A cached profile MUST NOT be served after its 1-hour TTL has expired. If Redis returns a key with an expired TTL (or the TTL check is ambiguous), the system MUST treat it as a cache miss and regenerate. A stale profile being served as current is a data accuracy violation.

**INV-05 — Cache Key Isolation**
Each cache entry is keyed exclusively by the lowercased GitHub username. No two usernames share a cache entry. Reading or writing a cache entry for username A MUST NOT affect any entry for username B.

### AI Behaviour

**INV-06 — Score Bounds**
Job match scores MUST always be integers in the range [0, 100] inclusive. A score outside this range indicates an LLM or parsing error and MUST be rejected — the system MUST NOT return an out-of-bounds score to the client.

**INV-07 — Structured Output Enforcement**
LLM responses MUST be parsed from structured JSON before any field is used. Freeform text fields from the LLM MUST NOT be passed through to the API response or rendered in the UI. If JSON parsing fails, the affected AI fields MUST be omitted and `ai_unavailable: true` MUST be set.

**INV-08 — Partial Profile on AI Failure**
An LLM failure MUST NOT prevent raw GitHub data (stats, repos, language chart, heatmap) from being returned. The system MUST always return the best available profile — at minimum, a complete data-only profile with AI fields absent.

### Processing

**INV-09 — Language Weighting**
The language breakdown chart MUST use star-weighted distribution. The weight of a language in a given repo is `language_bytes_in_repo × repo_star_count` (or 1 if star_count = 0). This invariant ensures the chart reflects the developer's impactful work, not just volume.

**INV-10 — Top Repo Ranking**
The top 5 repos MUST be selected using a composite ranking of stars and recency. A 5-star repo pushed to in the last 30 days ranks above a 5-star repo untouched for 3 years. The exact formula is an implementation detail; the invariant is that neither stars nor recency alone is determinative.

### Public Access

**INV-11 — No Authentication Gate**
Profile pages at `/u/{username}` MUST be accessible without any authentication. A login prompt, auth redirect, or 401/403 response on this path is a contract violation. Gitread's value proposition depends on frictionless sharing.

---

## Absolute Prohibitions

| ID | The system MUST NEVER... |
|----|--------------------------|
| FRB-01 | Return AI-generated content that references a repository not present in the user's actual public GitHub data |
| FRB-02 | Serve a cached profile that was generated for a different username, regardless of any key collision or normalisation edge case |
| FRB-03 | Expose GitHub API tokens, OpenAI API keys, or Redis connection strings in any HTTP response, log output visible to clients, or frontend bundle |
| FRB-04 | Include fork repositories in any analysis or visualisation |
| FRB-05 | Return a job match score outside the integer range [0, 100] |
| FRB-06 | Persist a job description or job URL beyond the scope of the analysis request |
| FRB-07 | Block a profile page render for a cached profile due to LLM unavailability — cached data is always servable |
| FRB-08 | Crash with an unhandled 500 response when GitHub API or LLM is unavailable — always degrade gracefully |

---

## Exception Handlers

| ID | Trigger | Contracted Recovery |
|----|---------|---------------------|
| EXC-01 | GitHub API returns 404 for username | Return HTTP 404 with user-facing error message; do not attempt LLM call |
| EXC-02 | GitHub API rate limit (429 or 403 + rate limit headers) | Return HTTP 429 with `Retry-After` header; do not cache the error response |
| EXC-03 | GitHub API connection timeout | Return HTTP 502; do not cache; log error with request context |
| EXC-04 | LLM returns invalid JSON or unparseable response | Omit all AI fields; set `ai_unavailable: true`; return raw GitHub data |
| EXC-05 | LLM call times out | Same as EXC-04 |
| EXC-06 | Job match score from LLM is outside [0, 100] | Clamp to nearest bound (0 or 100); log anomaly; return clamped value |
| EXC-07 | Redis unavailable on cache read | Treat as cache miss; proceed with live generation; log warning |
| EXC-08 | Redis unavailable on cache write | Log warning; return generated profile to client; do not retry write in request lifecycle |
| EXC-09 | LLM JSON parsing fails for one field only (e.g., archetype) | Omit that field specifically; return all other AI fields that parsed successfully |
