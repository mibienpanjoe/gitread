from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, cast

import httpx

from app.errors import (
    GitHubRateLimitError,
    GitHubUnavailableError,
    GitHubUserNotFoundError,
)
from app.models import DayCount, GitHubData, Repo

_LINK_NEXT_RE = re.compile(r'<([^>]+)>;\s*rel="next"')
_LINK_LAST_RE = re.compile(r'<[^>]*[?&]page=(\d+)>;\s*rel="last"')


class GitHubGateway:
    _BASE_URL = "https://api.github.com"

    def __init__(self, token: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=self._BASE_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=10.0,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch(self, username: str) -> GitHubData:
        user = await self._fetch_user(username)
        repos = await self._fetch_repos(username)
        language_weighted = self._compute_language_weighted(repos)
        commit_frequency = await self._build_commit_frequency_90d(username, repos)

        created_at = datetime.fromisoformat(user["created_at"].replace("Z", "+00:00"))
        account_age_days = (datetime.now(timezone.utc) - created_at).days

        return GitHubData(
            username=username,
            account_age_days=account_age_days,
            total_public_repos=user["public_repos"],
            total_stars=sum(r["stargazers_count"] for r in repos),
            total_forks=sum(r["forks_count"] for r in repos),
            language_weighted=language_weighted,
            commit_frequency_90d=commit_frequency,
            repos=[_repo_from_dict(r) for r in repos],
        )

    # ------------------------------------------------------------------
    # Private: GitHub REST calls
    # ------------------------------------------------------------------

    async def _fetch_user(self, username: str) -> dict[str, Any]:
        try:
            response = await self._client.get(f"/users/{username}")
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise GitHubUnavailableError(str(exc)) from exc
        if response.status_code == 404:
            raise GitHubUserNotFoundError(username)
        _raise_for_rate_limit(response)
        response.raise_for_status()
        return cast(dict[str, Any], response.json())

    async def _fetch_repos(self, username: str) -> list[dict[str, Any]]:
        """Fetch all public non-fork repos, paginating via Link header."""
        repos: list[dict[str, Any]] = []
        url: str | None = f"/users/{username}/repos?type=public&per_page=100"
        while url:
            try:
                response = await self._client.get(url)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                raise GitHubUnavailableError(str(exc)) from exc
            _raise_for_rate_limit(response)
            response.raise_for_status()
            page = cast(list[dict[str, Any]], response.json())
            repos.extend(r for r in page if not r["fork"])  # INV-03
            url = _next_link(response.headers.get("Link", ""))
        return repos

    async def _fetch_commit_count(
        self, username: str, repo_name: str, since: datetime
    ) -> int:
        """Return total commit count since `since` using the pagination link trick."""
        since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")
        url = f"/repos/{username}/{repo_name}/commits?since={since_str}&per_page=1"
        try:
            response = await self._client.get(url)
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise GitHubUnavailableError(str(exc)) from exc
        if response.status_code == 409:  # empty repo
            return 0
        _raise_for_rate_limit(response)
        response.raise_for_status()
        m = _LINK_LAST_RE.search(response.headers.get("Link", ""))
        if m:
            return int(m.group(1))
        return len(cast(list[Any], response.json()))  # 0 or 1

    async def _fetch_commits_since(
        self, username: str, repo_name: str, since: datetime
    ) -> list[dict[str, Any]]:
        """Fetch all commit objects for a repo since the given datetime."""
        since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")
        commits: list[dict[str, Any]] = []
        url: str | None = (
            f"/repos/{username}/{repo_name}/commits"
            f"?since={since_str}&author={username}&per_page=100"
        )
        while url:
            try:
                response = await self._client.get(url)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                raise GitHubUnavailableError(str(exc)) from exc
            if response.status_code == 409:  # empty repo
                return commits
            _raise_for_rate_limit(response)
            response.raise_for_status()
            commits.extend(cast(list[dict[str, Any]], response.json()))
            url = _next_link(response.headers.get("Link", ""))
        return commits

    # ------------------------------------------------------------------
    # Private: pure computation
    # ------------------------------------------------------------------

    def _compute_language_weighted(
        self, repos: list[dict[str, Any]]
    ) -> dict[str, float]:
        """Star-weighted language distribution, top 7, normalised to sum to 1.0."""
        weights: dict[str, float] = {}
        for repo in repos:
            lang = repo.get("language")
            if not lang:
                continue
            weight = float(max(repo.get("stargazers_count", 0), 1))
            weights[lang] = weights.get(lang, 0.0) + weight

        if not weights:
            return {}

        top7 = sorted(weights.items(), key=lambda x: x[1], reverse=True)[:7]
        top7_total = sum(w for _, w in top7)
        return {lang: round(w / top7_total, 6) for lang, w in top7}

    async def _build_commit_frequency_90d(
        self, username: str, repos: list[dict[str, Any]]
    ) -> list[DayCount]:
        """Aggregate per-day commit counts across all repos for the last 90 days.

        All 90 days are present in the output; days with no commits have count=0.
        """
        since = datetime.now(timezone.utc) - timedelta(days=90)
        date_counts: dict[date, int] = {}

        for repo in repos:
            commits = await self._fetch_commits_since(username, repo["name"], since)
            for commit in commits:
                author = (commit.get("commit") or {}).get("author") or {}
                raw_date: str | None = author.get("date")
                if not raw_date:
                    continue
                try:
                    d = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).date()
                except ValueError:
                    continue
                date_counts[d] = date_counts.get(d, 0) + 1

        today = datetime.now(timezone.utc).date()
        return [
            DayCount(
                date=today - timedelta(days=89 - i),
                count=date_counts.get(today - timedelta(days=89 - i), 0),
            )
            for i in range(90)
        ]


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------


def _next_link(link_header: str) -> str | None:
    m = _LINK_NEXT_RE.search(link_header)
    return m.group(1) if m else None


def _raise_for_rate_limit(response: httpx.Response) -> None:
    if response.status_code in (429, 403):
        reset_at = int(response.headers.get("X-RateLimit-Reset", "0"))
        raise GitHubRateLimitError(reset_at)


def _repo_from_dict(r: dict[str, Any]) -> Repo:
    return Repo(
        name=r["name"],
        description=r.get("description"),
        language=r.get("language"),
        stars=r["stargazers_count"],
        forks=r["forks_count"],
        pushed_at=r["pushed_at"],
        created_at=r["created_at"],
    )
