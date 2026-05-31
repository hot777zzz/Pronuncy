from pathlib import Path

from fastapi import APIRouter, HTTPException
from starlette.responses import FileResponse

from app.services.phoneme_pipeline import TRIMMED_DIR

router = APIRouter()


@router.get("/audio/{filename}")
async def serve_audio(filename: str) -> FileResponse:
    path = TRIMMED_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")
    if path.suffix != ".wav":
        raise HTTPException(status_code=404, detail="Invalid audio file")
    return FileResponse(
        path,
        media_type="audio/wav",
        headers={"Cache-Control": "public, max-age=600"},
    )
