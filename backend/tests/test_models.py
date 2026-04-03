from datetime import date, datetime, timezone

import pytest

from app.models import (
    AIProfile,
    DayCount,
    GitHubData,
    JobMatchResult,
    Profile,
    ProfileCard,
    Repo,
    SkillProgression,
    TopRepo,
)


def _make_repo() -> Repo:
    return Repo(
        name="my-project",
        description="A cool project",
        language="Python",
        stars=42,
        forks=5,
        pushed_at=datetime(2024, 6, 1, tzinfo=timezone.utc),
        created_at=datetime(2023, 1, 15, tzinfo=timezone.utc),
    )


def _make_github_data() -> GitHubData:
    return GitHubData(
        username="octocat",
        account_age_days=730,
        total_public_repos=20,
        total_stars=100,
        total_forks=10,
        language_weighted={"Python": 0.7, "TypeScript": 0.3},
        commit_frequency_90d=[DayCount(date=date(2024, 6, 1), count=3)],
        repos=[_make_repo()],
    )


def _make_ai_profile() -> AIProfile:
    return AIProfile(
        available=True,
        card=ProfileCard(title="Backend Engineer", bio="Loves Python", strengths=["Python", "APIs"]),
        archetype="Backend Developer",
        repo_descriptions={"my-project": "A REST API project"},
        skill_progression=SkillProgression(
            primary_language="Python", trend="growing", summary="Increasing Python usage"
        ),
        suggested_project="Build a CLI tool",
    )


def _make_profile() -> Profile:
    return Profile(
        username="octocat",
        generated_at=datetime(2024, 6, 15, tzinfo=timezone.utc),
        cached=False,
        ai_available=True,
        github=_make_github_data(),
        ai=_make_ai_profile(),
        top_repos=[
            TopRepo(
                name="my-project",
                description="A cool project",
                language="Python",
                stars=42,
                forks=5,
                pushed_at=datetime(2024, 6, 1, tzinfo=timezone.utc),
                created_at=datetime(2023, 1, 15, tzinfo=timezone.utc),
                ai_description="A REST API project",
            )
        ],
    )


class TestProfileRoundTrip:
    def test_roundtrip_json(self) -> None:
        profile = _make_profile()
        json_str = profile.model_dump_json()
        restored = Profile.model_validate_json(json_str)
        assert restored == profile

    def test_roundtrip_preserves_username(self) -> None:
        profile = _make_profile()
        restored = Profile.model_validate_json(profile.model_dump_json())
        assert restored.username == "octocat"

    def test_roundtrip_preserves_language_weights(self) -> None:
        profile = _make_profile()
        restored = Profile.model_validate_json(profile.model_dump_json())
        assert restored.github.language_weighted == {"Python": 0.7, "TypeScript": 0.3}


class TestAIProfileUnavailable:
    def test_available_false_all_nullables_none(self) -> None:
        ai = AIProfile(available=False)
        assert ai.available is False
        assert ai.card is None
        assert ai.archetype is None
        assert ai.repo_descriptions == {}
        assert ai.skill_progression is None
        assert ai.suggested_project is None

    def test_unavailable_roundtrip(self) -> None:
        ai = AIProfile(available=False)
        restored = AIProfile.model_validate_json(ai.model_dump_json())
        assert restored.available is False
        assert restored.card is None


class TestJobMatchResultBoundaries:
    @pytest.mark.parametrize("score", [0, 100])
    def test_score_boundary(self, score: int) -> None:
        result = JobMatchResult(
            username="octocat",
            score=score,
            matched_skills=["Python"],
            missing_skills=[],
            recommended_project="Build something",
        )
        assert result.score == score

    def test_roundtrip_at_zero(self) -> None:
        result = JobMatchResult(
            username="octocat",
            score=0,
            matched_skills=[],
            missing_skills=["Go", "Rust"],
            recommended_project="Learn Go",
        )
        restored = JobMatchResult.model_validate_json(result.model_dump_json())
        assert restored.score == 0
        assert restored.missing_skills == ["Go", "Rust"]

    def test_roundtrip_at_hundred(self) -> None:
        result = JobMatchResult(
            username="octocat",
            score=100,
            matched_skills=["Python", "FastAPI"],
            missing_skills=[],
            recommended_project="Ship it",
        )
        restored = JobMatchResult.model_validate_json(result.model_dump_json())
        assert restored.score == 100
