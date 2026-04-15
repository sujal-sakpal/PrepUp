"""Session routes for configured interview session lifecycle."""

from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_db
from app.models.session import SessionCreateRequest, SessionListResponse, SessionResponse
from app.models.user import UserResponse
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
	payload: SessionCreateRequest,
	current_user: UserResponse = Depends(get_current_user),
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> SessionResponse:
	"""Create a new configured interview session for the authenticated user."""
	service = SessionService(db)
	return await service.create_session(current_user.id, payload)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
	skip: int = Query(default=0, ge=0),
	limit: int = Query(default=20, ge=1, le=100),
	current_user: UserResponse = Depends(get_current_user),
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> SessionListResponse:
	"""List interview sessions for the authenticated user."""
	service = SessionService(db)
	return await service.list_sessions(current_user.id, skip=skip, limit=limit)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session_by_id(
	session_id: str,
	current_user: UserResponse = Depends(get_current_user),
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> SessionResponse:
	"""Get one interview session owned by the authenticated user."""
	service = SessionService(db)
	return await service.get_session_by_id(current_user.id, session_id)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
	session_id: str,
	current_user: UserResponse = Depends(get_current_user),
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> None:
	"""Delete an interview session owned by the authenticated user."""
	service = SessionService(db)
	await service.delete_session(current_user.id, session_id)
