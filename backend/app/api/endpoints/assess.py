from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.exceptions import ValidationError
from app.schemas.assess import AssessResponse
from app.services.phoneme_pipeline import PhonemePipeline

router = APIRouter()


def get_pipeline() -> PhonemePipeline:
    return PhonemePipeline()


@router.post("/assess", response_model=AssessResponse)
async def assess(
    audio: UploadFile = File(...),
    target_text: str = Form(...),
    pipeline: PhonemePipeline = Depends(get_pipeline),
) -> dict[str, Any]:
    if not target_text.strip():
        raise ValidationError("target_text is required")

    audio_bytes = await audio.read()
    if len(audio_bytes) < 100:
        raise ValidationError("audio file is too small or empty")

    result = pipeline.assess(audio_bytes, target_text.strip())
    return result
