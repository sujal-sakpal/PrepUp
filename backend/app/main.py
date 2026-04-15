"""FastAPI application entrypoint for the AI Interview Platform backend."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import close_mongo_connection, connect_to_mongo
from app.exceptions import AppError
from app.routers.analysis import router as analysis_router
from app.routers.auth import router as auth_router
from app.routers.sessions import router as session_router
from app.services.audio_service import AudioService


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
	"""Manage application startup and shutdown resources."""
	AudioService.validate_runtime_configuration()
	await connect_to_mongo()
	yield
	await close_mongo_connection()


app = FastAPI(
	title=settings.app_name,
	version=settings.app_version,
	debug=settings.debug,
	lifespan=lifespan,
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=[settings.frontend_url],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
	"""Simple health endpoint for service checks."""
	return {"status": "ok"}


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
	"""Serialize custom AppError exceptions into JSON API responses."""
	return JSONResponse(
		status_code=exc.status_code,
		content={"detail": str(exc), "type": type(exc).__name__},
	)


app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(session_router,prefix=settings.api_prefix)
app.include_router(analysis_router, prefix=settings.api_prefix)
