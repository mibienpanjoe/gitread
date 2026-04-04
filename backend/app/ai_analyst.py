from __future__ import annotations

import json
import logging
from typing import Any

import openai

from app.errors import AIUnavailableError
from app.models import (
    AIProfile,
    GitHubData,
    JobMatchResult,
    ProfileCard,
    SkillProgression,
)

logger = logging.getLogger(__name__)

_MAX_JOB_TEXT = 4000

# ---------------------------------------------------------------------------
# Structured output schemas
# ---------------------------------------------------------------------------

_PROFILE_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "profile_analysis",
        "schema": {
            "type": "object",
            "properties": {
                "card": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "bio": {"type": "string"},
                        "strengths": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["title", "bio", "strengths"],
                    "additionalProperties": False,
                },
                "archetype": {"type": "string"},
                "repo_descriptions": {
                    "type": "object",
                    "additionalProperties": {"type": "string"},
                },
                "skill_progression": {
                    "type": "object",
                    "properties": {
                        "primary_language": {"type": "string"},
                        "trend": {
                            "type": "string",
                            "enum": ["growing", "stable", "declining"],
                        },
                        "summary": {"type": "string"},
                    },
                    "required": ["primary_language", "trend", "summary"],
                    "additionalProperties": False,
                },
                "suggested_project": {"type": "string"},
            },
            "required": [
                "card",
                "archetype",
                "repo_descriptions",
                "skill_progression",
                "suggested_project",
            ],
            "additionalProperties": False,
        },
    },
}

_JOB_MATCH_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "job_match",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "score": {"type": "integer"},
                "matched_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "missing_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "recommended_project": {"type": "string"},
            },
            "required": [
                "score",
                "matched_skills",
                "missing_skills",
                "recommended_project",
            ],
            "additionalProperties": False,
        },
    },
}


# ---------------------------------------------------------------------------
# AIAnalyst
# ---------------------------------------------------------------------------


