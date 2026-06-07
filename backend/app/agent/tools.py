"""Agent tools for querying pronunciation history and patterns."""

import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from app.db import (
    get_assessment as db_get_assessment,
)
from app.db import (
    get_recent_history_for_phoneme,
    get_session_stats,
)


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable


async def _query_phoneme_history(
    assessment: dict, args: dict
) -> dict[str, Any]:
    """Look up historical data for a specific phoneme."""
    session_id = assessment.get("session_id", "")
    phoneme = args.get("phoneme", "")
    limit = args.get("limit", 10)

    rows = get_recent_history_for_phoneme(session_id, phoneme, limit=limit)

    correct = sum(1 for r in rows if r["status"] == "correct")
    total = len(rows)

    return {
        "phoneme": phoneme,
        "total_attempts": total,
        "correct_count": correct,
        "accuracy": round(correct / total * 100, 1) if total > 0 else 0,
        "recent_attempts": [
            {
                "status": r["status"],
                "acoustic_score": r["acoustic_score"],
                "overall_score": r["overall_score"],
                "date": r["created_at"],
            }
            for r in rows[:5]
        ],
    }


async def _analyze_error_patterns(
    assessment: dict, args: dict
) -> dict[str, Any]:
    """Analyze error patterns in the current assessment's alignment."""
    alignment = assessment.get("alignment", [])
    errors: list[dict] = []
    for a in alignment:
        if a.get("status") != "correct":
            acoustic = a.get("acoustic") or {}
            errors.append(
                {
                    "expected": a.get("expected"),
                    "recognized": a.get("recognized"),
                    "status": a.get("status"),
                    "acoustic_quality": acoustic.get("quality"),
                }
            )

    # Count by expected phoneme
    by_phoneme: dict[str, int] = {}
    for e in errors:
        ph = e["expected"] or "?"
        by_phoneme[ph] = by_phoneme.get(ph, 0) + 1

    # Sort by frequency
    sorted_phonemes = sorted(by_phoneme.items(), key=lambda x: -x[1])

    # Identify substitution patterns
    substitution_pairs: dict[str, int] = {}
    for e in errors:
        if e["status"] == "substitution":
            pair = f"{e['expected']} → {e['recognized']}"
            substitution_pairs[pair] = substitution_pairs.get(pair, 0) + 1

    return {
        "total_errors": len(errors),
        "most_frequent_error_phonemes": [
            {"phoneme": ph, "count": c} for ph, c in sorted_phonemes[:5]
        ],
        "substitution_patterns": sorted(
            substitution_pairs.items(), key=lambda x: -x[1]
        ),
        "error_types": {
            "substitution": sum(1 for e in errors if e["status"] == "substitution"),
            "deletion": sum(1 for e in errors if e["status"] == "deletion"),
            "insertion": sum(1 for e in errors if e["status"] == "insertion"),
        },
    }


async def _compare_progress(
    assessment: dict, args: dict
) -> dict[str, Any]:
    """Compare current assessment with historical averages."""
    session_id = assessment.get("session_id", "")
    stats = get_session_stats(session_id)
    current_overall = assessment.get("overall_score", 0)
    current_acoustic = assessment.get("acoustic_score", 0) or 0

    avg_overall = stats.get("avg_overall_score") or 0
    avg_acoustic = stats.get("avg_acoustic_score") or 0

    parts = []
    if avg_overall and current_overall > avg_overall:
        parts.append(f"Your overall score of {current_overall:.0f} is above your average of {avg_overall:.0f} — keep it up!")
    elif avg_overall:
        parts.append(f"Your overall score of {current_overall:.0f} is below your average of {avg_overall:.0f}. Room for improvement!")

    if avg_acoustic and current_acoustic > avg_acoustic:
        parts.append(f"Acoustic quality ({current_acoustic:.0f}) is above your average ({avg_acoustic:.0f}).")
    elif avg_acoustic:
        parts.append(f"Acoustic quality ({current_acoustic:.0f}) is below your average ({avg_acoustic:.0f}).")

    return {
        "total_assessments": stats["total_assessments"],
        "avg_overall_score": round(avg_overall, 1) if avg_overall else None,
        "avg_acoustic_score": round(avg_acoustic, 1) if avg_acoustic else None,
        "current_overall_score": current_overall,
        "current_acoustic_score": current_acoustic,
        "top_error_phonemes": stats.get("top_error_phonemes", []),
        "comparison": " ".join(parts) if parts else "No previous data for comparison.",
    }


TOOL_REGISTRY: dict[str, ToolDefinition] = {
    "query_phoneme_history": ToolDefinition(
        name="query_phoneme_history",
        description="查询特定音素的发音历史数据。查看用户过去对这个音素的发音表现，包括正确率和趋势。Use when the user has errors on a specific phoneme.",
        parameters={
            "type": "object",
            "properties": {
                "phoneme": {
                    "type": "string",
                    "description": "IPA音素符号，如 'θ', 'æ', 'ɪ'",
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "返回的历史记录数量",
                },
            },
            "required": ["phoneme"],
        },
        handler=_query_phoneme_history,
    ),
    "analyze_error_patterns": ToolDefinition(
        name="analyze_error_patterns",
        description="分析当前评估中所有的音素错误模式。找出最常见的错误音素、替代模式以及错误类型分布。Use when there are 3+ error phonemes to find systematic patterns.",
        parameters={"type": "object", "properties": {}},
        handler=_analyze_error_patterns,
    ),
    "compare_progress": ToolDefinition(
        name="compare_progress",
        description="对比当前评估与历史平均水平，评估进步或退步情况。返回总体统计数据对比和最常见的错误音素。Use when user has prior assessments to contextualize this attempt.",
        parameters={"type": "object", "properties": {}},
        handler=_compare_progress,
    ),
}


def build_openai_tools() -> list[dict[str, Any]]:
    """Convert TOOL_REGISTRY to OpenAI-compatible function definitions."""
    tools = []
    for t in TOOL_REGISTRY.values():
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
        )
    return tools


async def execute_tool(
    name: str, assessment: dict, args: dict
) -> dict[str, Any]:
    """Execute a registered tool by name and return the result."""
    tool = TOOL_REGISTRY.get(name)
    if tool is None:
        return {"error": f"Unknown tool: {name}"}
    return await tool.handler(assessment, args)
