from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class QuestionType(str, Enum):
    FILL_IN_BLANK = "FILL_IN_BLANK"
    TRANSLATION = "TRANSLATION"
    IMAGE = "IMAGE"
    VOICE = "VOICE"

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
    type: QuestionType
    explanation: str = ""
    imageUrl: Optional[str] = None
    audioUrl: Optional[str] = None

class QuizRequest(BaseModel):
    unit_ids: List[int]
    prompt: Optional[str] = None
    multiple_choice_count: int = 3
    image_count: int = 1
    voice_count: int = 1

class WrongQuestionOption(BaseModel):
    id: int
    text: str
    correct: bool

class WrongQuestion(BaseModel):
    id: str
    question: str
    userAnswer: str
    correctAnswer: str
    type: str
    options: Optional[List[WrongQuestionOption]]

class PracticeHistory(BaseModel):
    userId: str = Field(description="User ID")
    wrongQuestions: List[WrongQuestion] = Field(description="List of questions answered incorrectly")
    originalPrompt: str = Field(description="Original prompt used for generating questions", default="")

class QuizResponse(BaseModel):
    multiple_choice_questions: List[QuizItem]
    image_questions: List[QuizItem]
    voice_questions: List[QuizItem]

class ExplanationRequest(BaseModel):
    question: str
    correct_answer: str
    question_type: Optional[str] = None
    question_id: Optional[int] = None
    user_answer: str
    
class QuizAgainRequest(BaseModel):
    userId: str
    quizId: int
    wrongQuestions: List[WrongQuestion]
    originalPrompt: str
