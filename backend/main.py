from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Tuple, Optional, Dict
import sys
import os
from pathlib import Path

# Thêm thư mục gốc vào sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import từ thư mục local
from backend.services.question_generator import generate_questions_batch
from backend.database.vector_store import load_database, get_relevant_chunk

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories
static_dir = Path("static")
app.mount("/images", StaticFiles(directory=static_dir / "images"), name="images")
app.mount("/audio", StaticFiles(directory=static_dir / "audio"), name="audio")

class QuizRequest(BaseModel):
    prompt: str
    multiple_choice_count: int = 6
    image_count: int = 2
    voice_count: int = 2

class QuizOption(BaseModel):
    id: int
    text: str
    correct: bool
    imageSrc: Optional[str] = None
    audioSrc: Optional[str] = None

class QuizItem(BaseModel):
    id: int
    question: str
    challengeOptions: List[QuizOption]
    type: str
    explanation: str = ""
    imageUrl: Optional[str] = None
    audioUrl: Optional[str] = None

class QuizResponse(BaseModel):
    multiple_choice_questions: List[QuizItem]
    image_questions: List[QuizItem]
    voice_questions: List[QuizItem]

class ExplanationRequest(BaseModel):
    question: str
    correct_answer: str

@app.post("/api/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    print(f"Received request - prompt: {request.prompt}, mc: {request.multiple_choice_count}, img: {request.image_count}, voice: {request.voice_count}")
    try:
        # Tải database vector
        index = load_database()
        
        # Lấy text chunks liên quan đến prompt
        text_chunks = get_relevant_chunk(index, request.prompt, top_k=4)
        
        # Tạo câu hỏi từ chunks
        questions_data = generate_questions_batch(
            text_chunks,
            request.multiple_choice_count,
            request.image_count,
            request.voice_count
        )
        
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
                    quiz_item.imageUrl = f"/images/{q['image_url']}" if not q["image_url"].startswith("/") else q["image_url"]
                
                # Add audio URL for voice questions
                if "audio_url" in q:
                    quiz_item.audioUrl = f"/audio/{q['audio_url']}" if not q["audio_url"].startswith("/") else q["audio_url"]
                
                quiz_items.append(quiz_item)
            
            return quiz_items

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
async def generate_explanation(request: ExplanationRequest):
    print(f"Received request for explanation - question: {request.question}")
    try:
        from backend.services.question_generator import generate_explanation
        
        explanation = generate_explanation(request.question, request.correct_answer)
        print(f"Generated explanation: {explanation[:100]}...")
        
        return {"explanation": explanation}
    except Exception as e:
        print(f"Error generating explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# API endpoint mẫu
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Chạy với uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 