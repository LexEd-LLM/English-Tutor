from gtts import gTTS 
import os
import uuid
from pathlib import Path
import eng_to_ipa as ipa
from ..config.settings import asr_model

def generate_audio(text: str, language: str = 'en') -> str:
    """
    Generate audio file from text using gTTS
    
    Args:
        text (str): Text to convert to speech
        language (str): Language code (default: 'en')
        
    Returns:
        str: Path to the generated audio file
    """
    try:
        # Create audio directory if it doesn't exist
        audio_dir = Path("../frontend/public/audio")
        audio_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename from text
        filename = f"{text.lower()}.mp3"
        filepath = audio_dir / filename
        
        # If file already exists, return its path
        if filepath.exists():
            return f"/audio/{filename}"
        
        # Generate audio if file doesn't exist
        tts = gTTS(text=text, lang=language, slow=False)
        tts.save(str(filepath))
        
        # Return relative path
        return f"/audio/{filename}"
        
    except Exception as e:
        print(f"Error generating audio: {e}")
        return ""

def process_user_audio(audio_path: str) -> tuple[str, bool]:
    """
    Process user's audio submission and compare with correct pronunciation
    Returns: (user_phonemes, is_correct)
    """
    try:
        # Convert audio path to absolute path
        audio_path = str(Path("../frontend/public").resolve() / audio_path.lstrip("/"))
        
        # Get ASR transcription
        result = asr_model(audio_path).replace(" ", "")
        
        return result
        
    except Exception as e:
        print(f"Error processing audio: {e}")
        return "", False

if __name__ == "__main__":
    # Test the function
    audio_path = generate_audio("Hello, this is a test!")
    print(f"Generated audio at: {audio_path}")