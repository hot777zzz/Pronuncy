"""Agent gateway — orchestrates LLM streaming with tool execution loop."""

import json
import logging

from app.config import settings
from app.db import get_assessment

from .cache import get_cached, save
from .prompts import CHAT_SYSTEM_PROMPT, SYSTEM_PROMPT, build_user_message
from .providers import OpenAIProvider
from .tools import build_openai_tools, execute_tool

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 5

SECTION_MARKERS = {
    "### Accent Task Matching": "accent_tasks",
    "### Speaking Suggestions": "speaking_suggestions",
    "### Improvement Plan": "improvement_plan",
    "### 口音任务匹配": "accent_tasks",
    "### 口语优化建议": "speaking_suggestions",
    "### 个性化改进方案": "improvement_plan",
}


def _detect_section(text: str) -> str | None:
    for marker, section_id in SECTION_MARKERS.items():
        if marker in text:
            return section_id
    return None


def _make_provider(api_key: str, base_url: str):
    key = api_key or settings.agent_api_key
    url = (base_url or settings.agent_base_url).rstrip("/")
    return OpenAIProvider(api_key=key, base_url=url)


def _sse(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def stream_feedback(
    assessment_id: str,
    force: bool = False,
    api_key: str = "",
    base_url: str = "",
    model: str = "",
):
    """SSE generator for assessment feedback with optional external API config."""
    if not force:
        cached = get_cached(assessment_id)
        if cached:
            for section_id, content in cached.items():
                if section_id not in ("_meta",):
                    yield _sse("section", {"section": section_id, "content": content})
            yield _sse("done", {"assessment_id": assessment_id, "cached": True})
            return

    assessment = get_assessment(assessment_id)
    if assessment is None:
        yield _sse("done", {"error": f"Assessment {assessment_id} not found"})
        return

    model_name = model or settings.agent_model
    provider = _make_provider(api_key, base_url)

    yield _sse("thinking", {"text": "正在加载你的评估数据..."})

    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_message(assessment)},
    ]
    tools = build_openai_tools()

    sections = {"accent_tasks": "", "speaking_suggestions": "", "improvement_plan": ""}
    sse_events: list[str] = []
    current_section: str | None = None

    for _round_num in range(1, MAX_TOOL_ROUNDS + 1):
        tool_calls_in_round: list[dict] = []

        async for event in provider.chat_stream(model=model_name, messages=messages, tools=tools):
            sse_line = None

            if event.type == "thinking":
                sse_line = _sse("thinking", event.data)

            elif event.type == "tool_call":
                tc_data = event.data
                sse_line = _sse("tool_call", {
                    "id": tc_data.get("id"),
                    "name": tc_data.get("name"),
                    "arguments": tc_data.get("arguments"),
                })
                tool_calls_in_round.append(tc_data)

            elif event.type == "text":
                text = event.data.get("text", "")
                detected = _detect_section(text)
                if detected:
                    current_section = detected
                    yield _sse("section", {"section": detected})
                elif current_section:
                    sections[current_section] += text
                sse_line = _sse("text", {"text": text, "section": current_section})

            elif event.type == "done":
                if event.data.get("error"):
                    yield _sse("done", {"error": event.data["error"]})
                    return

            if sse_line:
                yield sse_line

        if not tool_calls_in_round:
            break

        assistant_msg: dict = {"role": "assistant", "content": None, "tool_calls": []}
        for tc in tool_calls_in_round:
            assistant_msg["tool_calls"].append({
                "id": tc["id"],
                "type": "function",
                "function": {
                    "name": tc["name"],
                    "arguments": json.dumps(tc["arguments"], ensure_ascii=False),
                },
            })
            result = await execute_tool(tc["name"], assessment, tc["arguments"])
            yield _sse("tool_result", {"tool": tc["name"], "result": result})
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": json.dumps(result, ensure_ascii=False),
            })

        messages.append(assistant_msg)

    # Cache result
    save(
        assessment_id,
        "openai",
        model_name,
        {
            "accent_tasks": sections["accent_tasks"],
            "speaking_suggestions": sections["speaking_suggestions"],
            "improvement_plan": sections["improvement_plan"],
        },
    )

    for section_id, content in sections.items():
        if content:
            yield _sse("section", {"section": section_id, "content": content.strip()})

    yield _sse("done", {"assessment_id": assessment_id, "cached": False})


async def stream_chat(
    message: str,
    session_id: str,
    api_key: str,
    base_url: str,
    model: str,
):
    """SSE generator for free-form agent chat (no assessment data)."""
    provider = _make_provider(api_key, base_url)

    yield _sse("thinking", {"text": "思考中..."})

    messages: list[dict] = [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT},
        {"role": "user", "content": message},
    ]

    async for event in provider.chat_stream(model=model, messages=messages):
        if event.type == "thinking":
            yield _sse("thinking", event.data)
        elif event.type == "text":
            yield _sse("text", {"text": event.data.get("text", ""), "section": None})
        elif event.type == "done":
            if event.data.get("error"):
                yield _sse("done", {"error": event.data["error"]})
                return

    yield _sse("done", {})
