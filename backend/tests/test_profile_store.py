"""Tests for ProfileStore.

fakeredis provides an in-memory Redis implementation so tests run without a
real Redis server.  The store's internal client is replaced post-construction
because ProfileStore creates its own connection from a URL.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import fakeredis.aioredis
import pytest
from redis.exceptions import RedisError

from app.models import AIProfile, DayCount, GitHubData, Profile, TopRepo
from app.profile_store import ProfileStore


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def fake_redis() -> fakeredis.aioredis.FakeRedis:
    return fakeredis.aioredis.FakeRedis()


@pytest.fixture
def store(fake_redis: fakeredis.aioredis.FakeRedis) -> ProfileStore:
    s = ProfileStore(redis_url="redis://localhost:6379")
    s._redis = fake_redis  # inject in-memory client
    return s


@pytest.fixture
def profile() -> Profile:
    return Profile(
        username="octocat",
        generated_at=datetime(2024, 6, 15, tzinfo=timezone.utc),
        cached=False,
        ai_available=True,
        github=GitHubData(
            username="octocat",
            account_age_days=730,
            total_public_repos=5,
            total_stars=42,
            total_forks=3,
            language_weighted={"Python": 0.8, "TypeScript": 0.2},
            commit_frequency_90d=[DayCount(date=datetime(2024, 6, 1).date(), count=2)],
            repos=[],
        ),
        ai=AIProfile(available=False),
        top_repos=[
            TopRepo(
                name="my-project",
                description="Cool",
                language="Python",
                stars=42,
                forks=3,
                pushed_at=datetime(2024, 6, 1, tzinfo=timezone.utc),
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            )
        ],
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestGetSet:
    async def test_set_then_get_returns_identical_profile(
        self, store: ProfileStore, profile: Profile
    ) -> None:
        await store.set("octocat", profile)
        result = await store.get("octocat")
        assert result == profile

    async def test_cache_miss_returns_none(self, store: ProfileStore) -> None:
        result = await store.get("nobody")
        assert result is None

    async def test_ttl_is_exactly_3600(
        self,
        store: ProfileStore,
        fake_redis: fakeredis.aioredis.FakeRedis,
        profile: Profile,
    ) -> None:
        await store.set("octocat", profile)
        ttl = await fake_redis.ttl("profile:octocat")
        assert ttl == 3600


class TestKeyNormalisation:
    async def test_key_is_lowercased(
        self,
        store: ProfileStore,
        fake_redis: fakeredis.aioredis.FakeRedis,
        profile: Profile,
    ) -> None:
        await store.set("TorValds", profile)
        raw = await fake_redis.get("profile:torvalds")
        assert raw is not None

    async def test_get_is_case_insensitive(
        self, store: ProfileStore, profile: Profile
    ) -> None:
        await store.set("octocat", profile)
        result = await store.get("OCTOCAT")
        assert result is not None
        assert result.username == "octocat"

    async def test_uppercase_key_not_stored_mixed_case(
        self,
        store: ProfileStore,
        fake_redis: fakeredis.aioredis.FakeRedis,
        profile: Profile,
    ) -> None:
        await store.set("OctoCat", profile)
        raw_mixed = await fake_redis.get("profile:OctoCat")
        assert raw_mixed is None  # should not exist under mixed-case key


class TestGracefulDegradation:
    async def test_redis_error_on_get_returns_none(
        self, store: ProfileStore
    ) -> None:
        with patch.object(
            store._redis, "get", new_callable=AsyncMock, side_effect=RedisError("down")
        ):
            result = await store.get("octocat")
        assert result is None

    async def test_redis_error_on_set_does_not_raise(
        self, store: ProfileStore, profile: Profile
    ) -> None:
        with patch.object(
            store._redis, "set", new_callable=AsyncMock, side_effect=RedisError("down")
        ):
            await store.set("octocat", profile)  # must not raise

    async def test_corrupted_value_on_get_returns_none(
        self,
        store: ProfileStore,
        fake_redis: fakeredis.aioredis.FakeRedis,
    ) -> None:
        await fake_redis.set("profile:octocat", b"not-valid-json")
        result = await store.get("octocat")
        assert result is None
