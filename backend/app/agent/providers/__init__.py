from app.config import settings

from .base import AgentProvider
from .openai import OpenAIProvider

__all__ = ["AgentProvider", "AgentEvent", "get_provider"]


def get_provider() -> AgentProvider:
    """Create an AgentProvider from current settings."""
    name = settings.agent_provider
    if name == "openai":
        base_url = settings.agent_base_url.rstrip("/")
        return OpenAIProvider(api_key=settings.agent_api_key, base_url=base_url)
    raise ValueError(f"Unknown agent provider: {name}")
