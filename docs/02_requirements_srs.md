# Gitread — Software Requirements Specification
Version: v1.0, 2026-04-03

---

## Normative Vocabulary

- **MUST / REQUIRED**: Absolute requirement. The system fails if not met.
- **MUST NOT**: Absolute prohibition. The system is broken if this is violated.
- **SHOULD**: Strongly recommended. Deviation is permitted only with documented justification.
- **MAY**: Optional capability.

---

## Actors

| Actor | Description |
|-------|-------------|
| Visitor | Any user navigating to gitread.dev — unauthenticated |
| Developer | A visitor who enters a GitHub username to generate or view a profile |
| Recruiter | A visitor who views a shared profile link and optionally pastes a job description |
| GitHubAPI | External GitHub REST API v3 — data source for all profile content |
| LLM | OpenAI GPT-4o-mini — generates all AI-authored profile content |
| Cache | Redis instance — stores generated profiles with TTL |

---

## Functional Requirements

### FR-010: Profile Request & Input
- **FR-011**: The system MUST accept a GitHub username as the sole required input to begin profile generation.
- **FR-012**: The system MUST validate that the username is non-empty and matches GitHub's username format (1–39 alphanumeric characters and hyphens, no leading/trailing hyphens).
- **FR-013**: The system MUST return a clear error message if the GitHub username does not correspond to an existing public account.
- **FR-014**: The system MUST check the cache before initiating a GitHub API fetch. If a valid cached profile exists, it MUST return the cached result.
- **FR-015**: The system MUST expose a public profile URL at the path `/u/{username}` for every successfully generated profile.

### FR-020: GitHub Data Fetching
- **FR-021**: The system MUST fetch the following data for the target username via the GitHub REST API v3: public repositories (all non-fork repos), commit counts per repository, primary language per repository, star and fork counts per repository, account creation date.
- **FR-022**: The system MUST derive the 90-day commit frequency by aggregating commit timestamps across all non-fork repositories.
- **FR-023**: The system MUST compute language distribution weighted by star count: a language used in a 10-star repo counts more than the same language in a 0-star repo.
- **FR-024**: The system MUST handle GitHub API pagination and retrieve the full repository list, not just the first page.
- **FR-025**: The system MUST handle GitHub API rate limit responses (HTTP 429 / 403 with rate limit headers) by returning an informative error to the client rather than crashing.
- **FR-026**: All GitHub API requests SHOULD be made with an authenticated token to access higher rate limits.

### FR-030: AI Profile Generation
- **FR-031**: The system MUST pass the structured GitHub data (repos, languages, stars, activity, account age) to the LLM to generate an AI profile card containing: a job title/role label, a 2–3 sentence professional bio, and 3–5 named key strengths grounded in the visible stack and activity.
- **FR-032**: The system MUST generate exactly one developer archetype label per profile (e.g., "The Fullstack Shipper", "The CLI Craftsman", "The Open Source Contributor"). The archetype MUST be grounded in the actual activity pattern — not generic.
- **FR-033**: The system MUST generate an AI one-line description for each of the top 5 repos. Descriptions MUST reference the repo's actual language and apparent purpose.
- **FR-034**: The system MUST generate a skill progression assessment based on language and framework usage across the last 6 months of commits, identifying whether the developer is actively investing in their primary stack.
- **FR-035**: The system MUST generate exactly one suggested next project recommendation. The recommendation MUST identify a visible gap in the developer's stack or portfolio, not a repetition of existing work.
- **FR-036**: All LLM output MUST be requested in structured JSON format. The system MUST NOT pass raw freeform LLM text to the frontend.
- **FR-037**: If the LLM call fails or times out, the system MUST return a partial profile containing all raw GitHub data with AI fields omitted and a `ai_unavailable: true` flag.

### FR-040: Caching
- **FR-041**: The system MUST store generated profiles in Redis with a TTL of exactly 3600 seconds (1 hour).
- **FR-042**: The system MUST use the GitHub username (lowercased) as the cache key.
- **FR-043**: The system MUST NOT serve a cached profile after its TTL has expired.
- **FR-044**: Cache misses MUST trigger a full profile generation pipeline (GitHub fetch + LLM analysis).

