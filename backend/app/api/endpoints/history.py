"""History and progress endpoints."""

from fastapi import APIRouter, Query

from app.core.exceptions import NotFoundError
from app.db import (
    get_assessment,
    get_phoneme_history,
    get_progress,
    list_history,
)
from app.schemas.history import (
    HistoryItem,
    HistoryListResponse,
    PhonemeProgress,
    ProgressPoint,
    ProgressResponse,
)

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryListResponse)
async def history_list(
    session_id: str = Query(..., description="Client session ID"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List recent assessment summaries for a session."""
    items = list_history(session_id, limit=limit, offset=offset)
    return HistoryListResponse(
        items=[HistoryItem(**item) for item in items],
        total=len(items),
    )


@router.get("/{assessment_id}")
async def history_detail(assessment_id: str):
    """Retrieve a full assessment result by ID."""
    result = get_assessment(assessment_id)
    if result is None:
        raise NotFoundError(f"Assessment {assessment_id} not found")
    return result


@router.get("/progress", response_model=ProgressResponse)
async def progress(
    session_id: str = Query(..., description="Client session ID"),
    phoneme: str | None = Query(None, description="Filter by IPA phoneme"),
):
    """Return per-phoneme aggregated progress stats."""
    stats = get_progress(session_id, phoneme=phoneme)

    phonemes: list[PhonemeProgress] = []
    for s in stats:
        ph = s["phoneme"]
        history_rows = get_phoneme_history(session_id, phoneme=ph, limit=10)
        phonemes.append(
            PhonemeProgress(
                phoneme=ph,
                total_attempts=s["total_attempts"],
                correct_count=s["correct_count"],
                average_acoustic=s["average_acoustic"],
                average_overall=s["average_overall"],
                last_practiced=s["last_practiced"],
                recent_history=[
                    ProgressPoint(
                        assessment_id=r["assessment_id"],
                        status=r["status"],
                        recognized_as=r["recognized_as"],
                        acoustic_score=r["acoustic_score"],
                        overall_score=r["overall_score"],
                        created_at=r["created_at"],
                    )
                    for r in history_rows
                ],
            )
        )
    return ProgressResponse(phonemes=phonemes)
