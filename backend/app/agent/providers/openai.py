"""OpenAI-compatible provider with SSE streaming."""

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from .base import AgentEvent, AgentProvider


class OpenAIProvider(AgentProvider):
    """Provider for OpenAI-compatible APIs (OpenAI, DeepSeek, Qwen, etc.)."""

    def _build_body(
        self,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"
        return body

    async def chat_stream(
        self,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[AgentEvent]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body = self._build_body(model, messages, tools)

        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            async with client.stream("POST", url, json=body, headers=headers) as resp:
                if resp.status_code != 200:
                    text = await resp.aread()
                    yield AgentEvent(
                        type="done",
                        data={"error": f"API error {resp.status_code}: {text.decode()[:500]}"},
                    )
                    return

                tool_calls: dict[int, dict[str, Any]] = {}
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break

                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    choices = chunk.get("choices", [])
                    if not choices:
                        continue

                    delta = choices[0].get("delta", {})

                    # Handle reasoning/thinking content (DeepSeek, Qwen, etc.)
                    reasoning = delta.get("reasoning_content") or delta.get(
                        "thinking"
                    )
                    if reasoning:
                        yield AgentEvent(
                            type="thinking", data={"text": str(reasoning)}
                        )

                    # Handle tool calls
                    tc_deltas = delta.get("tool_calls", [])
                    for tc in tc_deltas:
                        idx = tc.get("index", 0)
                        if idx not in tool_calls:
                            tool_calls[idx] = {
                                "id": tc.get("id", ""),
                                "function": {"name": "", "arguments": ""},
                            }
                        tc_obj = tool_calls[idx]
                        if tc.get("id"):
                            tc_obj["id"] = tc["id"]
                        func = tc.get("function", {})
                        if func.get("name"):
                            tc_obj["function"]["name"] += func["name"]
                        if func.get("arguments"):
                            tc_obj["function"]["arguments"] += func["arguments"]

                    # Handle text content
                    content = delta.get("content")
                    if content:
                        yield AgentEvent(type="text", data={"text": str(content)})

                    # Emit complete tool calls when finish_reason is "tool_calls"
                    finish = choices[0].get("finish_reason")
                    if finish == "tool_calls" and tool_calls:
                        for tc in sorted(tool_calls.values(), key=lambda x: x["id"]):
                            try:
                                args = json.loads(tc["function"]["arguments"])
                            except json.JSONDecodeError:
                                args = {}
                            yield AgentEvent(
                                type="tool_call",
                                data={
                                    "id": tc["id"],
                                    "name": tc["function"]["name"],
                                    "arguments": args,
                                },
                            )
                        tool_calls.clear()

                yield AgentEvent(type="done", data={})
