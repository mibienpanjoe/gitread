"""Tests for ProfileAPI routes.

Uses httpx.AsyncClient with ASGITransport to exercise the full FastAPI app
without a real network, Redis, or OpenAI.  The orchestrator and redis ping
are replaced with AsyncMock so the lifespan is bypassed via app.dependency_overrides.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.errors import (
    AIUnavailableError,
    GitHubRateLimitError,
    GitHubUnavailableError,
    GitHubUserNotFoundError,
)
from app.main import app, get_orchestrator
from app.models import (
    AIProfile,
    DayCount,
    GitHubData,
    JobMatchResult,
    Profile,
    TopRepo,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_profile(username: str = "octocat") -> Profile:
    return Profile(
        username=username,
        generated_at=datetime(2024, 6, 15, tzinfo=timezone.utc),
        cached=False,
        ai_available=True,
        github=GitHubData(
            username=username,
            account_age_days=730,
            total_public_repos=5,
            total_stars=100,
            total_forks=10,
            language_weighted={"Python": 1.0},
            commit_frequency_90d=[DayCount(date=datetime(2024, 6, 1).date(), count=3)],
            repos=[],
        ),
        ai=AIProfile(available=True),
        top_repos=[],
    )


def _make_job_result(username: str = "octocat") -> JobMatchResult:
    return JobMatchResult(
        username=username,
        score=75,
        matched_skills=["Python"],
        missing_skills=["Go"],
        recommended_project="Build a Go service.",
    )


def _mock_orchestrator(
    *,
    profile: Profile | None = None,
    job_result: JobMatchResult | None = None,
    profile_raises: Exception | None = None,
    job_raises: Exception | None = None,
) -> MagicMock:
    orch = MagicMock()
    if profile_raises:
        orch.generate_profile = AsyncMock(side_effect=profile_raises)
    else:
        orch.generate_profile = AsyncMock(return_value=profile or _make_profile())
    if job_raises:
        orch.score_job_match = AsyncMock(side_effect=job_raises)
    else:
        orch.score_job_match = AsyncMock(return_value=job_result or _make_job_result())
    return orch


@pytest.fixture(autouse=True)
def override_orchestrator() -> None:
    """Default: inject a happy-path orchestrator for every test."""
    app.dependency_overrides[get_orchestrator] = lambda: _mock_orchestrator()
    yield
    app.dependency_overrides.clear()


def _set_orchestrator(orch: MagicMock) -> None:
    app.dependency_overrides[get_orchestrator] = lambda: orch


# All tests use the synchronous TestClient for simplicity (FastAPI supports it
# even for async routes, and avoids asyncio fixture complexity).
@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# GET /api/v1/profile/{username}
# ---------------------------------------------------------------------------


class TestGetProfile:
    def test_valid_username_returns_200(self, client: TestClient) -> None:
        resp = client.get("/api/v1/profile/octocat")
        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == "octocat"

    def test_response_contains_github_data(self, client: TestClient) -> None:
        resp = client.get("/api/v1/profile/octocat")
        body = resp.json()
        assert "github" in body
        assert body["github"]["total_stars"] == 100

    def test_invalid_username_format_returns_422(self, client: TestClient) -> None:
        resp = client.get("/api/v1/profile/!!invalid!!")
        assert resp.status_code == 422
        assert resp.json()["detail"]["code"] == "INVALID_USERNAME"

    def test_username_with_leading_hyphen_returns_422(self, client: TestClient) -> None:
        resp = client.get("/api/v1/profile/-bad")
        assert resp.status_code == 422

    def test_github_404_returns_404(self, client: TestClient) -> None:
        _set_orchestrator(
            _mock_orchestrator(profile_raises=GitHubUserNotFoundError("ghost"))
        )
        resp = client.get("/api/v1/profile/ghost")
        assert resp.status_code == 404
        assert resp.json()["detail"]["code"] == "GITHUB_USER_NOT_FOUND"

    def test_github_rate_limit_returns_429_with_retry_after(
        self, client: TestClient
    ) -> None:
        _set_orchestrator(
            _mock_orchestrator(profile_raises=GitHubRateLimitError(1700000000))
        )
        resp = client.get("/api/v1/profile/octocat")
        assert resp.status_code == 429
        assert resp.json()["detail"]["code"] == "GITHUB_RATE_LIMIT"
        assert resp.headers["retry-after"] == "1700000000"

    def test_github_unavailable_returns_502(self, client: TestClient) -> None:
        _set_orchestrator(
            _mock_orchestrator(profile_raises=GitHubUnavailableError("timeout"))
        )
        resp = client.get("/api/v1/profile/octocat")
        assert resp.status_code == 502
        assert resp.json()["detail"]["code"] == "GITHUB_UNAVAILABLE"


# ---------------------------------------------------------------------------
# POST /api/v1/profile/{username}/job-match
# ---------------------------------------------------------------------------


class TestJobMatch:
    def test_job_text_returns_200_with_score(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/profile/octocat/job-match",
            json={"job_text": "Looking for a Python developer."},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["score"] == 75
        assert body["username"] == "octocat"

    def test_missing_both_fields_returns_422(self, client: TestClient) -> None:
        resp = client.post("/api/v1/profile/octocat/job-match", json={})
        assert resp.status_code == 422
        assert resp.json()["detail"]["code"] == "MISSING_JOB_INPUT"

    def test_job_text_too_long_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/profile/octocat/job-match",
            json={"job_text": "x" * 10_001},
        )
        assert resp.status_code == 422
        assert resp.json()["detail"]["code"] == "JOB_TEXT_TOO_LONG"

    def test_job_text_exactly_10000_chars_is_accepted(
        self, client: TestClient
    ) -> None:
        resp = client.post(
            "/api/v1/profile/octocat/job-match",
            json={"job_text": "x" * 10_000},
        )
        assert resp.status_code == 200

    def test_ai_unavailable_returns_503(self, client: TestClient) -> None:
        _set_orchestrator(
            _mock_orchestrator(job_raises=AIUnavailableError("down"))
        )
        resp = client.post(
            "/api/v1/profile/octocat/job-match",
            json={"job_text": "Python engineer needed."},
        )
        assert resp.status_code == 503
        assert resp.json()["detail"]["code"] == "AI_UNAVAILABLE"

    def test_job_url_fetched_and_parsed(self, client: TestClient) -> None:
        html = "<html><body><p>We need a Python developer.</p></body></html>"
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()

        with patch("app.main.httpx.AsyncClient") as mock_client_cls:
            mock_async_client = AsyncMock()
            mock_async_client.__aenter__ = AsyncMock(return_value=mock_async_client)
            mock_async_client.__aexit__ = AsyncMock(return_value=False)
            mock_async_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_async_client

            resp = client.post(
                "/api/v1/profile/octocat/job-match",
                json={"job_url": "https://example.com/job"},
            )

        assert resp.status_code == 200

    def test_invalid_username_in_job_match_returns_422(
        self, client: TestClient
    ) -> None:
        resp = client.post(
            "/api/v1/profile/!!bad!!/job-match",
            json={"job_text": "Python dev needed."},
        )
        assert resp.status_code == 422
        assert resp.json()["detail"]["code"] == "INVALID_USERNAME"


# ---------------------------------------------------------------------------
# GET /api/v1/health
# ---------------------------------------------------------------------------


class TestHealth:
    def test_health_returns_200(self, client: TestClient) -> None:
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200

    def test_health_response_has_status_and_redis_keys(
        self, client: TestClient
    ) -> None:
        resp = client.get("/api/v1/health")
        body = resp.json()
        assert "status" in body
        assert "redis" in body

    def test_health_redis_unavailable_when_no_store(
        self, client: TestClient
    ) -> None:
        # _store_redis is None outside lifespan — redis reports unavailable
        import app.main as main_module

        original = main_module._store_redis
        main_module._store_redis = None
        try:
            resp = client.get("/api/v1/health")
            body = resp.json()
            assert body["redis"] == "unavailable"
            assert body["status"] == "degraded"
        finally:
            main_module._store_redis = original
