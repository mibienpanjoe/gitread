<div align="center">

<img src="https://raw.githubusercontent.com/mibienpanjoe/gitread/main/docs/screenshot-landing.png" width="48%" alt="Gitread landing page" />
<img src="https://raw.githubusercontent.com/mibienpanjoe/gitread/main/docs/screenshot-profile.png" width="48%" alt="Gitread profile page" />

<br/><br/>

# gitread

**Your GitHub, read back to you.**

Paste any GitHub username. Get a structured, recruiter-ready developer profile — language charts, activity heatmaps, skill analysis, and job-match scoring — all powered by real commit data and AI.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![OpenAI](https://img.shields.io/badge/AI-GPT--4o--mini-412991?style=flat-square&logo=openai)](https://openai.com)
[![Redis](https://img.shields.io/badge/Cache-Redis-DC382D?style=flat-square&logo=redis)](https://redis.io)

</div>

---

## What it does

Gitread fetches a developer's public GitHub data, runs it through an AI analyst, and renders a clean profile page with:

| Feature | Details |
|---|---|
| **AI profile card** | Name, archetype, bio, and top strengths extracted from repo data |
| **Language breakdown** | Star-weighted donut chart — languages you actually *ship*, not just toy projects |
| **90-day commit heatmap** | GitHub-style calendar grid showing recent activity intensity |
| **Top repositories** | Stars, forks, last-active timestamp, AI-enhanced descriptions |
| **Language trend** | Primary language + trend direction (growing / stable / declining) |
| **Suggested next project** | Concrete project idea that builds on your skills — never replicates something you've already built |
| **Job match scoring** | Paste a job description (or a URL) — get a 0–100 match score, matched/missing skills, and a recommended project to close the gap |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 15 (Vercel)          FastAPI (Render)           │
│                                                          │
│  /                ──────────────────────────────────►   │
│  /u/{username}    GET /api/v1/profile/{username}         │
│                   POST /api/v1/profile/{username}/       │
│                        job-match                         │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       GitHubGateway              AIAnalyst
       (REST API calls,           (OpenAI GPT-4o-mini,
        fork filtering,            structured JSON output,
        star-weighted langs)       score clamping [0,100])
              │                         │
              └────────────┬────────────┘
                           │
                   ProfileOrchestrator
                           │
                     ProfileStore
                    (Redis, 1hr TTL)
```

**Backend components** — each owns strict invariants:

| Component | File | Responsibility |
|---|---|---|
| `GitHubGateway` | `github_gateway.py` | All GitHub REST calls, fork filtering, star-weighted language computation |
| `AIAnalyst` | `ai_analyst.py` | All OpenAI calls, prompt construction, JSON schema output |
| `ProfileOrchestrator` | `orchestrator.py` | Pipeline coordination — calls Gateway and Analyst, never leaks AI failures |
| `ProfileStore` | `profile_store.py` | Redis get/set, 1hr TTL, silent error swallowing |
| `ProfileAPI` | `main.py` | FastAPI routes, input validation, HTTP error mapping |

**Key invariants:**
- Fork repos are excluded everywhere — filtered in `GitHubGateway`, never re-checked downstream
- AI failure is non-fatal for profile generation — returns a partial profile (`ai_available: false`)
- AI failure *is* fatal for job match — raises `503 AI_UNAVAILABLE` (no fallback acceptable)
- Cache writes never raise — Redis errors are logged and swallowed silently

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React, Tailwind CSS, Recharts, TanStack Query |
| Backend | Python 3.11, FastAPI, httpx, Pydantic v2 |
| AI | OpenAI GPT-4o-mini (structured JSON output) |
| Cache | Redis Cloud (1hr TTL per profile) |
| Deploy | Frontend → Vercel · Backend → Render · Redis → Redis Cloud |

---

## Local development

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- A GitHub token, OpenAI API key, and a Redis URL

### 1. Clone and configure

```bash
git clone https://github.com/mibienpanjoe/gitread.git
cd gitread
```

Create `backend/.env`:

```env
GITHUB_TOKEN=ghp_...
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Start the backend

```bash
docker compose up
```

This starts the FastAPI backend on `:8000` and Redis on `:6379`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

### 4. Verify

```bash
curl http://localhost:8000/api/v1/health
# {"status":"ok","redis":"ok"}
```

---

## API

```
GET  /api/v1/profile/{username}
     → 200 Profile JSON
     → 404 GITHUB_USER_NOT_FOUND
     → 422 INVALID_USERNAME
     → 429 GITHUB_RATE_LIMIT
     → 502 GITHUB_UNAVAILABLE

POST /api/v1/profile/{username}/job-match
     Body: { "job_text": "..." } | { "job_url": "https://..." }
     → 200 JobMatchResult JSON
     → 503 AI_UNAVAILABLE

GET  /api/v1/health
     → {"status": "ok"|"degraded", "redis": "ok"|"unavailable"}
```

---

## Running tests

```bash
# Backend (from /backend)
pytest

# Frontend lint + type-check (from /frontend)
npm run lint
```

---

## Project structure

```
gitread/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI routes
│   │   ├── orchestrator.py    # Pipeline coordinator
│   │   ├── github_gateway.py  # GitHub API client
│   │   ├── ai_analyst.py      # OpenAI integration
│   │   ├── profile_store.py   # Redis cache
│   │   ├── models.py          # Pydantic models
│   │   └── errors.py          # Domain exceptions
│   └── tests/
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   └── u/[username]/      # Profile page
│   ├── components/            # UI components
│   └── lib/                   # API client, React Query hooks
├── docs/                      # Engineering specs
└── docker-compose.yml
```

---

## Commit conventions

All commits follow [Conventional Commits](https://www.conventionalcommits.org/) directly to `main`.

Valid scopes: `scaffold` · `models` · `github-gateway` · `profile-store` · `ai-analyst` · `orchestrator` · `api` · `frontend` · `charts` · `job-match` · `deploy` · `ci`

---

<div align="center">
  <sub>Built with Claude Code</sub>
</div>
