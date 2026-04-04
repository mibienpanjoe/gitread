"""Tests for AIAnalyst.

OpenAI is mocked at the client level — no live API calls are made.
"""
from __future__ import annotations

import asyncio
import json
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.ai_analyst import AIAnalyst
from app.errors import AIUnavailableError
from app.models import DayCount, GitHubData, Repo


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_github_data(repo_names: list[str] | None = None) -> GitHubData:
    names = repo_names or ["my-project", "another-repo"]
    repos = [
        Repo(
            name=name,
            description=f"Desc for {name}",
            language="Python",
            stars=10,
            forks=2,
            pushed_at=datetime(2024, 6, 1, tzinfo=timezone.utc),
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        )
        for name in names
    ]
    return GitHubData(
        username="octocat",
        account_age_days=730,
        total_public_repos=len(repos),
        total_stars=sum(r.stars for r in repos),
        total_forks=sum(r.forks for r in repos),
        language_weighted={"Python": 1.0},
        commit_frequency_90d=[DayCount(date=date(2024, 6, 1), count=5)],
        repos=repos,
    )


def _valid_profile_payload(repo_names: list[str] | None = None) -> dict:  # type: ignore[type-arg]
    return {
        "card": {
            "title": "Backend Engineer",
            "bio": "You are a skilled Python developer.",
            "strengths": ["Python", "APIs", "Testing"],
        },
        "archetype": "The Backend Engineer",
        "repo_descriptions": {
            name: f"Description of {name}"
            for name in (repo_names or ["my-project", "another-repo"])
        },
        "skill_progression": {
            "primary_language": "Python",
            "trend": "growing",
            "summary": "Increasing Python usage over time.",
        },
        "suggested_project": "Build a CLI tool in Python.",
    }


def _mock_client(content: str) -> MagicMock:
    """Return a mock OpenAI client that responds with `content`."""
    client = MagicMock()
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message.content = content
    client.chat.completions.create = AsyncMock(return_value=response)
    return client


def _mock_client_raises(exc: Exception) -> MagicMock:
    """Return a mock OpenAI client that raises `exc`."""
    client = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=exc)
    return client


@pytest.fixture
def analyst() -> AIAnalyst:
    return AIAnalyst(api_key="test-key")


# ---------------------------------------------------------------------------
# generate_profile — happy path
# ---------------------------------------------------------------------------


class TestGenerateProfile:
    async def test_valid_response_returns_available_profile(
        self, analyst: AIAnalyst
    ) -> None:
        payload = _valid_profile_payload()
        analyst._client = _mock_client(json.dumps(payload))

        result = await analyst.generate_profile(_make_github_data())

        assert result.available is True
        assert result.archetype == "The Backend Engineer"
        assert result.card is not None
        assert result.card.title == "Backend Engineer"
        assert result.skill_progression is not None
        assert result.skill_progression.trend == "growing"

    async def test_valid_response_populates_repo_descriptions(
        self, analyst: AIAnalyst
    ) -> None:
        payload = _valid_profile_payload()
        analyst._client = _mock_client(json.dumps(payload))

        result = await analyst.generate_profile(_make_github_data())

        assert "my-project" in result.repo_descriptions
        assert "another-repo" in result.repo_descriptions

    # ------------------------------------------------------------------
    # Grounding validation (INV-02)
    # ------------------------------------------------------------------

    async def test_nonexistent_repo_key_is_discarded(
        self, analyst: AIAnalyst
    ) -> None:
        payload = _valid_profile_payload()
        payload["repo_descriptions"]["hallucinated-repo"] = "This does not exist"
        analyst._client = _mock_client(json.dumps(payload))

        # data only has "my-project" and "another-repo"
        result = await analyst.generate_profile(_make_github_data())

        assert "hallucinated-repo" not in result.repo_descriptions
        assert "my-project" in result.repo_descriptions

    async def test_all_nonexistent_repos_leaves_empty_descriptions(
        self, analyst: AIAnalyst
    ) -> None:
        payload = _valid_profile_payload(repo_names=["my-project"])
        payload["repo_descriptions"] = {"ghost-repo": "fabricated"}
        analyst._client = _mock_client(json.dumps(payload))

        result = await analyst.generate_profile(_make_github_data(["my-project"]))

        assert result.repo_descriptions == {}

    # ------------------------------------------------------------------
    # Graceful failure (never raises)
    # ------------------------------------------------------------------

    async def test_timeout_returns_unavailable_profile(
        self, analyst: AIAnalyst
    ) -> None:
        analyst._client = _mock_client_raises(asyncio.TimeoutError())

        result = await analyst.generate_profile(_make_github_data())

        assert result.available is False
        assert result.card is None
        assert result.archetype is None
        assert result.repo_descriptions == {}
        assert result.skill_progression is None
        assert result.suggested_project is None

    async def test_api_error_returns_unavailable_profile(
        self, analyst: AIAnalyst
    ) -> None:
        analyst._client = _mock_client_raises(Exception("OpenAI down"))

        result = await analyst.generate_profile(_make_github_data())

        assert result.available is False

    async def test_malformed_json_returns_unavailable_profile(
        self, analyst: AIAnalyst
    ) -> None:
        analyst._client = _mock_client("not-valid-json{{{")

        result = await analyst.generate_profile(_make_github_data())

        assert result.available is False


