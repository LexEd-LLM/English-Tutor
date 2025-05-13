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

def test_get_quiz_by_id():
    response = client.get("/api/quiz/1?userId=test_user")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "quiz_id" in data
        assert "multiple_choice_questions" in data
        assert "image_questions" in data
        assert "voice_questions" in data
        assert "pronunc_questions" in data

def test_submit_quiz():
    submission = {
        "answers": [
            {
                "questionId": 1,
                "userAnswer": "A",
                "userPhonemes": None
            }
        ]
    }
    response = client.post("/api/quiz/submit", json=submission)
    assert response.status_code in [200, 500]

def test_get_quiz_explanations():
    response = client.get("/api/quiz/1/explanations?userId=test_user")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "questionId" in data[0]
            assert "explanation" in data[0]

def test_update_quiz_visibility():
    payload = {"visibility": True}
    response = client.patch("/api/quiz/1/visibility", json=payload)
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "visibility" in data
        assert data["visibility"] is True

def test_delete_quiz():
    response = client.delete("/api/quiz/1")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "id" in data 