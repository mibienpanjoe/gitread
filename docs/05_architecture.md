# Gitread — System Architecture
Version: v1.0, 2026-04-03

---

## Architectural Style

**Modular monolith (backend) + standalone frontend.**

The backend is a single Python/FastAPI process with 4 clearly bounded internal modules (GitHubGateway, AIAnalyst, ProfileOrchestrator, ProfileStore), deployed as one unit on Render. The frontend is a separate Next.js 16 application deployed on Vercel.

Chosen over microservices because:
- MVP scale does not justify distributed system complexity or inter-service networking overhead
- All backend modules share the same process and in-memory types — splitting them would add serialisation cost with no benefit at this scale
- Render's always-on free-tier process eliminates cold-start latency that would blow the 15-second profile generation SLA
- A monolith is easier to reason about when debugging LLM + cache + GitHub API interactions in sequence

Chosen over a serverless backend because:
- GitHub data fetching + LLM calls can approach 10–12 seconds — serverless cold starts on top of this would frequently exceed the 15-second SLA
- Redis connection pooling is better managed in a long-lived process

---

## Component Architecture

### GitHubGateway

**Responsibility:** All outbound GitHub REST API v3 calls. Returns a normalised `GitHubData` object.

**Owned invariants:** INV-01 (data integrity), INV-03 (fork exclusion)

**Inputs:** `username: str`
**Outputs:** `GitHubData` (typed dataclass with repos, commits, languages, stars, account_age)

**Key behaviours:**
1. Fetch all public repositories via `GET /users/{username}/repos?type=public&per_page=100` — paginate until exhausted
2. Filter out all repos where `fork == true` (INV-03)
3. For each non-fork repo, collect: name, description, language, stars, forks, pushed_at, created_at
4. Fetch commit count per repo (last 6 months) using the commits API with `since` parameter
5. Compute star-weighted language bytes: `{language: sum(bytes × max(stars, 1)) for repo in repos}`
6. Detect rate limit headers on every response; raise `RateLimitError` if hit
7. Set `Authorization: Bearer {GITHUB_TOKEN}` on all requests (from env var)

**Must NOT:** Cache anything; call the LLM; know about Redis; read from the profile object

---

### AIAnalyst

**Responsibility:** All LLM orchestration. Constructs prompts from structured data, calls GPT-4o-mini, validates and returns typed AI output.

**Owned invariants:** INV-02 (content grounding), INV-06 (score bounds), INV-07 (structured output enforcement)

**Inputs (profile generation):** `GitHubData`
**Inputs (job match):** `GitHubData`, `job_text: str`
**Outputs:** `AIProfile` (typed dataclass with card, archetype, repo_descriptions, skill_progression, suggested_project)
**Outputs (job match):** `JobMatchResult` (score, matched_skills, missing_skills, recommended_project)

**Key behaviours:**
1. Compute star-weighted language distribution from `GitHubData` (implements INV-09 computation)
2. Construct structured system prompt embedding top repos, language distribution, commit frequency, account age
3. Call OpenAI chat completions API with `response_format: {"type": "json_schema", ...}` (structured output mode)
4. Parse response against typed schema; if a field fails validation, set it to `null` (partial result, INV-07)
5. For job match: validate score is int in [0, 100]; clamp if necessary; log anomaly (INV-06)
6. If the LLM references a repo name not in `GitHubData.repos`, discard the reference (INV-02)
7. On timeout (>10s) or API error: return `AIProfile(available=False)` — never raise to caller

**Must NOT:** Access Redis; call GitHub API; know about HTTP routing; pass raw LLM text to callers

---

### ProfileOrchestrator

**Responsibility:** Coordinates the full profile generation and job match pipeline. The only component that calls both GitHubGateway and AIAnalyst.

**Owned invariants:** INV-08 (partial profile on AI failure), INV-10 (top repo ranking)

**Inputs (generate):** `username: str`
**Inputs (job match):** `username: str`, `job_text: str`
**Outputs:** `Profile` (complete or partial), `JobMatchResult`

