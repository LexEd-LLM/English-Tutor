import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.schemas.quiz import QuizSubmission, QuizQuestionWithUserAnswer

client = TestClient(app)

@pytest.fixture
def mock_quiz_data():
    return {
        "quiz_id": 1,
        "multiple_choice_questions": [
            {
                "id": 1,
                "questionText": "Test question?",
                "options": ["A", "B", "C", "D"],
                "correctAnswer": "A",
                "type": "MULTIPLE_CHOICE"
            }
        ],
        "image_questions": [],
        "voice_questions": [],
        "pronunc_questions": []
    }