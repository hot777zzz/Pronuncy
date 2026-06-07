from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.config import settings
from app.core.exceptions import PronuncyError
from app.core.handlers import generic_exception_handler, pronuncy_exception_handler
from app.core.logging import setup_logging
from app.db import init_db
from app.model_setup import ensure_model_selected

# .env path relative to backend/ directory: backend/app/main.py → backend/.env
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    ensure_model_selected(_ENV_PATH, settings)
    init_db(settings.db_path)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Pronuncy",
        version="0.2.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    app.add_exception_handler(PronuncyError, pronuncy_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, generic_exception_handler)

    return app


app = create_app()
