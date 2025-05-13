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
        "role": Role.STUDENT,
        "hearts": 5,
        "subscriptionStatus": "FREE",
        "subscriptionStartDate": None,
        "subscriptionEndDate": None
    }

def test_get_user_progress():
    response = client.get("/api/user-progress/test_user")
    assert response.status_code == 200
    data = response.json()
    assert "hearts" in data
    assert isinstance(data["hearts"], int)
    assert data["hearts"] >= 0

def test_get_user_profile():
    response = client.get("/api/user/test_user")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "imageSrc" in data
        assert "role" in data
        assert "hearts" in data
        assert "subscriptionStatus" in data

def test_get_nonexistent_user():
    response = client.get("/api/user/nonexistent_user")
    assert response.status_code == 404

def test_user_profile_validation():
    # Test with invalid user data
    invalid_user = {
        "id": "test_user",
        "name": "Test User",
        "imageSrc": "not_a_valid_url",  # Invalid URL
        "role": "INVALID_ROLE",  # Invalid role
        "hearts": -1,  # Invalid hearts count
        "subscriptionStatus": "INVALID"  # Invalid subscription status
    }
    # This test would need to be implemented at the schema level
    # Here we're just documenting that these validations should exist
    pass 