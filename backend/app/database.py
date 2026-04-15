"""MongoDB connection lifecycle management for the FastAPI app."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
	"""Create and cache the MongoDB client and database handle."""
	global _client, _database

	if _client is not None and _database is not None:
		return

	_client = AsyncIOMotorClient(settings.mongodb_url)
	_database = _client[settings.mongodb_db_name]


async def close_mongo_connection() -> None:
	"""Close the MongoDB client connection and clear cached handles."""
	global _client, _database

	if _client is not None:
		_client.close()

	_client = None
	_database = None


def get_database() -> AsyncIOMotorDatabase:
	"""Return the active MongoDB database handle.

	Raises:
		RuntimeError: If the database has not been initialized during startup.
	"""
	if _database is None:
		raise RuntimeError("Database not initialized. Ensure app startup completed.")

	return _database
