import re
from gtts import gTTS 
from pathlib import Path
from ..config.settings import asr_model
from phonemizer import phonemize
import json
from nltk.metrics import edit_distance
from difflib import SequenceMatcher

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
        audio_dir = Path("media/audio")
        audio_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename from text
        filename = text.lower().strip().replace(" ", "_")
        filename = re.sub(r"[^\w_]", "", filename)
        filename = filename[:50] + ".mp3"
        filepath = audio_dir / filename
        
        # If file already exists, return its path
        if filepath.exists():
            return f"/media/audio/{filename}"
        
        # Generate audio if file doesn't exist
        tts = gTTS(text=text, lang=language, slow=False)
        tts.save(str(filepath))
        
        # Return relative path that matches the mounted static directory
        return f"/media/audio/{filename}"
        
    except Exception as e:
        print(f"Error generating audio: {e}")
        return ""

def process_user_audio(audio_path: str) -> str:
    """
    Process user's audio submission and compare with correct pronunciation
    Returns: (user_phonemes, is_correct)
    """
    try:
        # Convert Path object to str if needed
        if isinstance(audio_path, Path):
            audio_path = str(audio_path)
        
        # Get ASR transcription
        result = asr_model(audio_path)['text'].replace(" ", "")
        result = f"/{result}/"
        return result
        
    except Exception as e:
        print(f"Error processing audio: {e}")
        return ""
    
def get_phonemes(text: str) -> str:
    phoneme_dict = {}
    languages = ['en-gb', 'en-us']
    for language in languages:
        ipa = phonemize(text, language=language, backend='espeak', strip=True, with_stress=False)
        phoneme_dict[language] = f"/{ipa}/"
    return json.dumps(phoneme_dict, ensure_ascii=False)

def calculate_pronunciation_score(user_phonemes: str, correct_phonemes_json: str) -> float:
    correct_dict = json.loads(correct_phonemes_json)
    max_score = 0.0
    user_phonemes = user_phonemes.strip("/")

    for lang, correct_ipa in correct_dict.items():
        correct_ipa = correct_ipa.strip("/")
        matches = sum(1 for u, c in zip(user_phonemes, correct_ipa) if u == c)
        score = matches / max(len(correct_ipa), 1)  # tránh chia 0
        max_score = max(max_score, score)

    return round(max_score, 1)

def pronunciation_feedback(user_phonemes: str,
                           correct_phonemes_json: str) -> dict:
    correct_dict = json.loads(correct_phonemes_json)
    correct_phonemes = correct_dict['en-us']
    # 1. Tiền xử lý
    u = user_phonemes.strip("/ ").replace(" ", "")
    c = correct_phonemes.strip("/ ").replace(" ", "")

    # 2. Điểm số
    dist = edit_distance(u, c)
    score = round((1 - dist / max(len(c), 1)), 1)

    # 3. So khớp
    sm = SequenceMatcher(None, u, c)
    highlight = []       # [(chunk, status)] status: 'ok' | 'wrong' | 'missing'
    corrections = []     # ["user → correct", ...]

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        user_chunk    = u[i1:i2]
        correct_chunk = c[j1:j2]

        if tag == "equal":
            highlight.append((user_chunk, "ok"))
        elif tag == "replace":
            # ghi highlight
            highlight.append((user_chunk, "wrong"))
            # ghi gợi ý sửa từng cặp con
            k_max = min(len(user_chunk), len(correct_chunk))
            for k in range(k_max):
                corrections.append(f"{user_chunk[k]} → {correct_chunk[k]}")
        elif tag == "delete":        # người học thiếu âm
            highlight.append((user_chunk, "wrong"))
        elif tag == "insert":        # người học bỏ sót hoàn toàn
            highlight.append((correct_chunk, "missing"))

    return {
        "score": score,
        "highlight": highlight,
        "corrections": corrections
    }