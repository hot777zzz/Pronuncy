"""CRUD functions for assessments, history, progress, and agent cache."""

import json
import sqlite3
from typing import Any

from .connection import get_db


def save_assessment(
    assessment_id: str,
    session_id: str,
    result: dict[str, Any],
) -> None:
    """Persist an assessment result and its alignment items to the database."""
    db = get_db()

    expected_json = json.dumps(result.get("expected_phones", []))
    recognized_json = json.dumps(result.get("recognized_phones", []))
    word_groups_json = json.dumps(result.get("word_groups", []))
    accent_tips_json = json.dumps(result.get("accent_tips", []))

    db.execute(
        """INSERT INTO assessments (
            id, session_id, target_text, recognized_text,
            overall_score, acoustic_score, expected_phones, recognized_phones,
            word_groups, accent_tips, trimmed_audio_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            assessment_id,
            session_id,
            result.get("target_text", ""),
            result.get("recognized_text"),
            result.get("overall_score", 0),
            result.get("acoustic_score"),
            expected_json,
            recognized_json,
            word_groups_json,
            accent_tips_json,
            result.get("trimmed_audio_url"),
        ),
    )

    alignment = result.get("alignment", [])
    for idx, item in enumerate(alignment):
        acoustic = item.get("acoustic") or {}
        db.execute(
            """INSERT INTO alignment_items (
                assessment_id, idx, expected_phone, recognized_phone,
                status, start_ms, end_ms,
                acoustic_quality, acoustic_score, acoustic_detail, acoustic_tip
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                assessment_id,
                idx,
                item.get("expected"),
                item.get("recognized"),
                item.get("status", "unknown"),
                item.get("start_ms"),
                item.get("end_ms"),
                acoustic.get("quality"),
                acoustic.get("score"),
                acoustic.get("detail"),
                acoustic.get("tip"),
            ),
        )

    overall = result.get("overall_score", 0)
    for idx, item in enumerate(alignment):
        expected = item.get("expected")
        if expected is None:
            continue
        acoustic = item.get("acoustic") or {}
        db.execute(
            """INSERT INTO phoneme_history (
                assessment_id, session_id, phoneme, recognized_as,
                status, acoustic_score, overall_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                assessment_id,
                session_id,
                expected,
                item.get("recognized"),
                item.get("status", "unknown"),
                acoustic.get("score"),
                overall,
            ),
        )

    db.commit()


def get_assessment(assessment_id: str) -> dict[str, Any] | None:
    """Reconstruct full assessment result from DB."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM assessments WHERE id = ?", (assessment_id,)
    ).fetchone()
    if row is None:
        return None

    alignment_rows = db.execute(
        "SELECT * FROM alignment_items WHERE assessment_id = ? ORDER BY idx",
        (assessment_id,),
    ).fetchall()

    alignment = []
    for a in alignment_rows:
        item: dict[str, Any] = {
            "expected": a["expected_phone"],
            "recognized": a["recognized_phone"],
            "status": a["status"],
            "start_ms": a["start_ms"],
            "end_ms": a["end_ms"],
        }
        if a["acoustic_quality"] is not None or a["acoustic_score"] is not None:
            item["acoustic"] = {
                "phoneme": a["expected_phone"],
                "quality": a["acoustic_quality"],
                "score": a["acoustic_score"],
                "detail": a["acoustic_detail"] or "",
                "tip": a["acoustic_tip"] or "",
                "start_ms": a["start_ms"] or 0,
                "end_ms": a["end_ms"] or 0,
            }
        else:
            item["acoustic"] = None
        alignment.append(item)

    return {
        "assessment_id": row["id"],
        "session_id": row["session_id"],
        "overall_score": row["overall_score"],
        "acoustic_score": row["acoustic_score"],
        "alignment": alignment,
        "expected_phones": json.loads(row["expected_phones"]),
        "recognized_phones": json.loads(row["recognized_phones"]),
        "target_text": row["target_text"],
        "recognized_text": row["recognized_text"],
        "word_groups": json.loads(row["word_groups"]),
        "accent_tips": json.loads(row["accent_tips"]),
        "trimmed_audio_url": row["trimmed_audio_url"],
        "created_at": row["created_at"],
    }


def list_history(
    session_id: str, limit: int = 20, offset: int = 0
) -> list[dict[str, Any]]:
    """Return recent assessment summaries for a session."""
    db = get_db()
    rows = db.execute(
        """SELECT id, target_text, overall_score, acoustic_score, created_at
           FROM assessments
           WHERE session_id = ?
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?""",
        (session_id, limit, offset),
    ).fetchall()
    return [dict(r) for r in rows]


