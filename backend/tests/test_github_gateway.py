"""Tests for GitHubGateway.

Mocking strategy: respx intercepts httpx at the transport level, so the
real AsyncClient is used but no network calls are made.
"""
from __future__ import annotations

import re

import httpx
import pytest
import respx

from app.errors import GitHubRateLimitError, GitHubUnavailableError, GitHubUserNotFoundError
from app.github_gateway import GitHubGateway


# ---------------------------------------------------------------------------
# Fixtures + helpers
# ---------------------------------------------------------------------------


@pytest.fixture
def gateway() -> GitHubGateway:
    return GitHubGateway(token="test-token")


def _user(username: str = "octocat") -> dict:  # type: ignore[type-arg]
    return {
        "login": username,
        "public_repos": 10,
        "created_at": "2020-01-01T00:00:00Z",
    }


def _repo(
    name: str,
    fork: bool = False,
    language: str = "Python",
    stars: int = 10,
) -> dict:  # type: ignore[type-arg]
    return {
        "name": name,
        "description": f"Repo {name}",
        "language": language,
        "stargazers_count": stars,
        "forks_count": 2,
        "fork": fork,
        "pushed_at": "2024-01-01T00:00:00Z",
        "created_at": "2023-01-01T00:00:00Z",
    }


def _commit(date_str: str = "2024-03-01T10:00:00Z") -> dict:  # type: ignore[type-arg]
    return {"commit": {"author": {"date": date_str}}}


# ---------------------------------------------------------------------------
# _fetch_user: error handling
# ---------------------------------------------------------------------------


class TestFetchUser:
    @pytest.mark.asyncio
    async def test_404_raises_user_not_found(self, gateway: GitHubGateway) -> None:
        with respx.mock:
            respx.get("https://api.github.com/users/unknown").mock(
                return_value=httpx.Response(404)
            )
            with pytest.raises(GitHubUserNotFoundError):
                await gateway._fetch_user("unknown")

    @pytest.mark.asyncio
    async def test_429_raises_rate_limit_with_reset_at(self, gateway: GitHubGateway) -> None:
        with respx.mock:
            respx.get("https://api.github.com/users/octocat").mock(
                return_value=httpx.Response(
                    429, headers={"X-RateLimit-Reset": "1700000000"}
                )
            )
            with pytest.raises(GitHubRateLimitError) as exc_info:
                await gateway._fetch_user("octocat")
        assert exc_info.value.reset_at == 1700000000

    @pytest.mark.asyncio
    async def test_403_raises_rate_limit_with_reset_at(self, gateway: GitHubGateway) -> None:
        with respx.mock:
            respx.get("https://api.github.com/users/octocat").mock(
                return_value=httpx.Response(
                    403, headers={"X-RateLimit-Reset": "1700000001"}
                )
            )
            with pytest.raises(GitHubRateLimitError) as exc_info:
                await gateway._fetch_user("octocat")
        assert exc_info.value.reset_at == 1700000001

    @pytest.mark.asyncio
    async def test_connect_error_raises_unavailable(self, gateway: GitHubGateway) -> None:
        with respx.mock:
            respx.get("https://api.github.com/users/octocat").mock(
                side_effect=httpx.ConnectError("refused")
            )
            with pytest.raises(GitHubUnavailableError):
                await gateway._fetch_user("octocat")


# ---------------------------------------------------------------------------
# _fetch_repos: fork filtering + pagination
# ---------------------------------------------------------------------------


class TestFetchRepos:
    @pytest.mark.asyncio
    async def test_fork_is_excluded(self, gateway: GitHubGateway) -> None:
        repos = [_repo("repo1"), _repo("repo2"), _repo("forked", fork=True)]
        with respx.mock:
            respx.get(
                re.compile(r"https://api\.github\.com/users/octocat/repos")
            ).mock(return_value=httpx.Response(200, json=repos))
            result = await gateway._fetch_repos("octocat")
        assert len(result) == 2
        assert all(not r["fork"] for r in result)

    @pytest.mark.asyncio
    async def test_all_forks_returns_empty(self, gateway: GitHubGateway) -> None:
        repos = [_repo("f1", fork=True), _repo("f2", fork=True)]
        with respx.mock:
            respx.get(
                re.compile(r"https://api\.github\.com/users/octocat/repos")
            ).mock(return_value=httpx.Response(200, json=repos))
            result = await gateway._fetch_repos("octocat")
        assert result == []

    @pytest.mark.asyncio
    async def test_pagination_two_pages_of_100(self, gateway: GitHubGateway) -> None:
        page1 = [_repo(f"repo{i}") for i in range(100)]
        page2 = [_repo(f"repo{i + 100}") for i in range(100)]
        page2_url = "https://api.github.com/users/octocat/repos?page=2"

        with respx.mock:
            respx.get(
                re.compile(r"https://api\.github\.com/users/octocat/repos\?type=public")
            ).mock(
                return_value=httpx.Response(
                    200,
                    json=page1,
                    headers={"Link": f'<{page2_url}>; rel="next"'},
                )
            )
            respx.get(page2_url).mock(
                return_value=httpx.Response(200, json=page2)
            )
            result = await gateway._fetch_repos("octocat")
        assert len(result) == 200

    @pytest.mark.asyncio
    async def test_pagination_forks_filtered_across_pages(
        self, gateway: GitHubGateway
    ) -> None:
        page1 = [_repo("r1"), _repo("fork1", fork=True)]
        page2 = [_repo("r2"), _repo("fork2", fork=True)]
        page2_url = "https://api.github.com/users/octocat/repos?page=2"

        with respx.mock:
            respx.get(
                re.compile(r"https://api\.github\.com/users/octocat/repos\?type=public")
            ).mock(
                return_value=httpx.Response(
                    200,
                    json=page1,
                    headers={"Link": f'<{page2_url}>; rel="next"'},
                )
            )
            respx.get(page2_url).mock(
                return_value=httpx.Response(200, json=page2)
            )
            result = await gateway._fetch_repos("octocat")
        assert len(result) == 2
        assert {r["name"] for r in result} == {"r1", "r2"}


