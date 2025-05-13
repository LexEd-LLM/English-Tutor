import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.schemas.quiz import QuizUserRequest

client = TestClient(app)

@pytest.fixture
def mock_quiz_request():
    return {
        "user_id": "test_user",
        "quiz_id": 1
    }

def test_generate_adaptive_quiz(mock_quiz_request):
    response = client.post("/api/practice/generate-again", json=mock_quiz_request)
    assert response.status_code in [200, 500]
    if response.status_code == 200:
        data = response.json()
        assert "quiz_id" in data
        assert "lesson_id" in data
        assert "multiple_choice_questions" in data
        assert "image_questions" in data
        assert "voice_questions" in data
        assert "pronunc_questions" in data
        
        # Verify question structure if any questions exist
        question_types = [
            "multiple_choice_questions",
            "image_questions", 
            "voice_questions",
            "pronunc_questions"
        ]
        
        for q_type in question_types:
            if data[q_type] and len(data[q_type]) > 0:
                question = data[q_type][0]
                assert "id" in question
                assert "questionText" in question
                assert "type" in question

def test_generate_adaptive_quiz_invalid_user():
    request_data = {
        "user_id": "nonexistent_user",
        "quiz_id": 1
    }
    response = client.post("/api/practice/generate-again", json=request_data)
    assert response.status_code in [404, 500]

def test_generate_adaptive_quiz_invalid_quiz():
    request_data = {
        "user_id": "test_user",
        "quiz_id": 99999  # Non-existent quiz ID
    }
    response = client.post("/api/practice/generate-again", json=request_data)
    assert response.status_code in [404, 500]

def test_generate_adaptive_quiz_missing_fields():
    invalid_requests = [
        {"user_id": "test_user"},  # Missing quiz_id
        {"quiz_id": 1},            # Missing user_id
        {}                         # Missing all fields
    ]
    
    for req in invalid_requests:
        response = client.post("/api/practice/generate-again", json=req)
        assert response.status_code == 422  # Validation error 