**Key behaviours:**

*Profile generation flow:*
1. Call `ProfileStore.get(username)` — if hit, return immediately
2. Call `GitHubGateway.fetch(username)` — on failure, propagate HTTP error to ProfileAPI
3. Apply top-5 repo ranking: composite sort by `(stars × 0.6 + recency_score × 0.4)` where recency_score decays from 1.0 to 0.0 over 365 days since `pushed_at` (INV-10)
4. Call `AIAnalyst.generate_profile(github_data)` — on failure, `ai_profile = AIProfile(available=False)` (INV-08)
5. Assemble `Profile` from `github_data` + `ai_profile` (always succeeds — INV-08 guarantee)
6. Call `ProfileStore.set(username, profile)` — on failure, log and continue
7. Return assembled `Profile`

*Job match flow:*
1. Call `ProfileStore.get(username)` — if miss, call `generate_profile(username)` first
2. Call `AIAnalyst.score_job_match(github_data, job_text)`
3. Return `JobMatchResult`

**Must NOT:** Access Redis directly (must use ProfileStore); call GitHub API directly; know about HTTP routing

---

### ProfileStore

**Responsibility:** All Redis interactions. Encapsulates key scheme, serialisation, and TTL logic.

**Owned invariants:** INV-04 (TTL enforcement), INV-05 (cache key isolation)

**Inputs:** `username: str`, `profile: Profile` (on write)
**Outputs:** `Profile | None` (on read)

**Key behaviours:**
1. Key scheme: `profile:{username.lower()}` (INV-05)
2. On write: `SET profile:{username} {json_serialised_profile} EX 3600` (INV-04)
3. On read: `GET profile:{username}` — if `None` (expired or missing), return `None`
4. Serialise/deserialise using `Profile.model_dump_json()` / `Profile.model_validate_json()`
5. On Redis connection failure: log warning, return `None` (read) or silently skip (write) — never raise

**Must NOT:** Call GitHub API; call LLM; know about HTTP routing; cache anything other than profiles

---

### ProfileAPI

**Responsibility:** FastAPI HTTP routing, request validation, response serialisation, error mapping.

**Owned invariants:** INV-11 (no authentication gate on `/u/{username}`)

**Routes:** `GET /profile/{username}`, `POST /profile/{username}/job-match`

**Key behaviours:**
1. Validate `username` against regex `^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$` — return 422 on failure
2. Call `ProfileOrchestrator.generate_profile(username)` or `score_job_match(username, job_text)`
3. Map domain exceptions to HTTP status codes (see error table in SRS)
4. Serialise response using Pydantic models — no dict construction in route handlers
5. `/u/{username}` path on the frontend is a Next.js route — the backend exposes `/api/profile/{username}`

**Must NOT:** Contain domain logic; access Redis directly; call GitHub API or LLM directly

---

## Data Architecture

### Core Types

```
GitHubData
  username: str
  account_age_days: int
  total_public_repos: int
  total_stars: int
  total_forks: int
  repos: List[Repo]
  language_weighted: Dict[str, float]   # language → weighted score
  commit_frequency_90d: List[DayCount]  # [{date, count}] for 90 days

Repo
  name: str
  description: str | None
  language: str | None
  stars: int
  forks: int
  pushed_at: datetime
  created_at: datetime
  is_fork: bool                          # always False after GitHubGateway filter

AIProfile
  available: bool
  card: ProfileCard | None
  archetype: str | None
  repo_descriptions: Dict[str, str]     # repo_name → one-line description
  skill_progression: SkillProgression | None
  suggested_project: str | None

ProfileCard
  title: str
  bio: str
  strengths: List[str]                  # 3–5 items

SkillProgression
  primary_language: str
  trend: Literal["growing", "stable", "declining"]
  summary: str

Profile
  username: str
  generated_at: datetime
  github: GitHubData
  ai: AIProfile
  top_repos: List[Repo]                 # top 5, pre-ranked

JobMatchResult
  score: int                            # [0, 100]
  matched_skills: List[str]
  missing_skills: List[str]
  recommended_project: str
```

