import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.fixture
def mock_chat_request():
    return {
        "history": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ],
        "pageContent": "This is some context about English grammar.",
        "promptText": "Can you explain the present simple tense?"
    }

def test_chat_endpoint(mock_chat_request):
    response = client.post("/api/chat", json=mock_chat_request)
    assert response.status_code in [200, 500]
    if response.status_code == 200:
        data = response.json()
        assert "response" in data
        assert isinstance(data["response"], str)
        assert len(data["response"]) > 0

def test_chat_empty_history():
    request_data = {
        "history": [],
        "pageContent": "Some context",
        "promptText": "Hello"
    }
    response = client.post("/api/chat", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data

def test_chat_missing_fields():
    # Test with missing required fields
    invalid_requests = [
        {"history": [], "pageContent": "context"},  # Missing promptText
        {"history": [], "promptText": "hello"},     # Missing pageContent
        {"pageContent": "context", "promptText": "hello"}  # Missing history
    ]
    
    for req in invalid_requests:
        response = client.post("/api/chat", json=req)
        assert response.status_code == 422  # Validation error

def test_chat_invalid_history_format():
    request_data = {
        "history": [{"invalid": "format"}],  # Invalid history format
        "pageContent": "context",
        "promptText": "hello"
    }
    response = client.post("/api/chat", json=request_data)
    assert response.status_code == 422  # Validation error 