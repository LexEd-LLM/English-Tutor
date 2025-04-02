from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List

class QuestionType(str, Enum):
    FILL_IN_BLANK = "fill_in_blank"
    TRANSLATION = "translation"
    IMAGE = "image"
    VOICE = "voice"

class BaseQuestion(BaseModel):
    question: str = Field(description="The question text")
    options: List[str] = Field(description="List of possible answers")
    correct_answer: str = Field(description="The correct answer")
    explanation: Optional[str] = Field(description="Explanation for the answer", default=None)
    type: QuestionType = Field(description="Type of question")

class ImageQuestion(BaseQuestion):
    image_url: str = Field(description="URL of the generated image")

class VoiceQuestion(BaseQuestion):
    audio_url: str = Field(description="URL of the pronunciation audio")
    similar_word: str = Field(description="Word with similar pronunciation")

class QuizRequest(BaseModel):
    multiple_choice_count: int = Field(description="Number of multiple choice questions")
    image_count: int = Field(description="Number of image questions")
    voice_count: int = Field(description="Number of voice questions")

class QuizResponse(BaseModel):
    multiple_choice_questions: List[BaseQuestion] = Field(default_factory=list)
    image_questions: List[ImageQuestion] = Field(default_factory=list)
    voice_questions: List[VoiceQuestion] = Field(default_factory=list)