from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class QuestionType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VOICE = "voice"
    PRONUNCIATION = "pronunciation"

class QuizOption(BaseModel):
    id: int
    text: str
    correct: bool
    imageSrc: Optional[str] = None
    audioSrc: Optional[str] = None

class QuizItem(BaseModel):
    id: int
    question: str
    challengeOptions: Optional[List[QuizOption]] = []
    type: QuestionType
    explanation: str = ""
    imageUrl: Optional[str] = None
    audioUrl: Optional[str] = None
    correctAnswer: Optional[str] = None

class QuizRequest(BaseModel):
    user_id: str
    unit_ids: List[int]
    dok_level: Optional[List[int]] = None
    prompt: Optional[str] = None
    multiple_choice_count: int = 3
    image_count: int = 1
    voice_count: int = 1

class QuizResponse(BaseModel):
    quiz_id: int
    multiple_choice_questions: List[QuizItem]
    image_questions: List[QuizItem]
    voice_questions: List[QuizItem]
    pronunc_questions: List[QuizItem]
    
class QuizAnswer(BaseModel):
    questionId: int
    userAnswer: str
    userPhonemes: Optional[str] = None
    
class QuizSubmission(BaseModel):
    userId: str
    quizId: int 
    answers: List[QuizAnswer]
    
class ExplanationRequest(BaseModel):
    question_id: int = Field(alias="questionId")
    question_text: str = Field(alias="questionText")
    correct_answer: str = Field(alias="correctAnswer")
    user_answer: str = Field(alias="userAnswer")
    type: str

    class Config:
        populate_by_name = True

class QuizQuestionWithUserAnswer(BaseModel):
    id: int
    questionId: int
    questionText: str
    type: str
    options: Optional[List[dict]]
    correctAnswer: str
    explanation: Optional[str]
    imageUrl: Optional[str]
    audioUrl: Optional[str]
    userAnswer: Optional[str]
    isCorrect: Optional[bool]
    userPhonemes: Optional[str]
    
class QuizUserRequest(BaseModel):
    user_id: str
    quiz_id: int
    
class QuizResponsewithLessonId(BaseModel):
    quiz_id: int
    lesson_id: int
    multiple_choice_questions: List[QuizItem]
    image_questions: List[QuizItem]
    voice_questions: List[QuizItem]
    pronunc_questions: List[QuizItem]