def get_phoneme_history(
    session_id: str, phoneme: str | None = None, limit: int = 50
) -> list[dict[str, Any]]:
    """Return phoneme history entries for a session, optionally filtered."""
    db = get_db()
    if phoneme:
        rows = db.execute(
            """SELECT * FROM phoneme_history
               WHERE session_id = ? AND phoneme = ?
               ORDER BY created_at DESC
               LIMIT ?""",
            (session_id, phoneme, limit),
        ).fetchall()
    else:
        rows = db.execute(
            """SELECT * FROM phoneme_history
               WHERE session_id = ?
               ORDER BY created_at DESC
               LIMIT ?""",
            (session_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def get_progress(
    session_id: str, phoneme: str | None = None
) -> list[dict[str, Any]]:
    """Return per-phoneme aggregated progress stats."""
    db = get_db()
    if phoneme:
        rows = db.execute(
            """SELECT
                   phoneme,
                   COUNT(*) AS total_attempts,
                   SUM(CASE WHEN status = 'correct' THEN 1 ELSE 0 END) AS correct_count,
                   AVG(acoustic_score) AS average_acoustic,
                   AVG(overall_score) AS average_overall,
                   MAX(created_at) AS last_practiced
               FROM phoneme_history
               WHERE session_id = ? AND phoneme = ?
               GROUP BY phoneme""",
            (session_id, phoneme),
        ).fetchall()
    else:
        rows = db.execute(
            """SELECT
                   phoneme,
                   COUNT(*) AS total_attempts,
                   SUM(CASE WHEN status = 'correct' THEN 1 ELSE 0 END) AS correct_count,
                   AVG(acoustic_score) AS average_acoustic,
                   AVG(overall_score) AS average_overall,
                   MAX(created_at) AS last_practiced
               FROM phoneme_history
               WHERE session_id = ?
               GROUP BY phoneme
               ORDER BY total_attempts DESC""",
            (session_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_recent_history_for_phoneme(
    session_id: str, phoneme: str, limit: int = 10
) -> list[dict[str, Any]]:
    """Return recent attempts for a specific phoneme (used by agent tools)."""
    db = get_db()
    rows = db.execute(
        """SELECT assessment_id, status, recognized_as, acoustic_score,
                  overall_score, created_at
           FROM phoneme_history
           WHERE session_id = ? AND phoneme = ?
           ORDER BY created_at DESC
           LIMIT ?""",
        (session_id, phoneme, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def get_session_stats(session_id: str) -> dict[str, Any]:
    """Return aggregate statistics for a session (used by agent tools)."""
    db = get_db()
    stats = db.execute(
        """SELECT
               COUNT(*) AS total_assessments,
               AVG(overall_score) AS avg_overall_score,
               AVG(acoustic_score) AS avg_acoustic_score
           FROM assessments
           WHERE session_id = ?""",
        (session_id,),
    ).fetchone()

    top_errors = db.execute(
        """SELECT phoneme, COUNT(*) AS error_count
           FROM phoneme_history
           WHERE session_id = ? AND status != 'correct'
           GROUP BY phoneme
           ORDER BY error_count DESC
           LIMIT 5""",
        (session_id,),
    ).fetchall()

    return {
        "total_assessments": stats["total_assessments"] or 0,
        "avg_overall_score": stats["avg_overall_score"],
        "avg_acoustic_score": stats["avg_acoustic_score"],
        "top_error_phonemes": [dict(r) for r in top_errors],
    }


def cache_feedback(
    assessment_id: str, provider: str, model: str, feedback: dict[str, Any]
) -> None:
    """Store agent feedback in cache."""
    db = get_db()
    db.execute(
        """INSERT OR REPLACE INTO agent_feedback_cache
           (assessment_id, provider, model, feedback_json)
           VALUES (?, ?, ?, ?)""",
        (assessment_id, provider, model, json.dumps(feedback, ensure_ascii=False)),
    )
    db.commit()


def get_cached_feedback(assessment_id: str) -> dict[str, Any] | None:
    """Retrieve cached agent feedback, or None."""
    db = get_db()
    row = db.execute(
        "SELECT feedback_json FROM agent_feedback_cache WHERE assessment_id = ?",
        (assessment_id,),
    ).fetchone()
    if row is None:
        return None
    return json.loads(row["feedback_json"])
