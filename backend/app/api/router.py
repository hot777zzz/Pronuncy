from fastapi import APIRouter

from .endpoints import assess, audio, health

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(assess.router, tags=["assess"])
router.include_router(audio.router, tags=["audio"])