### FR-050: Job Description Match
- **FR-051**: The system MUST accept a job description as plain text input on an existing profile page.
- **FR-052**: The system MUST accept a job URL as an alternative input and fetch the page content to extract the job description text before analysis.
- **FR-053**: The system MUST return a match score as an integer in the range [0, 100].
- **FR-054**: The system MUST return a list of skills the developer demonstrably has that match the job description.
- **FR-055**: The system MUST return a list of skills or experience areas mentioned in the job description that are not evident in the developer's GitHub activity.
- **FR-056**: The system MUST return one recommended project to build to close the most significant gap identified.
- **FR-057**: Job match analysis MUST use the developer's existing profile data — it MUST NOT re-fetch GitHub data.

### FR-060: Public Shareable Links
- **FR-061**: Profile pages at `/u/{username}` MUST be accessible without authentication.
- **FR-062**: Profile pages MUST render complete content (not a loading skeleton) in server-side rendering where possible, to support link previews (Open Graph).
- **FR-063**: Each profile page SHOULD include Open Graph meta tags (og:title, og:description) populated with the AI-generated profile card content.

---

## Business Rules

| ID | Rule |
|----|------|
| BR-01 | Only public GitHub data is used. No OAuth, no private repo access. |
| BR-02 | The language breakdown chart uses star-weighted distribution, never raw repo count. |
| BR-03 | Top repos are ranked by a composite of stars and recency — not solely by stars. |
| BR-04 | Fork repositories are excluded from all analysis (language chart, activity, top repos, archetype). |
| BR-05 | Job match scores are always integers. Floating-point scores MUST be rounded before returning. |
| BR-06 | The cache TTL is fixed at 1 hour. It MUST NOT be configurable per-request. |

---

## Non-Functional Constraints

### Performance
- End-to-end profile generation (GitHub fetch + LLM + cache write): MUST complete in ≤ 15 seconds for a typical account (≤ 100 public repos)
- Cached profile retrieval: MUST return in ≤ 500ms
- Job match scoring: MUST return in ≤ 10 seconds
- Frontend LCP (Largest Contentful Paint): SHOULD be ≤ 3 seconds on a 4G connection
- GitHub API fetch: SHOULD complete in ≤ 5 seconds for accounts with ≤ 100 repos

### Availability
- The system SHOULD target 99% uptime during normal operation
- GitHub API or LLM outages MUST degrade gracefully (partial profile returned, never a 500 with no body)

### Security
- All transport MUST use HTTPS with TLS 1.2+
- GitHub API tokens MUST be stored as environment variables and MUST NOT be committed to source control or returned in any API response
- OpenAI API keys MUST be stored as environment variables and MUST NOT be logged or returned in any response
- No user-submitted data (usernames, job descriptions) is persisted beyond the current request (except as part of a cached profile keyed to a username)

### Data Privacy
- The system MUST NOT store job description text beyond the duration of the analysis request
- The system MUST NOT associate job descriptions with usernames in any persistent store
- All data fetched is publicly available GitHub data — no PII collection beyond the GitHub username used as a lookup key

### Scalability
- The system MUST handle concurrent profile generation requests for different usernames without shared-state conflicts
- Redis cache MUST be the sole shared state between request lifecycles

### Portability
- The backend MUST run inside Docker Compose for local development with no host-level dependencies beyond Docker
- The backend MUST be deployable to Render (free tier) with environment variable configuration only

---

## Error Cases

| ID | Trigger | Required Behaviour |
|----|---------|-------------------|
| ERR-011 | GitHub username not found (404 from GitHub API) | Return HTTP 404 with `{"error": "GitHub user not found"}` |
| ERR-012 | Invalid username format (client-side or server-side) | Return HTTP 422 with `{"error": "Invalid username format"}` |
| ERR-025 | GitHub API rate limit exceeded | Return HTTP 429 with `{"error": "GitHub rate limit exceeded. Try again in X seconds."}` and `Retry-After` header |
| ERR-026 | GitHub API unreachable (timeout or connection error) | Return HTTP 502 with `{"error": "GitHub API unavailable"}` |
| ERR-037 | LLM call fails or times out | Return HTTP 200 with partial profile and `"ai_unavailable": true` — never HTTP 500 |
| ERR-044 | Redis cache unavailable | Log warning, proceed with live generation — MUST NOT return an error to the client |
| ERR-052 | Job URL fetch fails | Return HTTP 422 with `{"error": "Could not fetch job description from URL"}` |
