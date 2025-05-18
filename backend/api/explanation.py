import psycopg2
from backend.services.explanation_generator import generate_explanation_mcq, generate_explanation_pronunciation, generate_explanation_image
from backend.schemas.quiz import ExplanationRequest
from fastapi import APIRouter, HTTPException
from backend.database import get_db

router = APIRouter(tags=["explanation"], prefix="/api/quiz")

@router.post("/generate-explanation")
async def generate_explanation_api(request: ExplanationRequest):
    try:
        if request.type == "PRONUNCIATION":
            explanation = await generate_explanation_pronunciation(
                question=request.question_text, 
                correct_answer=request.correct_answer, 
                user_answer=request.user_answer
            )
        elif request.type == "IMAGE":
            explanation = await generate_explanation_image(request.options)
        else:
            explanation = await generate_explanation_mcq(
                question=request.question_text, 
                correct_answer=request.correct_answer, 
                user_answer=request.user_answer,
                options=request.options
            )
        conn = get_db()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Update quiz_questions: lưu explanation
            cur.execute("""
                UPDATE quiz_questions 
                SET explanation = %s 
                WHERE id = %s
            """, (
                explanation,
                request.question_id
            ))

        conn.commit()

        return {
            "explanation": explanation,
            "saved": True
        }

    except Exception as e:
        return {
            "error": str(e),
            "saved": False
        }