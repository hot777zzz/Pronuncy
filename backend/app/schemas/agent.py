"""Schemas for agent feedback and chat endpoints."""

from pydantic import BaseModel, Field


class AgentApiConfig(BaseModel):
    """API configuration passed from frontend."""
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"


class AgentFeedbackRequest(BaseModel):
    assessment_id: str = Field(..., description="Assessment ID to get feedback for")
    force: bool = Field(False, description="Bypass cache and re-generate feedback")
    api_key: str = ""
    base_url: str = ""
    model: str = ""


class AgentChatRequest(BaseModel):
    message: str = Field(..., description="User's text message or STT result")
    session_id: str = Field(default="default")
    api_key: str = Field(..., min_length=1)
    base_url: str = Field(..., min_length=1)
    model: str = Field(..., min_length=1)
