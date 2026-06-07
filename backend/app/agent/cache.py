"""Agent feedback cache — thin wrappers around DB queries."""

from app.db import cache_feedback as db_cache_feedback
from app.db import get_cached_feedback as db_get_cached_feedback


def get_cached(assessment_id: str) -> dict | None:
    """Return cached agent feedback for an assessment, or None."""
    return db_get_cached_feedback(assessment_id)


def save(
    assessment_id: str, provider: str, model: str, feedback: dict
) -> None:
    """Cache agent feedback for an assessment."""
    db_cache_feedback(assessment_id, provider, model, feedback)
