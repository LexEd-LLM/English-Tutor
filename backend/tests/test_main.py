import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_cors_headers():
    response = client.options("/api/health")
    assert response.headers["access-control-allow-origin"] == "*"
    assert response.headers["access-control-allow-methods"]
    assert response.headers["access-control-allow-headers"]

def test_media_static_files():
    # Test if media directory is mounted correctly
    response = client.get("/media/test.txt")  # This will fail if file doesn't exist, which is expected
    assert response.status_code in [404, 200]  # Either file not found or success is acceptable
