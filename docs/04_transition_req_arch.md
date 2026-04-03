# Gitread — Transition: Requirements to Architecture
Version: v1.0, 2026-04-03

---

## Method

Every invariant from `03_design_contract_invariant.md` must be assigned to exactly one component owner — not a library, not a framework feature, but a conceptual responsibility boundary. If a failure occurs, the owning component is where an engineer looks first.

The rule: each invariant has one owner. If two components both enforce an invariant, that is duplication that will drift. If no component owns it, it will be violated.

---

## Component Definitions

**GitHubGateway**
Responsible for all outbound communication with the GitHub REST API v3. It handles pagination, authentication headers, rate limit detection, and network error handling. It returns a structured, normalised data model of the user's public activity to callers. It has no knowledge of caching, LLM, or HTTP routing.

**AIAnalyst**
Responsible for all LLM orchestration. It constructs prompts from structured GitHub data, calls OpenAI GPT-4o-mini, parses and validates the structured JSON response, enforces content grounding rules, and handles LLM failures. It returns typed AI-generated objects (profile card, archetype, repo descriptions, skill progression, suggested project, job match). It has no knowledge of caching, GitHub API, or HTTP routing.

**ProfileOrchestrator**
Responsible for coordinating the end-to-end profile generation pipeline: checking the cache, calling GitHubGateway, calling AIAnalyst, composing the final profile object, writing to cache. It is the only component that calls both GitHubGateway and AIAnalyst, and the only component that touches the cache. It owns pipeline-level guarantees (graceful degradation, partial profile assembly).

**ProfileStore**
Responsible for all Redis interactions — cache reads, cache writes, TTL enforcement. It encapsulates the cache key scheme and serialisation format. ProfileOrchestrator calls ProfileStore; ProfileStore knows nothing about GitHub data or AI.

**ProfileAPI**
Responsible for FastAPI HTTP routing, request validation, response serialisation, and HTTP error mapping. It calls ProfileOrchestrator for profile generation and job match analysis. It is the sole interface between the internet and the backend domain logic. It enforces input validation (username format, score bounds in responses).

---

## Invariant Assignments

### GitHubGateway (owns: INV-01, INV-03)

**INV-01 — GitHub Data Integrity**
GitHubGateway is the only component that touches the GitHub API. If data integrity fails (wrong values, mixed usernames), it is because GitHubGateway fetched the wrong data or mapped it incorrectly. The fix lives here.

**INV-03 — Fork Exclusion**
GitHubGateway is responsible for filtering out forked repositories before returning any data to its callers. No other component should need to check `is_fork`. If a fork appears in an analysis, it means GitHubGateway failed to filter it.

### AIAnalyst (owns: INV-02, INV-06, INV-07, INV-09)

**INV-02 — AI Content Grounding**
AIAnalyst is the only component that calls the LLM and receives its output. It constructs the prompt with the actual GitHub data and validates that the response references only entities present in the input. If the LLM fabricates a repository, AIAnalyst is the component that should catch and reject it.

**INV-06 — Score Bounds**
AIAnalyst parses the job match score from the LLM response. It is responsible for validating and clamping the score to [0, 100] before returning it. ProfileAPI never receives an out-of-bounds score because AIAnalyst prevents it.

**INV-07 — Structured Output Enforcement**
AIAnalyst requires structured JSON output from the LLM (OpenAI structured outputs). If parsing fails for any field, AIAnalyst sets the affected field to null/absent and signals `ai_unavailable`. It never passes raw LLM text to its callers.

**INV-09 — Language Weighting**
The star-weighted language distribution calculation happens in AIAnalyst's data preparation step (before the LLM prompt is constructed) and in GitHubGateway's data normalisation. The invariant is jointly owned by GitHubGateway (who produces the raw `stars + language` data) and AIAnalyst (who builds the weighted chart data for both the UI and the prompt). **GitHubGateway owns the data accuracy; AIAnalyst owns the weighting computation.**

### ProfileOrchestrator (owns: INV-08, INV-10)

