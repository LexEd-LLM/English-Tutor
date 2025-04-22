from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from backend.api import quiz, adaptive_learning, user, health, pronunciation

api_router = APIRouter()

# Include all routers
api_router.include_router(quiz.router, prefix="/api/quiz")
api_router.include_router(adaptive_learning.router)
api_router.include_router(user.router)
api_router.include_router(health.router)
api_router.include_router(pronunciation.router, prefix="/api")

# Thêm route chuyển hướng để giữ khả năng tương thích với đường dẫn cũ
@api_router.post("/api/generate-quiz")
async def legacy_generate_quiz():
    return RedirectResponse(url="/api/quiz/generate", status_code=307)

@api_router.post("/api/generate-explanation")
async def legacy_generate_explanation():
    return RedirectResponse(url="/api/quiz/generate-explanation", status_code=307)

@api_router.post("/api/generate-quiz-again")
async def legacy_generate_quiz_again():
    return RedirectResponse(url="/api/quiz/generate-again", status_code=307)

@api_router.post("/api/submit-quiz")
async def legacy_submit_quiz():
    return RedirectResponse(url="/api/quiz/submit", status_code=307)

@api_router.get("/api/quiz/{quiz_id}")
async def legacy_get_quiz(quiz_id: int):
    return RedirectResponse(url=f"/api/quiz/{quiz_id}", status_code=307) 