from fastapi import APIRouter

from .endpoints import agent, assess, audio, health, history, models

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(assess.router, tags=["assess"])
router.include_router(audio.router, tags=["audio"])
router.include_router(models.router, tags=["models"])
router.include_router(history.router, tags=["history"])
router.include_router(agent.router, tags=["agent"])
