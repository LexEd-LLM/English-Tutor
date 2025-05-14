import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.schemas.user import UserProfile, Role

client = TestClient(app)

@pytest.fixture
def mock_user_data():
    return {
        "id": "test_user",
        "name": "Test User",
        "imageSrc": "https://example.com/image.jpg",
        "role": Role.USER,
        "hearts": 5,
        "subscriptionStatus": "FREE",
        "subscriptionStartDate": None,
        "subscriptionEndDate": None
    }