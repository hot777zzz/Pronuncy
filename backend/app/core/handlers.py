from fastapi import Request
from fastapi.responses import JSONResponse

from .exceptions import (
    AudioDecodeError,
    NotFoundError,
    PronuncyError,
    ValidationError,
)


async def pronuncy_exception_handler(
    request: Request, exc: PronuncyError
) -> JSONResponse:
    status = 500
    if isinstance(exc, ValidationError):
        status = 400
    elif isinstance(exc, NotFoundError):
        status = 404
    elif isinstance(exc, AudioDecodeError):
        status = 422
    return JSONResponse(status_code=status, content={"error": str(exc)})


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )
