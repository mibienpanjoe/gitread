from __future__ import annotations

from datetime import datetime, timezone

from app.ai_analyst import AIAnalyst
from app.github_gateway import GitHubGateway
from app.models import JobMatchResult, Profile, Repo, TopRepo
from app.profile_store import ProfileStore


class ProfileOrchestrator:
    def __init__(
        self,
        gateway: GitHubGateway,
        analyst: AIAnalyst,
        store: ProfileStore,
    ) -> None:
        self._gateway = gateway
        self._analyst = analyst
        self._store = store

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_profile(self, username: str) -> Profile:
        username = username.lower()

        cached = await self._store.get(username)
        if cached is not None:
            cached.cached = True
            return cached

        github_data = await self._gateway.fetch(username)  # propagates errors

        ranked = self._rank_repos(github_data.repos)
        ai_profile = await self._analyst.generate_profile(github_data)  # never raises
        top_repos = self._build_top_repos(ranked, ai_profile.repo_descriptions)

        profile = Profile(
            username=username,
            generated_at=datetime.now(timezone.utc),
            cached=False,
            ai_available=ai_profile.available,
            github=github_data,
            ai=ai_profile,
            top_repos=top_repos,
        )

        await self._store.set(username, profile)  # never raises
        return profile

    async def score_job_match(self, username: str, job_text: str) -> JobMatchResult:
        profile = await self._store.get(username.lower())
        if profile is None:
            profile = await self.generate_profile(username)
        return await self._analyst.score_job_match(profile.github, job_text)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _rank_repos(repos: list[Repo]) -> list[Repo]:
        """Rank repos by composite score: stars × 0.6 + recency × 0.4, top 5."""
        now = datetime.now(timezone.utc)

        def score(repo: Repo) -> float:
            recency = max(0.0, 1.0 - (now - repo.pushed_at).days / 365)
            return repo.stars * 0.6 + recency * 0.4

        return sorted(repos, key=score, reverse=True)[:5]

    @staticmethod
    def _build_top_repos(
        repos: list[Repo], ai_descriptions: dict[str, str]
    ) -> list[TopRepo]:
        return [
            TopRepo(
                name=repo.name,
                description=repo.description,
                language=repo.language,
                stars=repo.stars,
                forks=repo.forks,
                pushed_at=repo.pushed_at,
                created_at=repo.created_at,
                ai_description=ai_descriptions.get(repo.name),
            )
            for repo in repos
        ]
