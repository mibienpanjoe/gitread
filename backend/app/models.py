from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Input types — data fetched from GitHub
# ---------------------------------------------------------------------------


class Repo(BaseModel):
    name: str
    description: str | None
    language: str | None
    stars: int
    forks: int
    pushed_at: datetime
    created_at: datetime


class DayCount(BaseModel):
    date: date
    count: int


class GitHubData(BaseModel):
    username: str
    account_age_days: int
    total_public_repos: int
    total_stars: int
    total_forks: int
    language_weighted: dict[str, float]
    commit_frequency_90d: list[DayCount]
    repos: list[Repo]


# ---------------------------------------------------------------------------
# AI output types — produced by AIAnalyst
# ---------------------------------------------------------------------------


class ProfileCard(BaseModel):
    title: str
    bio: str
    strengths: list[str]


class SkillProgression(BaseModel):
    primary_language: str
    trend: Literal["growing", "stable", "declining"]
    summary: str


class AIProfile(BaseModel):
    available: bool = True
    card: ProfileCard | None = None
    archetype: str | None = None
    repo_descriptions: dict[str, str] = {}
    skill_progression: SkillProgression | None = None
    suggested_project: str | None = None


# ---------------------------------------------------------------------------
# Composed types — assembled by ProfileOrchestrator
# ---------------------------------------------------------------------------


class TopRepo(BaseModel):
    name: str
    description: str | None
    language: str | None
    stars: int
    forks: int
    pushed_at: datetime
    created_at: datetime
    ai_description: str | None = None


class Profile(BaseModel):
    username: str
    generated_at: datetime
    cached: bool = False
    ai_available: bool
    github: GitHubData
    ai: AIProfile
    top_repos: list[TopRepo]


# ---------------------------------------------------------------------------
# Job match types
# ---------------------------------------------------------------------------


class JobMatchResult(BaseModel):
    username: str
    score: int
    matched_skills: list[str]
    missing_skills: list[str]
    recommended_project: str


# ---------------------------------------------------------------------------
# API request types
# ---------------------------------------------------------------------------


class JobMatchRequest(BaseModel):
    job_text: str | None = None
    job_url: str | None = None