**INV-08 — Partial Profile on AI Failure**
ProfileOrchestrator assembles the final profile from GitHubGateway output and AIAnalyst output. When AIAnalyst returns an error or partial result, ProfileOrchestrator MUST still assemble and return a profile from whatever data is available. It is the only component with the full picture — neither GitHubGateway nor AIAnalyst knows what the final profile looks like.

**INV-10 — Top Repo Ranking**
ProfileOrchestrator applies the composite stars + recency ranking to the repo list from GitHubGateway before selecting the top 5. This is a data transformation step, not a GitHub API concern or an AI concern.

### ProfileStore (owns: INV-04, INV-05)

**INV-04 — TTL Enforcement**
ProfileStore controls all Redis read/write operations and is solely responsible for setting TTL=3600 on writes and checking TTL validity on reads. If a stale profile is served, it means ProfileStore failed to enforce the TTL.

**INV-05 — Cache Key Isolation**
ProfileStore owns the key scheme (`profile:{username_lowercase}`). It is the only component that knows how cache keys are constructed. No other component accesses Redis directly.

### ProfileAPI (owns: INV-11)

**INV-11 — No Authentication Gate**
ProfileAPI defines the routing and middleware for `/u/{username}`. It is the component that would, if misconfigured, add an auth middleware to this route. It owns the guarantee that this path remains public. If a user is ever asked to log in to view a profile, ProfileAPI added the guard.

---

## Invariant Coverage Table

| Invariant | Owner | Enforcement Point |
|-----------|-------|------------------|
| INV-01 Data integrity | GitHubGateway | Correct API call scoped to queried username; no cross-user state |
| INV-02 AI grounding | AIAnalyst | Prompt construction + response validation against input data |
| INV-03 Fork exclusion | GitHubGateway | `is_fork == false` filter applied before returning repo list |
| INV-04 TTL enforcement | ProfileStore | TTL=3600 on write; TTL check on read before serving |
| INV-05 Cache key isolation | ProfileStore | Key scheme: `profile:{username_lowercase}` — no shared keys |
| INV-06 Score bounds | AIAnalyst | Parse + clamp job match score to [0, 100] before return |
| INV-07 Structured output | AIAnalyst | OpenAI structured output mode; JSON parse with field-level fallback |
| INV-08 Partial profile | ProfileOrchestrator | Assemble profile from available data regardless of AI status |
| INV-09 Language weighting | GitHubGateway (data) + AIAnalyst (computation) | stars × bytes weighting applied in data prep |
| INV-10 Top repo ranking | ProfileOrchestrator | Composite sort (stars + recency) applied before top-5 selection |
| INV-11 No auth gate | ProfileAPI | `/u/{username}` route has no auth middleware |

---

## Coupling & Cohesion Decisions

**Why GitHubGateway is separate from ProfileOrchestrator**
GitHub data fetching is an external I/O operation with distinct failure modes (rate limiting, network errors, 404s). Isolating it allows ProfileOrchestrator to handle these failures at the boundary without mixing I/O error handling with pipeline logic. It also makes testing easier: ProfileOrchestrator can be tested with a mock gateway.

**Why AIAnalyst is separate from ProfileOrchestrator**
LLM orchestration has its own failure modes (timeouts, malformed output, content grounding failures) that are distinct from pipeline coordination. Keeping AIAnalyst as a separate unit means its prompt construction and output validation logic can be changed independently. ProfileOrchestrator does not need to understand prompt engineering.

**Why ProfileStore is separate from ProfileOrchestrator**
Redis interaction (serialisation format, key scheme, TTL logic) is a distinct concern. ProfileOrchestrator should not need to know how profiles are serialised or what the key format is. If the cache backend changes (e.g., from Redis to Memcached), only ProfileStore changes.

**Why job match analysis is a separate flow through ProfileOrchestrator**
Job match analysis reuses the existing profile data (already in cache) and passes it with the job description to AIAnalyst. It does not require a new GitHub fetch. ProfileOrchestrator handles this as a second entry point: `generate_profile(username)` vs `score_job_match(username, job_text)`. This keeps the pipeline boundary clean without duplicating orchestration logic.
