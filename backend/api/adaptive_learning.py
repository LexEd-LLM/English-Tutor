from fastapi import APIRouter, HTTPException
from backend.schemas.quiz import (
    PracticeHistory,
    QuizResponse,
    QuizAgainRequest,
)

from backend.schemas.quiz import PracticeHistory
from backend.services.practice_service import practice_service
from backend.services.quiz_service import quiz_service
from backend.services.unit_service import get_unit_main_chunks, get_unit_subordinate_chunks
from backend.api.quiz import convert_to_quiz_items

router = APIRouter(prefix="/api/practice", tags=["practice"])

@router.post("/history")
async def save_practice_history(history: PracticeHistory):
    try:
        await practice_service.save_practice_history(history)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
    
@router.post("/generate-again", response_model=QuizResponse)
async def generate_quiz_again(request: QuizAgainRequest):
    try:
        print("Start generate quiz again")
        # Get relevant chunks for the original prompt
        text_chunks = []
        for unit_id in request.unit_ids:
            unit_chunks = get_unit_main_chunks(unit_id)
            text_chunks.extend(unit_chunks)
        
        # Generate new questions based on practice history
        questions_data = await practice_service.generate_practice_questions(
            request.userId,
            request.wrongQuestions,
            request.originalPrompt,
            text_chunks
        )

        # Convert each question type to QuizItems
        multiple_choice_items = convert_to_quiz_items(questions_data["multiple_choice_questions"], 0)
        image_items = convert_to_quiz_items(questions_data["image_questions"], len(multiple_choice_items))
        voice_items = convert_to_quiz_items(questions_data["voice_questions"], len(multiple_choice_items) + len(image_items))
        
        # Save new questions to database
        quiz_service.save_new_questions(request.quizId, multiple_choice_items + image_items + voice_items)

        # Return only new questions
        result = QuizResponse(
            multiple_choice_questions=multiple_choice_items,
            image_questions=image_items,
            voice_questions=voice_items
        )

        print(f"Generated questions - MC: {len(multiple_choice_items)}, Image: {len(image_items)}, Voice: {len(voice_items)}")
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
