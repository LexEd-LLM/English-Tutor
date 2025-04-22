from fastapi import APIRouter
from backend.api import quiz, practice, user, health

api_router = APIRouter()

# Include all routers
api_router.include_router(quiz.router, prefix="/api/quiz")
api_router.include_router(practice.router)
api_router.include_router(user.router)
api_router.include_router(health.router) 