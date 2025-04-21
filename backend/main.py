from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Tuple, Optional, Dict, Any
import sys
import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
import json

# Thêm thư mục gốc vào sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import từ thư mục local
from backend.services.question_generator import generate_questions_batch, generate_explanation
from backend.schemas.quiz import (
    WrongQuestion,
    PracticeHistory,
    QuizItem,
    QuizOption,
    QuizRequest,
    QuizResponse,
    ExplanationRequest,
    QuizAgainRequest
)
from backend.services.practice_service import practice_service
from backend.services.quiz_service import quiz_service
from backend.services.unit_service import get_unit_chunks
from backend.database import get_db

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories to serve files from frontend/public
frontend_public_dir = Path("../frontend/public")
# Tạo thư mục nếu chưa tồn tại
(frontend_public_dir / "images").mkdir(parents=True, exist_ok=True)
(frontend_public_dir / "audio").mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=frontend_public_dir / "images"), name="images")
app.mount("/audio", StaticFiles(directory=frontend_public_dir / "audio"), name="audio")

# Chuyển đổi định dạng từ backend sang frontend
def convert_to_quiz_items(questions: List[dict], start_id: int = 0) -> List[QuizItem]:
    quiz_items = []
    for idx, q in enumerate(questions):
        challenge_options = []
        for i, option in enumerate(q["options"]):
            is_correct = option == q["correct_answer"]
            challenge_options.append(
                QuizOption(
                    id=i+1,
                    text=option,
                    correct=is_correct,
                    imageSrc=None,
                    audioSrc=None
                )
            )
        
        quiz_item = QuizItem(
            id=start_id + idx + 1,
            question=q["question"],
            challengeOptions=challenge_options,
            type=q["type"].upper(),
            explanation=q.get("explanation", "")
        )
        
        # Add image URL for image questions
        if "image_url" in q:
            quiz_item.imageUrl = q["image_url"]
        
        # Add audio URL for voice questions
        if "audio_url" in q:
            quiz_item.audioUrl = q["audio_url"]
        
        quiz_items.append(quiz_item)
    
    return quiz_items
        
@app.post("/api/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    print(f"Received request - units: {request.unit_ids}, prompt: {request.prompt}, mc: {request.multiple_choice_count}, img: {request.image_count}, voice: {request.voice_count}")
    try:       
        # Lấy text chunks liên quan đến unit
        text_chunks = []
        for unit_id in request.unit_ids:
            unit_chunks = get_unit_chunks(unit_id)
            text_chunks.extend(unit_chunks)

        # Generate questions from chunks
        questions_data = generate_questions_batch(
            text_chunks=text_chunks,
            multiple_choice_count=request.multiple_choice_count,
            image_count=request.image_count,
            voice_count=request.voice_count,
            custom_prompt=request.prompt
        )
        
        # Convert each question type
        multiple_choice_items = convert_to_quiz_items(questions_data["multiple_choice_questions"], 0)
        image_items = convert_to_quiz_items(questions_data["image_questions"], len(multiple_choice_items))
        voice_items = convert_to_quiz_items(questions_data["voice_questions"], len(multiple_choice_items) + len(image_items))
        
        result = QuizResponse(
            multiple_choice_questions=multiple_choice_items,
            image_questions=image_items,
            voice_questions=voice_items
        )

        print(f"Generated questions - MC: {len(multiple_choice_items)}, Image: {len(image_items)}, Voice: {len(voice_items)}")
        return result
    
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-explanation")
async def generate_explanation_api(request: ExplanationRequest):
    print(f"Received request for explanation - question: {request.question}")
    try:
        explanation = generate_explanation(
            question=request.question, 
            correct_answer=request.correct_answer, 
            user_answer=request.user_answer
        )
        print(f"Generated explanation: {explanation[:100]}...")
        
        return {"explanation": explanation}
    except Exception as e:
        print(f"Error generating explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# API endpoint mẫu
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/generate-quiz-again", response_model=QuizResponse)
async def generate_quiz_again(request: QuizAgainRequest):
    try:
        print("Start generate quiz again")
        # Get relevant chunks for the original prompt
        text_chunks = []
        for unit_id in request.unit_ids:
            unit_chunks = get_unit_chunks(unit_id)
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

@app.post("/api/practice/history")
async def save_practice_history(history: PracticeHistory):
    try:
        await practice_service.save_practice_history(history)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/practice/complete/{user_id}")
async def complete_practice(user_id: str):
    """Clear user's learning profile after completing practice session."""
    try:
        await practice_service.clear_user_profile(user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user-progress/{user_id}")
async def get_user_progress(user_id: str):
    """Get user progress including hearts"""
    try:
        conn = get_db()
        try:
            with conn.cursor() as cur:
                # Check if user exists first
                cur.execute("""
                    SELECT id, hearts
                    FROM users
                    WHERE id = %s
                """, (user_id,))
                result = cur.fetchone()
                
                if not result:
                    print(f"User {user_id} not found")
                    return {"hearts": 5}  # Default hearts if user not found
                
                # Handle null hearts value
                hearts = result['hearts'] if result['hearts'] is not None else 5
                print(f"Found user {user_id} with {hearts} hearts")
                return {"hearts": hearts}
        finally:
            conn.close()
    except Exception as e:
        print(f"Error getting user progress: {str(e)}")
        # Return default hearts instead of error
        return {"hearts": 5}

# Chạy với uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 