# ---------------------------------------------------------------------------
# _compute_language_weighted: pure function, no mocking needed
# ---------------------------------------------------------------------------


class TestComputeLanguageWeighted:
    def test_weights_sum_to_one(self, gateway: GitHubGateway) -> None:
        repos = [
            _repo("r1", language="Python", stars=10),
            _repo("r2", language="TypeScript", stars=20),
            _repo("r3", language="Go", stars=5),
        ]
        result = gateway._compute_language_weighted(repos)
        assert abs(sum(result.values()) - 1.0) < 1e-5

    def test_top_7_only(self, gateway: GitHubGateway) -> None:
        repos = [_repo(f"r{i}", language=f"Lang{i}", stars=i + 1) for i in range(10)]
        result = gateway._compute_language_weighted(repos)
        assert len(result) <= 7

    def test_zero_star_repo_uses_weight_1(self, gateway: GitHubGateway) -> None:
        repos = [_repo("r1", language="Python", stars=0)]
        result = gateway._compute_language_weighted(repos)
        assert "Python" in result
        assert abs(result["Python"] - 1.0) < 1e-5

    def test_star_weighting_favours_higher_star_language(
        self, gateway: GitHubGateway
    ) -> None:
        repos = [
            _repo("r1", language="Python", stars=80),
            _repo("r2", language="TypeScript", stars=20),
        ]
        result = gateway._compute_language_weighted(repos)
        assert result["Python"] > result["TypeScript"]

    def test_no_language_repos_are_skipped(self, gateway: GitHubGateway) -> None:
        repos = [_repo("r1", language="Python", stars=5)]
        repos[0]["language"] = None
        result = gateway._compute_language_weighted(repos)
        assert result == {}

    def test_empty_repos_returns_empty(self, gateway: GitHubGateway) -> None:
        assert gateway._compute_language_weighted([]) == {}


# ---------------------------------------------------------------------------
# fetch(): full pipeline — fork invariant end-to-end
# ---------------------------------------------------------------------------


class TestFetch:
    @pytest.mark.asyncio
    async def test_fork_not_in_result(self, gateway: GitHubGateway) -> None:
        repos_payload = [_repo("repo1"), _repo("repo2"), _repo("forked", fork=True)]

        with respx.mock:
            respx.get("https://api.github.com/users/octocat").mock(
                return_value=httpx.Response(200, json=_user())
            )
            respx.get(
                re.compile(r"https://api\.github\.com/users/octocat/repos")
            ).mock(return_value=httpx.Response(200, json=repos_payload))
            # Commits endpoint — return empty for all repos
            respx.get(
                re.compile(r"https://api\.github\.com/repos/octocat/")
            ).mock(return_value=httpx.Response(200, json=[]))

            result = await gateway.fetch("octocat")

        assert len(result.repos) == 2
        assert all(r.name != "forked" for r in result.repos)

    @pytest.mark.asyncio
    async def test_totals_exclude_forks(self, gateway: GitHubGateway) -> None:
        repos_payload = [
            _repo("repo1", stars=10),
            _repo("fork1", fork=True, stars=999),  # must not count
        ]

        with respx.mock:
            respx.get("https://api.github.com/users/octocat").mock(
                return_value=httpx.Response(200, json=_user())
            )
            respx.get(
                re.compile(r"https://api\.github\.com/users/octocat/repos")
            ).mock(return_value=httpx.Response(200, json=repos_payload))
            respx.get(
                re.compile(r"https://api\.github\.com/repos/octocat/")
            ).mock(return_value=httpx.Response(200, json=[]))

            result = await gateway.fetch("octocat")

        assert result.total_stars == 10  # fork's 999 stars excluded
