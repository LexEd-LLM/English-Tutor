from gtts import gTTS 
import os
import uuid
from pathlib import Path

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
        audio_dir = Path("static/audio")
        audio_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.mp3"
        filepath = audio_dir / filename
        
        # Generate audio
        tts = gTTS(text=text, lang=language, slow=False)
        tts.save(str(filepath))
        
        # Return relative path
        return f"/audio/{filename}"
        
    except Exception as e:
        print(f"Error generating audio: {e}")
        return ""

if __name__ == "__main__":
    # Test the function
    audio_path = generate_audio("Hello, this is a test!")
    print(f"Generated audio at: {audio_path}")