from __future__ import annotations

import os
import re
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

import httpx
from bs4 import BeautifulSoup
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.ai_analyst import AIAnalyst
from app.errors import (
    AIUnavailableError,
    GitHubRateLimitError,
    GitHubUnavailableError,
    GitHubUserNotFoundError,
    JobURLFetchError,
)
from app.github_gateway import GitHubGateway
from app.models import JobMatchRequest, JobMatchResult, Profile
from app.orchestrator import ProfileOrchestrator
from app.profile_store import ProfileStore

# ---------------------------------------------------------------------------
# Startup / lifespan
# ---------------------------------------------------------------------------

_orchestrator: ProfileOrchestrator | None = None
_store_redis: Any = None  # held so health endpoint can ping it


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global _orchestrator, _store_redis

    github_token = os.environ["GITHUB_TOKEN"]
    openai_key = os.environ["OPENAI_API_KEY"]
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")

    gateway = GitHubGateway(token=github_token)
    analyst = AIAnalyst(api_key=openai_key)
    store = ProfileStore(redis_url=redis_url)

    _store_redis = store._redis
    _orchestrator = ProfileOrchestrator(gateway=gateway, analyst=analyst, store=store)

    yield

    await gateway._client.aclose()


app = FastAPI(title="Gitread API", lifespan=lifespan)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_cors_origins_raw = os.environ.get("CORS_ORIGINS", "*")
_cors_origins = (
    ["*"]
    if _cors_origins_raw == "*"
    else [o.strip() for o in _cors_origins_raw.split(",")]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

USERNAME_RE = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,37}[a-zA-Z0-9])?$")


def validate_username(username: str) -> str:
    if not USERNAME_RE.fullmatch(username):
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_USERNAME", "message": "Invalid GitHub username format"},
        )
    return username.lower()


def get_orchestrator() -> ProfileOrchestrator:
    if _orchestrator is None:  # pragma: no cover
        raise RuntimeError("Orchestrator not initialised")
    return _orchestrator


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/api/v1/profile/{username}", response_model=None)
async def get_profile(
    username: str = Depends(validate_username),
    orchestrator: ProfileOrchestrator = Depends(get_orchestrator),
) -> Response:
    try:
        profile = await orchestrator.generate_profile(username)
    except GitHubUserNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "GITHUB_USER_NOT_FOUND", "message": f"GitHub user '{username}' not found"},
        )
    except GitHubRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail={"code": "GITHUB_RATE_LIMIT", "message": "GitHub rate limit exceeded"},
            headers={"Retry-After": str(exc.reset_at)},
        )
    except GitHubUnavailableError:
        raise HTTPException(
            status_code=502,
            detail={"code": "GITHUB_UNAVAILABLE", "message": "GitHub API is unavailable"},
        )
    return Response(
        content=profile.model_dump_json(),
        media_type="application/json",
    )


@app.post("/api/v1/profile/{username}/job-match", response_model=None)
async def job_match(
    body: JobMatchRequest,
    username: str = Depends(validate_username),
    orchestrator: ProfileOrchestrator = Depends(get_orchestrator),
) -> Response:
    if body.job_text is None and body.job_url is None:
        raise HTTPException(
            status_code=422,
            detail={"code": "MISSING_JOB_INPUT", "message": "Provide job_text or job_url"},
        )

    job_text = body.job_text

    if body.job_url is not None:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(body.job_url, timeout=5.0, follow_redirects=True)
                resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            job_text = soup.get_text(separator=" ", strip=True)
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail={"code": "JOB_URL_FETCH_ERROR", "message": f"Could not fetch job URL: {exc}"},
            ) from exc

    if not job_text:
        raise HTTPException(
            status_code=422,
            detail={"code": "MISSING_JOB_INPUT", "message": "job_text is empty after URL extraction"},
        )

    if len(job_text) > 10_000:
        raise HTTPException(
            status_code=422,
            detail={"code": "JOB_TEXT_TOO_LONG", "message": "job_text exceeds 10,000 characters"},
        )

    try:
        result = await orchestrator.score_job_match(username, job_text)
    except AIUnavailableError:
        raise HTTPException(
            status_code=503,
            detail={"code": "AI_UNAVAILABLE", "message": "AI service is currently unavailable"},
        )
    except (GitHubUserNotFoundError, GitHubRateLimitError, GitHubUnavailableError) as exc:
        # Profile not cached — gateway errors can surface here
        if isinstance(exc, GitHubUserNotFoundError):
            raise HTTPException(status_code=404, detail={"code": "GITHUB_USER_NOT_FOUND", "message": str(exc)})
        if isinstance(exc, GitHubRateLimitError):
            raise HTTPException(status_code=429, detail={"code": "GITHUB_RATE_LIMIT"}, headers={"Retry-After": str(exc.reset_at)})
        raise HTTPException(status_code=502, detail={"code": "GITHUB_UNAVAILABLE"})

    return Response(
        content=result.model_dump_json(),
        media_type="application/json",
    )


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    redis_status = "unavailable"
    if _store_redis is not None:
        try:
            await _store_redis.ping()
            redis_status = "ok"
        except Exception:
            redis_status = "unavailable"

    overall = "ok" if redis_status == "ok" else "degraded"
    return {"status": overall, "redis": redis_status}
