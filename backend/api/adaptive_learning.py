from fastapi import APIRouter, HTTPException
from backend.services.practice_service import practice_service
from backend.schemas.quiz import QuizUserRequest

router = APIRouter(prefix="/api/practice", tags=["practice"])
    
@router.post("/generate-again")
async def generate_adaptive_quiz(payload: QuizUserRequest):
    try:
        await practice_service.generate_practice_questions(payload.user_id, payload.quiz_id)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