### Constraints
- `Repo.is_fork` is always `False` in any `Profile` — filtered by GitHubGateway before any downstream use
- `Profile.top_repos` always contains at most 5 entries
- `JobMatchResult.score` is always an integer in [0, 100] — enforced by AIAnalyst before ProfileOrchestrator receives it

---

## Flow Architecture

### Primary Flow: Profile Generation (Cache Miss)

```
Visitor → GET /api/profile/{username}
    │
    ▼
ProfileAPI.validate_username()          → HTTP 422 if invalid format
    │ (valid)
    ▼
ProfileOrchestrator.generate_profile()
    │
    ├─► ProfileStore.get(username)      → return cached Profile if hit  ─────────► HTTP 200
    │       ↓ (miss)
    ├─► GitHubGateway.fetch(username)   → HTTP 404/429/502 on GitHub errors ──────► HTTP 4xx/5xx
    │       ↓ (success)
    ├─► ProfileOrchestrator.rank_repos()                       ← INV-10
    │
    ├─► AIAnalyst.generate_profile(github_data)
    │       ↓ (success)           ↓ (failure / timeout)
    │   AIProfile(available=True)  AIProfile(available=False)  ← INV-08
    │
    ├─► ProfileOrchestrator.assemble(github_data, ai_profile)  ← always succeeds
    │
    ├─► ProfileStore.set(username, profile)                    ← fire, no block on failure
    │
    └─► HTTP 200 Profile JSON
```

**Latency budget:**
- ProfileStore.get: < 50ms
- GitHubGateway.fetch: < 5s
- AIAnalyst.generate_profile: < 8s
- Total (cache miss): < 15s target

### Secondary Flow: Profile Retrieval (Cache Hit)

```
Visitor → GET /api/profile/{username}
    ▼
ProfileAPI → ProfileOrchestrator → ProfileStore.get() → Cache hit
    ▼
HTTP 200 (< 500ms)
```

### Tertiary Flow: Job Match Analysis

```
Recruiter → POST /api/profile/{username}/job-match  {job_text: "..."}
    │
    ▼
ProfileAPI.validate_username() + validate job_text non-empty
    │
    ▼
ProfileOrchestrator.score_job_match(username, job_text)
    │
    ├─► ProfileStore.get(username) → if miss, run full generate_profile()
    │
    ├─► AIAnalyst.score_job_match(profile.github, job_text)
    │       ↓ (score validated and clamped to [0,100])     ← INV-06
    └─► HTTP 200 JobMatchResult JSON (< 10s total)
```

---

## Technology Mapping

| Component | Technology |
|-----------|------------|
| ProfileAPI | FastAPI (Python 3.11+), Pydantic v2 for request/response models |
| GitHubGateway | `httpx` async HTTP client |
| AIAnalyst | OpenAI Python SDK, GPT-4o-mini, structured output (JSON schema mode) |
| ProfileStore | `redis.asyncio` client |
| Background tasks | FastAPI `BackgroundTasks` (cache writes, if async) |
| Frontend framework | Next.js 16, App Router, TypeScript |
| Frontend state | React Query (TanStack Query) for server state + caching |
| Frontend charts | Recharts (donut chart, bar chart / heatmap) |
| Frontend styling | Tailwind CSS |

---

## Deployment Architecture

| Component | Platform | Notes |
|-----------|----------|-------|
| Backend (FastAPI) | Render free tier | Single always-on process; env vars via Render dashboard |
| Frontend (Next.js) | Vercel | Auto-deploy on push to `main` |
| Cache (Redis) | Redis Cloud free tier | Shared instance; backend connects via `REDIS_URL` env var |
| Local development | Docker Compose | `backend` + `redis` services; frontend runs `next dev` directly |
| CI | GitHub Actions | Lint (ruff, mypy, eslint) + deploy on push to `main` |

