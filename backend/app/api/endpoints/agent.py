"""Agent feedback and chat endpoints — SSE streaming."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agent.gateway import stream_chat, stream_feedback
from app.schemas.agent import AgentChatRequest, AgentFeedbackRequest

router = APIRouter(prefix="/agent", tags=["agent"])


def _sse_response(generator, **extra_headers):
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            **extra_headers,
        },
    )


@router.post("/feedback")
async def agent_feedback(body: AgentFeedbackRequest):
    """Stream agent analysis for an assessment via SSE."""
    return _sse_response(
        stream_feedback(
            assessment_id=body.assessment_id,
            force=body.force,
            api_key=body.api_key,
            base_url=body.base_url,
            model=body.model,
        )
    )


@router.post("/chat")
async def agent_chat(body: AgentChatRequest):
    """Stream free-form agent conversation via SSE."""
    return _sse_response(
        stream_chat(
            message=body.message,
            session_id=body.session_id,
            api_key=body.api_key,
            base_url=body.base_url,
            model=body.model,
        )
    )
