from pydantic import BaseModel
from typing import Optional, Dict, List, Tuple

# Input model for analysis request (not strictly needed if using Form, but good practice)
class PronunciationAnalysisResult(BaseModel):
    url: str
    userPhonemes: Optional[str]
    score: float
    explanation: Optional[str]
    correctPhonemes: Dict # Send correct phonemes back for display
    highlight: List[Tuple[str, str]]
    corrections: List[str] 
    
class PronunciationScoreRequest(BaseModel):
    userPhonemes: str
    correctPhonemes: str

class PronunciationScoreResponse(BaseModel):
    score: float
    highlight: List[Tuple[str, str]]
    corrections: List[str]