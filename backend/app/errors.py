class GitReadError(Exception):
    """Base exception for all Gitread errors."""


class GitHubUserNotFoundError(GitReadError):
    """Raised when a GitHub user does not exist (404)."""


class GitHubRateLimitError(GitReadError):
    """Raised when GitHub rate limit is hit (429/403).

    Attributes:
        reset_at: Unix timestamp when the rate limit resets.
    """

    def __init__(self, reset_at: int) -> None:
        super().__init__(f"GitHub rate limit exceeded; resets at {reset_at}")
        self.reset_at = reset_at


class GitHubUnavailableError(GitReadError):
    """Raised on connection error or timeout reaching GitHub."""


class JobURLFetchError(GitReadError):
    """Raised when the job posting URL cannot be fetched."""


class AIUnavailableError(GitReadError):
    """Raised when the AI service is unavailable during job match.

    Note: for profile generation, AI failure is handled as a fallback
    (ai_available=False) and must NOT raise this exception.
    """
