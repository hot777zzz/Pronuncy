from fastapi import APIRouter

from app.config import settings
from app.model_setup import MODELS

router = APIRouter()


@router.get("/model")
async def current_model() -> dict:
    """Return current Whisper model and available options with metadata."""
    return {
        "current": settings.whisper_model,
        "available": [
            {
                "id": name,
                "size": info["size"],
                "accuracy": info["accuracy"],
                "desc": info["desc"],
                "recommended": info["recommended"],
            }
            for name, info in MODELS.items()
        ],
    }
