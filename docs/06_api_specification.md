# Gitread — API Specification
Version: v1.0, 2026-04-03

---

## Conventions

**Base URL:** `https://api.gitread.dev/api/v1`
**Local Base URL:** `http://localhost:8000/api/v1`
**Content-Type:** `application/json` for all requests and responses
**Authentication:** None — all endpoints are public (read-only, no user accounts in MVP)
**Encoding:** UTF-8

**Error envelope (all 4xx/5xx responses):**
```json
{
  "error": {
    "code": "GITHUB_USER_NOT_FOUND",
    "message": "Human-readable description of the error"
  }
}
```

**Date format:** ISO 8601 strings (`2024-03-15T10:23:00Z`) for all datetime fields.

---

## Endpoint Groups

---

### Profile Endpoints

#### GET /api/v1/profile/{username}

Generate or retrieve the Gitread profile for a public GitHub username.

**Auth required:** No

**Path parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username. Must match `^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$` |

**Success — 200 OK:**
```json
{
  "username": "torvalds",
  "generated_at": "2026-04-03T12:00:00Z",
  "cached": true,
  "ai_available": true,
  "github": {
    "account_age_days": 5476,
    "total_public_repos": 8,
    "total_stars": 224000,
    "total_forks": 61000,
    "language_weighted": {
      "C": 0.82,
      "Shell": 0.11,
      "Perl": 0.07
    },
    "commit_frequency_90d": [
      { "date": "2026-01-04", "count": 3 },
      { "date": "2026-01-05", "count": 0 }
    ],
    "top_repos": [
      {
        "name": "linux",
        "description": "Linux kernel source tree",
        "language": "C",
        "stars": 224000,
        "forks": 61000,
        "pushed_at": "2026-04-02T18:00:00Z",
        "ai_description": "The official Linux kernel repository — one of the largest and most active open source projects in history."
      }
    ]
  },
  "ai": {
    "card": {
      "title": "Systems Programmer & OS Kernel Engineer",
      "bio": "Creator and principal maintainer of the Linux kernel with over 30 years of systems programming experience. Operates at the intersection of hardware and software, with unmatched depth in C and low-level kernel architecture.",
      "strengths": [
        "Linux kernel architecture and development",
        "Low-level systems programming in C",
        "Open source project leadership at massive scale"
      ]
    },
    "archetype": "The Systems Architect",
    "skill_progression": {
      "primary_language": "C",
      "trend": "stable",
      "summary": "Consistent C development over the past 6 months, with no sign of language diversification — deep specialisation rather than breadth."
    },
    "suggested_project": "A Rust-based userspace companion tool to a kernel subsystem — bridges the emerging Rust-in-kernel direction with a demonstrable systems project accessible to non-kernel contributors."
  }
}
```

**Note on `ai_available: false` response:**
When the LLM is unavailable, `ai_available` is `false` and the `ai` object contains null fields:
```json
{
  "ai_available": false,
  "ai": {
    "card": null,
    "archetype": null,
    "skill_progression": null,
    "suggested_project": null
  }
}
```
The `github` object is always fully populated when the response is HTTP 200.

**Errors:**
| Status | Code | Trigger |
|--------|------|---------|
| 422 | `INVALID_USERNAME` | Username fails format validation |
| 404 | `GITHUB_USER_NOT_FOUND` | GitHub API returns 404 for this username |
| 429 | `GITHUB_RATE_LIMIT` | GitHub API rate limit exceeded |
| 502 | `GITHUB_UNAVAILABLE` | GitHub API connection failed or timed out |

---

#### POST /api/v1/profile/{username}/job-match

Score a developer's Gitread profile against a job description and return a match analysis.

**Auth required:** No

**Path parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | GitHub username (same format validation as above) |

**Request body:**
```json
{
  "job_text": "string (required if job_url omitted) — plain text job description",
  "job_url": "string (required if job_text omitted) — URL to a job posting page"
}
```
At least one of `job_text` or `job_url` MUST be provided. If both are provided, `job_text` takes precedence.

**Request body constraints:**
- `job_text`: max 10,000 characters
- `job_url`: must be a valid HTTP/HTTPS URL; max 2,048 characters

**Success — 200 OK:**
```json
{
  "username": "torvalds",
  "score": 72,
  "matched_skills": [
    "C programming",
    "Linux systems programming",
    "Open source contribution",
    "Git version control"
  ],
  "missing_skills": [
    "Kubernetes / container orchestration",
    "Cloud provider APIs (AWS/GCP/Azure)",
    "Python scripting",
    "CI/CD pipeline configuration"
  ],
  "recommended_project": "Build a small Kubernetes operator in Go — demonstrates container orchestration understanding and Go proficiency, two visible gaps for this cloud infrastructure role."
}
```

