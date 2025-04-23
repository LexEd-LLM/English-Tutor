from pydantic import BaseModel
from typing import Optional, Dict

# Input model for analysis request (not strictly needed if using Form, but good practice)
class PronunciationAnalysisResult(BaseModel):
    url: str
    userPhonemes: Optional[str]
    score: float
    explanation: Optional[str]
    correctPhonemes: Dict # Send correct phonemes back for display
    
class PronunciationScoreRequest(BaseModel):
    userPhonemes: str
    correctPhonemes: str

class PronunciationScoreResponse(BaseModel):
    score: float