import pytest
from fastapi.testclient import TestClient
from backend.main import app
import json
from pathlib import Path
import tempfile
import os

client = TestClient(app)

@pytest.fixture
def mock_audio_file():
    # Create a temporary WAV file for testing
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        # Write some dummy WAV data
        tmp.write(b'RIFF' + b'\x00'*40)  # Minimal WAV header
        tmp_path = tmp.name
    yield tmp_path
    # Cleanup after test
    if os.path.exists(tmp_path):
        os.remove(tmp_path)

@pytest.fixture
def mock_pronunciation_data():
    return {
        "correctPhonemes": json.dumps({
            "word": "hello",
            "phonemes": ["h", "ə", "l", "oʊ"]
        }),
        "userPhonemes": {
            "word": "hello",
            "phonemes": ["h", "ə", "l", "oʊ"]
        }
    }

def test_invalid_audio_upload():
    # Test with invalid file format
    files = {'file': ('test.txt', b'not an audio file', 'text/plain')}
    data = {'id': '1', 'user_id': 'test_user'}
    response = client.post("/api/upload-audio", files=files, data=data)
    assert response.status_code in [400, 500]

def test_missing_question_id():
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        tmp.write(b'RIFF' + b'\x00'*40)  # Minimal WAV header
        tmp.seek(0)
        files = {'file': ('test.wav', tmp, 'audio/wav')}
        data = {'user_id': 'test_user'}  # Missing id
        response = client.post("/api/upload-audio", files=files, data=data)
        assert response.status_code in [422, 400]  # Validation error 