**Errors:**
| Status | Code | Trigger |
|--------|------|---------|
| 422 | `INVALID_USERNAME` | Username fails format validation |
| 422 | `MISSING_JOB_INPUT` | Neither `job_text` nor `job_url` provided |
| 422 | `JOB_TEXT_TOO_LONG` | `job_text` exceeds 10,000 characters |
| 422 | `INVALID_JOB_URL` | `job_url` is not a valid HTTP/HTTPS URL |
| 422 | `JOB_URL_FETCH_FAILED` | URL was valid but page could not be fetched or contained no extractable text |
| 404 | `GITHUB_USER_NOT_FOUND` | Username not found (profile not cached; fresh fetch returns 404) |
| 429 | `GITHUB_RATE_LIMIT` | GitHub API rate limit hit while generating profile (first-time request only) |
| 502 | `GITHUB_UNAVAILABLE` | GitHub API unavailable during profile generation |
| 503 | `AI_UNAVAILABLE` | LLM unavailable and job match requires AI — cannot degrade gracefully here |

---

### System Endpoints

#### GET /api/v1/health

Health check endpoint for infrastructure monitoring and CI deploy verification.

**Auth required:** No

**Success — 200 OK:**
```json
{
  "status": "ok",
  "redis": "ok",
  "timestamp": "2026-04-03T12:00:00Z"
}
```

**Degraded — 200 OK (Redis unavailable, but service still functional):**
```json
{
  "status": "degraded",
  "redis": "unavailable",
  "timestamp": "2026-04-03T12:00:00Z"
}
```

Note: The health endpoint returns HTTP 200 even when Redis is unavailable, because the service continues to function (with live generation on every request). It returns HTTP 503 only if the FastAPI process itself cannot handle requests.

---

## Outbound API Calls

### GitHub REST API v3

**Base URL:** `https://api.github.com`
**Authentication:** `Authorization: Bearer {GITHUB_TOKEN}`
**Content-Type expected:** `application/vnd.github+json`

| Endpoint | Purpose | Retry policy |
|----------|---------|--------------|
| `GET /users/{username}` | Validate username exists; fetch account_created_at | 1 retry on 5xx, exponential backoff (1s, 2s) |
| `GET /users/{username}/repos?type=public&per_page=100` | Fetch public repos | 1 retry on 5xx; paginate until no `Link: next` header |
| `GET /repos/{username}/{repo}/commits?since={date}&per_page=1` | Get commit count (via `X-RateLimit` header trick or count endpoint) | 1 retry on 5xx |

Rate limit handling: on `X-RateLimit-Remaining: 0` or HTTP 429/403 with `X-RateLimit-Reset` header present, raise `RateLimitError` with reset timestamp. Do not retry.

### OpenAI API

**Model:** `gpt-4o-mini`
**Mode:** Chat completions with `response_format: {"type": "json_schema", "json_schema": {...}}`
**Timeout:** 10 seconds (hard timeout — treated as LLM failure per INV-08)

| Call | Purpose | Retry policy |
|------|---------|--------------|
| Profile generation | Generate card, archetype, repo descriptions, skill progression, suggested project | 0 retries — timeout is treated as graceful failure |
| Job match | Score profile against job description | 0 retries — 503 returned on failure |

---

## Type Reference

### Profile Object
```json
{
  "username": "string",
  "generated_at": "ISO 8601 datetime",
  "cached": "boolean",
  "ai_available": "boolean",
  "github": "GitHubData",
  "ai": "AIProfile"
}
```

### GitHubData Object
```json
{
  "account_age_days": "integer",
  "total_public_repos": "integer",
  "total_stars": "integer",
  "total_forks": "integer",
  "language_weighted": {
    "<language_name>": "float (0.0–1.0, sums to 1.0)"
  },
  "commit_frequency_90d": [
    { "date": "YYYY-MM-DD", "count": "integer" }
  ],
  "top_repos": ["Repo Object"]
}
```

### Repo Object
```json
{
  "name": "string",
  "description": "string | null",
  "language": "string | null",
  "stars": "integer",
  "forks": "integer",
  "pushed_at": "ISO 8601 datetime",
  "ai_description": "string | null"
}
```

### AIProfile Object
```json
{
  "card": {
    "title": "string | null",
    "bio": "string | null",
    "strengths": ["string"] 
  },
  "archetype": "string | null",
  "skill_progression": {
    "primary_language": "string | null",
    "trend": "\"growing\" | \"stable\" | \"declining\" | null",
    "summary": "string | null"
  },
  "suggested_project": "string | null"
}
```

### JobMatchResult Object
```json
{
  "username": "string",
  "score": "integer (0–100)",
  "matched_skills": ["string"],
  "missing_skills": ["string"],
  "recommended_project": "string"
}
```

### Error Object
```json
{
  "error": {
    "code": "string (SCREAMING_SNAKE_CASE)",
    "message": "string (human-readable)"
  }
}
```

---

## Endpoint Summary Table

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/profile/{username}` | Generate or retrieve full profile | None |
| POST | `/api/v1/profile/{username}/job-match` | Score profile against job description | None |
| GET | `/api/v1/health` | Service and Redis health check | None |