Environment variables required:
- `GITHUB_TOKEN` — GitHub personal access token (backend)
- `OPENAI_API_KEY` — OpenAI API key (backend)
- `REDIS_URL` — Redis connection string (backend)
- `NEXT_PUBLIC_API_URL` — Backend base URL (frontend build)

---

## Project Structure

```
gitread/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, routes (ProfileAPI)
│   │   ├── orchestrator.py          # ProfileOrchestrator
│   │   ├── github_gateway.py        # GitHubGateway
│   │   ├── ai_analyst.py            # AIAnalyst
│   │   ├── profile_store.py         # ProfileStore
│   │   ├── models.py                # Pydantic/dataclass types (GitHubData, Profile, etc.)
│   │   └── errors.py                # Domain exception classes
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Landing/search page
│   │   └── u/[username]/
│   │       └── page.tsx             # Profile page
│   ├── components/
│   │   ├── ProfileCard.tsx
│   │   ├── LanguageChart.tsx        # Recharts donut
│   │   ├── ActivityHeatmap.tsx      # Recharts bar chart
│   │   ├── TopRepos.tsx
│   │   ├── JobMatchPanel.tsx
│   │   └── StatsBar.tsx
│   ├── lib/
│   │   └── api.ts                   # React Query hooks + API client
│   └── tailwind.config.ts
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
└── docs/
    └── *.md
```

---

## Invariant Traceability Matrix

| Invariant | Component | Enforcement Mechanism |
|-----------|-----------|----------------------|
| INV-01 Data integrity | GitHubGateway | Scoped API call; no cross-username state |
| INV-02 AI grounding | AIAnalyst | Prompt includes only actual repo names; response validated against input |
| INV-03 Fork exclusion | GitHubGateway | `is_fork == True` repos filtered in `fetch()` before return |
| INV-04 TTL enforcement | ProfileStore | Redis `EX 3600` on set; `None` returned on expired key |
| INV-05 Cache key isolation | ProfileStore | Key = `profile:{username.lower()}` — unique per username |
| INV-06 Score bounds | AIAnalyst | Clamp + validate in `score_job_match()` before returning `JobMatchResult` |
| INV-07 Structured output | AIAnalyst | OpenAI structured output mode; field-level null on parse failure |
| INV-08 Partial profile | ProfileOrchestrator | `assemble()` called regardless of `ai_profile.available` |
| INV-09 Language weighting | GitHubGateway + AIAnalyst | `stars × bytes` computed in gateway; used in analyst prompt |
| INV-10 Top repo ranking | ProfileOrchestrator | Composite sort in `rank_repos()` before top-5 slice |
| INV-11 No auth gate | ProfileAPI | No auth middleware on `GET /api/profile/{username}` |

---

## Architectural Constraints & ADRs

**ADR-01: No LangChain**
OpenAI SDK is called directly. LangChain adds abstraction overhead that obscures prompt construction logic, makes debugging harder, and is unnecessary for a single-provider, single-model setup. If the LLM provider changes, AIAnalyst is the only file to update.

**ADR-02: Structured output over function calling**
OpenAI's JSON schema mode (`response_format: json_schema`) is used instead of function calling. For profile generation, we need the full response in one structured object — function calling is designed for agentic tool use, not single-shot structured output.

**ADR-03: Synchronous cache write**
Cache writes happen synchronously (blocking) at the end of `generate_profile()`, not as a background task. This adds ~50ms latency but ensures the cache is warm before the next request. The failure case (Redis down) is already handled by ProfileStore silently skipping the write.

**ADR-04: No database**
Gitread has no persistent database for MVP. All state is in Redis (1hr TTL). This eliminates schema migrations, ORMs, and infrastructure cost at the expense of long-term profile history — which is out of scope for MVP.

**ADR-05: Frontend fetches backend, does not proxy**
Next.js API routes are not used as a proxy to the FastAPI backend. The frontend calls the Render-hosted backend directly via `NEXT_PUBLIC_API_URL`. This keeps the data flow simple and avoids an extra network hop.
