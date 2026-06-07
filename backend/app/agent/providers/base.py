"""Agent provider abstraction layer."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentEvent:
    """Normalized streaming event from any LLM provider."""

    type: str  # "thinking" | "tool_call" | "tool_result" | "text" | "done"
    data: dict[str, Any] = field(default_factory=dict)


class AgentProvider(ABC):
    """Abstract LLM provider with tool-calling support."""

    def __init__(self, api_key: str, base_url: str | None = None):
        self.api_key = api_key
        self.base_url = base_url

    @abstractmethod
    async def chat_stream(
        self,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[AgentEvent]:
        """Stream chat completion, yielding normalized AgentEvents.

        The provider handles tool call parsing and emits:
        - "thinking" events for reasoning content
        - "tool_call" events when the model requests a tool
        - "text" events for final output chunks
        - "done" when the stream completes
        """
        ...
