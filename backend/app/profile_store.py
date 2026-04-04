from __future__ import annotations

import logging

import redis.asyncio as aioredis
from redis.exceptions import RedisError

from app.models import Profile

logger = logging.getLogger(__name__)


class ProfileStore:
    def __init__(self, redis_url: str) -> None:
        self._redis = aioredis.from_url(redis_url)

    async def get(self, username: str) -> Profile | None:
        key = self._key(username)
        try:
            raw = await self._redis.get(key)
        except RedisError as exc:
            logger.warning("Redis get failed for %s: %s", key, exc)
            return None
        if raw is None:
            return None
        try:
            return Profile.model_validate_json(raw)
        except Exception as exc:
            logger.warning("Profile deserialisation failed for %s: %s", key, exc)
            return None

    async def set(self, username: str, profile: Profile) -> None:
        key = self._key(username)
        try:
            await self._redis.set(key, profile.model_dump_json(), ex=3600)  # INV-04
        except RedisError as exc:
            logger.warning("Redis set failed for %s: %s", key, exc)

    def _key(self, username: str) -> str:
        return f"profile:{username.lower()}"  # INV-05