class AIAnalyst:
    def __init__(self, api_key: str) -> None:
        self._client = openai.AsyncOpenAI(api_key=api_key)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_profile(self, data: GitHubData) -> AIProfile:
        """Generate an AI profile from GitHub data.

        Never raises — any failure returns AIProfile(available=False).
        """
        try:
            prompt = self._build_profile_prompt(data)
            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format=_PROFILE_RESPONSE_FORMAT,  # type: ignore[arg-type]
                timeout=10.0,
            )
            content = response.choices[0].message.content or ""
            raw: dict[str, Any] = json.loads(content)
            return self._parse_profile_response(raw, data)
        except Exception as exc:
            logger.warning("AIAnalyst.generate_profile failed: %s", exc)
            return AIProfile(available=False)

    async def score_job_match(self, data: GitHubData, job_text: str) -> JobMatchResult:
        """Score a job match against a developer's GitHub profile.

        Raises AIUnavailableError on any failure — job match has no fallback.
        """
        try:
            prompt = self._build_job_match_prompt(data, job_text)
            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format=_JOB_MATCH_RESPONSE_FORMAT,  # type: ignore[arg-type]
                timeout=10.0,
            )
            content = response.choices[0].message.content or ""
            raw = json.loads(content)

            raw_score = int(raw["score"])
            score = max(0, min(100, raw_score))  # INV-06: clamp to [0, 100]
            if score != raw_score:
                logger.warning("Job match score %s clamped to %s", raw_score, score)

            return JobMatchResult(
                username=data.username,
                score=score,
                matched_skills=raw.get("matched_skills", []),
                missing_skills=raw.get("missing_skills", []),
                recommended_project=raw.get("recommended_project", ""),
            )
        except Exception as exc:
            raise AIUnavailableError(str(exc)) from exc

    # ------------------------------------------------------------------
    # Prompt construction
    # ------------------------------------------------------------------

    def _build_profile_prompt(self, data: GitHubData) -> str:
        total_90d = sum(d.count for d in data.commit_frequency_90d)
        if total_90d > 30:
            activity = f"active ({total_90d} commits in last 90 days)"
        elif total_90d >= 5:
            activity = f"moderate ({total_90d} commits in last 90 days)"
        else:
            activity = f"low ({total_90d} commits in last 90 days)"

        top_repos = sorted(data.repos, key=lambda r: r.stars, reverse=True)[:5]
        repo_lines = "\n".join(
            f"- {r.name} ({r.language or 'unknown'}, {r.stars}\u2605): "
            f"{r.description or 'no description'}"
            for r in top_repos
        )

        top_langs = sorted(
            data.language_weighted.items(), key=lambda x: x[1], reverse=True
        )[:5]
        lang_lines = "\n".join(
            f"- {lang}: {round(pct * 100, 1)}%" for lang, pct in top_langs
        )

        return (
            "You are a developer profile analyst. Analyse the GitHub data below "
            "and return a structured JSON profile.\n\n"
            "## Developer Data\n\n"
            f"Username: {data.username}\n"
            f"Account age: {data.account_age_days} days\n"
            f"Total public repos: {data.total_public_repos}\n"
            f"Total stars: {data.total_stars}\n"
            f"Commit activity (last 90 days): {activity}\n\n"
            "## Top Repositories\n"
            f"{repo_lines or '(none)'}\n\n"
            "## Language Distribution (star-weighted)\n"
            f"{lang_lines or '(none)'}\n\n"
            "## Instructions\n"
            "- Only reference repositories listed above. "
            "Do not invent projects, languages, or technologies.\n"
            "- Write the bio as 2\u20133 sentences in third person "
            '(e.g. "Known for X, {username} is..."). '
            "Do not use second person ('You are...').\n"
            "- Strengths should be 3\u20135 concrete technical skills evident from the data.\n"
            '- archetype must start with "The " (e.g. "The Backend Engineer").\n'
            "- trend must be one of: growing, stable, declining.\n"
            "- suggested_project: propose one concrete, catchy side-project the "
            "developer could build next. It must: (1) have a specific name, "
            "(2) name the exact language/stack from their profile, "
            "(3) state a clear, interesting purpose in one sentence. "
            'Bad example: "Contribute to an open-source project." '
            'Good example: "Build \'KernelWatch\' — a C tool that hooks into '
            "Linux perf_events and streams live syscall latency stats to a "
            'terminal dashboard using ncurses."\n'
        )

    def _build_job_match_prompt(self, data: GitHubData, job_text: str) -> str:
        truncated = job_text[:_MAX_JOB_TEXT]
        notice = (
            "\n[Note: job description was truncated to 4000 characters]"
            if len(job_text) > _MAX_JOB_TEXT
            else ""
        )

        top_langs = sorted(
            data.language_weighted.items(), key=lambda x: x[1], reverse=True
        )[:5]
        lang_summary = ", ".join(
            f"{lang} ({round(pct * 100)}%)" for lang, pct in top_langs
        )

        top_repos = sorted(data.repos, key=lambda r: r.stars, reverse=True)[:5]
        repo_summary = ", ".join(
            f"{r.name} ({r.language or '?'})" for r in top_repos
        )

        return (
            "You are a technical recruiter. Compare the developer's GitHub profile "
            "with the job description and return a JSON match assessment.\n\n"
            "## Developer Profile\n\n"
            f"Username: {data.username}\n"
            f"Account age: {data.account_age_days} days "
            f"({data.total_stars} total stars)\n"
            f"Languages: {lang_summary or 'none'}\n"
            f"Notable repos: {repo_summary or 'none'}\n\n"
            "## Job Description\n"
            f"{truncated}{notice}\n\n"
            "## Instructions\n"
            "- score: integer from 0 (no match) to 100 (perfect match).\n"
            "- matched_skills: specific skills the developer clearly has.\n"
            "- missing_skills: skills the job requires that the developer lacks.\n"
            "- recommended_project: one concrete project to improve their fit.\n"
        )

    # ------------------------------------------------------------------
    # Response parsing + grounding validation
    # ------------------------------------------------------------------

    def _parse_profile_response(
        self, raw: dict[str, Any], data: GitHubData
    ) -> AIProfile:
        archetype: str | None = raw.get("archetype")
        if archetype and not archetype.startswith("The "):
            logger.warning("archetype %r does not start with 'The '", archetype)

        # INV-02: discard repo_descriptions keys not present in actual repos
        known_names = {r.name for r in data.repos}
        raw_descs: dict[str, Any] = raw.get("repo_descriptions") or {}
        repo_descriptions = {
            k: str(v)
            for k, v in raw_descs.items()
            if isinstance(k, str) and k in known_names
        }

        raw_card: dict[str, Any] = raw.get("card") or {}
        card = ProfileCard(
            title=str(raw_card.get("title", "")),
            bio=str(raw_card.get("bio", "")),
            strengths=[str(s) for s in raw_card.get("strengths", [])],
        )

        raw_sp: dict[str, Any] = raw.get("skill_progression") or {}
        skill_progression = SkillProgression(
            primary_language=str(raw_sp.get("primary_language", "")),
            trend=raw_sp.get("trend", "stable"),
            summary=str(raw_sp.get("summary", "")),
        )

        return AIProfile(
            available=True,
            card=card,
            archetype=archetype,
            repo_descriptions=repo_descriptions,
            skill_progression=skill_progression,
            suggested_project=raw.get("suggested_project"),
        )
