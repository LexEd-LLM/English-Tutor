from pydantic import BaseModel, Field

class QuizQuestion(BaseModel):
    question: str = Field(description="The multiple-choice question")
    option_a: str = Field(description="Option A for the question")
    option_b: str = Field(description="Option B for the question") 
    option_c: str = Field(description="Option C for the question")
    option_d: str = Field(description="Option D for the question")
    correct_answer: str = Field(description="The correct answer")