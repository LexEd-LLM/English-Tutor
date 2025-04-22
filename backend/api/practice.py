from fastapi import APIRouter, HTTPException
from backend.schemas.quiz import PracticeHistory
from backend.services.practice_service import practice_service

router = APIRouter(prefix="/api/practice", tags=["practice"])

@router.post("/history")
async def save_practice_history(history: PracticeHistory):
    try:
        await practice_service.save_practice_history(history)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 