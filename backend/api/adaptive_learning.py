from fastapi import APIRouter, HTTPException
from backend.services.practice_service import practice_service
from backend.schemas.quiz import QuizUserRequest, QuizResponsewithLessonId

router = APIRouter(prefix="/api/practice", tags=["practice"])
    
@router.post("/generate-again")
async def generate_adaptive_quiz(payload: QuizUserRequest):
    try:
        # Generate questions and get result
        questions = await practice_service.generate_practice_questions(payload.user_id, payload.quiz_id)
        
        # Create response object
        result = QuizResponsewithLessonId(
            quiz_id=payload.quiz_id,
            lesson_id=questions.lesson_id,
            multiple_choice_questions=questions.get("multiple_choice_questions", []),
            image_questions=questions.get("image_questions", []),
            voice_questions=questions.get("voice_questions", []),
            pronunc_questions=questions.get("pronounc_questions", [])
        )

        print(f"Generated adaptive questions - MC: {len(result.multiple_choice_questions)}, "
              f"Image: {len(result.image_questions)}, "
              f"Voice: {len(result.voice_questions)}, "
              f"Pronunc: {len(result.pronunc_questions)}")
              
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