# ---------------------------------------------------------------------------
# score_job_match — score clamping + failure
# ---------------------------------------------------------------------------


class TestScoreJobMatch:
    async def test_valid_response_returns_job_match_result(
        self, analyst: AIAnalyst
    ) -> None:
        payload = {
            "score": 75,
            "matched_skills": ["Python", "FastAPI"],
            "missing_skills": ["Go"],
            "recommended_project": "Build a Go microservice.",
        }
        analyst._client = _mock_client(json.dumps(payload))

        result = await analyst.score_job_match(_make_github_data(), "job text")

        assert result.score == 75
        assert result.username == "octocat"
        assert "Python" in result.matched_skills

    async def test_score_above_100_clamped(self, analyst: AIAnalyst) -> None:
        payload = {
            "score": 105,
            "matched_skills": [],
            "missing_skills": [],
            "recommended_project": "Ship it.",
        }
        analyst._client = _mock_client(json.dumps(payload))

        result = await analyst.score_job_match(_make_github_data(), "job text")

        assert result.score == 100

    async def test_score_below_0_clamped(self, analyst: AIAnalyst) -> None:
        payload = {
            "score": -5,
            "matched_skills": [],
            "missing_skills": ["everything"],
            "recommended_project": "Start from scratch.",
        }
        analyst._client = _mock_client(json.dumps(payload))

        result = await analyst.score_job_match(_make_github_data(), "job text")

        assert result.score == 0

    async def test_score_at_boundary_0_not_clamped(self, analyst: AIAnalyst) -> None:
        payload = {
            "score": 0,
            "matched_skills": [],
            "missing_skills": ["Python"],
            "recommended_project": "Learn Python.",
        }
        analyst._client = _mock_client(json.dumps(payload))
        result = await analyst.score_job_match(_make_github_data(), "job text")
        assert result.score == 0

    async def test_score_at_boundary_100_not_clamped(
        self, analyst: AIAnalyst
    ) -> None:
        payload = {
            "score": 100,
            "matched_skills": ["Python"],
            "missing_skills": [],
            "recommended_project": "Keep going.",
        }
        analyst._client = _mock_client(json.dumps(payload))
        result = await analyst.score_job_match(_make_github_data(), "job text")
        assert result.score == 100

    async def test_timeout_raises_ai_unavailable(self, analyst: AIAnalyst) -> None:
        analyst._client = _mock_client_raises(asyncio.TimeoutError())

        with pytest.raises(AIUnavailableError):
            await analyst.score_job_match(_make_github_data(), "job text")

    async def test_api_error_raises_ai_unavailable(self, analyst: AIAnalyst) -> None:
        analyst._client = _mock_client_raises(Exception("service down"))

        with pytest.raises(AIUnavailableError):
            await analyst.score_job_match(_make_github_data(), "job text")


# ---------------------------------------------------------------------------
# Prompt construction — unit tests (pure, no mocking)
# ---------------------------------------------------------------------------


class TestBuildProfilePrompt:
    def test_prompt_contains_username(self, analyst: AIAnalyst) -> None:
        prompt = analyst._build_profile_prompt(_make_github_data())
        assert "octocat" in prompt

    def test_prompt_contains_repo_names(self, analyst: AIAnalyst) -> None:
        prompt = analyst._build_profile_prompt(_make_github_data())
        assert "my-project" in prompt

    def test_prompt_contains_grounding_instruction(self, analyst: AIAnalyst) -> None:
        prompt = analyst._build_profile_prompt(_make_github_data())
        assert "Only reference repositories listed above" in prompt


class TestBuildJobMatchPrompt:
    def test_long_job_text_is_truncated(self, analyst: AIAnalyst) -> None:
        long_text = "x" * 5000
        prompt = analyst._build_job_match_prompt(_make_github_data(), long_text)
        assert "truncated to 4000 characters" in prompt
        assert "x" * 5000 not in prompt

    def test_short_job_text_not_truncated(self, analyst: AIAnalyst) -> None:
        text = "Looking for a Python developer."
        prompt = analyst._build_job_match_prompt(_make_github_data(), text)
        assert "truncated" not in prompt
        assert text in prompt
