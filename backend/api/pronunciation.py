import psycopg2
import json
from pathlib import Path
import uuid
import os
from pydub import AudioSegment
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from backend.services.voice_quiz_generator import process_user_audio, pronunciation_feedback
from backend.database import get_db
from backend.services.explanation_generator import generate_explanation_pronunciation
from backend.schemas.pronunciation import PronunciationAnalysisResult, PronunciationScoreRequest, PronunciationScoreResponse

router = APIRouter(tags=["pronunciation"])

MEDIA_PUBLIC_DIR = Path("media/users")
MEDIA_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload-audio", response_model=PronunciationAnalysisResult)
async def upload_audio(
    id: int = Form(...),
    user_id: str = Form(...),
    file: UploadFile = File(...)
):
    conn = None
    try:
        # --- File Handling ---
        file_extension = Path(file.filename).suffix.lower()
        if not file_extension:
             # Assume webm if no extension given by browser recording
             file_extension = ".webm"

        filename = f"{uuid.uuid4().hex}.wav" # Always save as wav eventually
        temp_id = uuid.uuid4().hex
        temp_path = MEDIA_PUBLIC_DIR / f"temp_{temp_id}{file_extension}"
        output_path = MEDIA_PUBLIC_DIR / filename
        relative_output_url = f"/media/users/{filename}" # URL for frontend

        # Write temporary file
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Convert to WAV if necessary
        if file_extension != ".wav":
            try:
                audio = AudioSegment.from_file(temp_path)
                 # Ensure mono and standard sample rate if needed by analysis tool
                 # audio = audio.set_channels(1).set_frame_rate(16000)
                audio.export(output_path, format="wav")
                os.remove(temp_path) # Clean up temp file
            except Exception as convert_err:
                 # Cleanup even if conversion fails
                 if temp_path.exists():
                     os.remove(temp_path)
                 raise HTTPException(status_code=500, detail=f"Audio conversion failed: {convert_err}")
        else:
            os.rename(temp_path, output_path) # If already wav, just rename

        # --- Analysis ---
        # Fetch question data from DB
        conn = get_db()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT question_text, correct_answer 
                FROM quiz_questions 
                    WHERE id = %s AND type = 'PRONUNCIATION'
            """, (id,))
            question_data = cur.fetchone()

        if not question_data:
            # Clean up saved audio file if question not found or not pronunciation type
            if output_path.exists():
                os.remove(output_path)
            raise HTTPException(status_code=404, detail=f"Pronunciation question with ID {id} not found.")

        correct_answer_json = question_data['correct_answer']
        question_text = question_data['question_text']
        correct_phonemes_dict = {}
        try:
            correct_phonemes_dict = json.loads(correct_answer_json)
        except json.JSONDecodeError:
             # Clean up saved audio file if correct answer format is bad
             if output_path.exists():
                 os.remove(output_path)
             raise HTTPException(status_code=500, detail=f"Invalid format for correct answer phonemes for question ID {id}.")


        # Process the saved WAV audio file
        user_phonemes = process_user_audio(output_path)

        # Calculate score
        analysis = pronunciation_feedback(user_phonemes, correct_answer_json)
        score       = analysis["score"]
        highlight   = analysis["highlight"]
        corrections = analysis["corrections"]
        is_correct = score >= 0.8
        
        # Generate explanation (optional here, can be regenerated on submit)
        explanation = generate_explanation_pronunciation(question_text, correct_answer_json, user_phonemes)

        # Save user_phonemes and explanation to DB
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Update user_answers: lưu userPhonemes
            cur.execute("""
                INSERT INTO user_answers (user_id, question_id, user_answer, user_phonemes, is_correct)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, question_id) DO UPDATE SET
                    user_phonemes = EXCLUDED.user_phonemes,
                    submitted_at = NOW()
            """, (
                user_id,
                id,
                relative_output_url,
                user_phonemes,
                is_correct
            ))

            # Update quiz_questions: lưu explanation
            cur.execute("""
                UPDATE quiz_questions 
                SET explanation = %s 
                WHERE id = %s
            """, (
                explanation,
                id
            ))

        conn.commit()

        # Return results including the analysis
        return PronunciationAnalysisResult(
            url=relative_output_url,
            userPhonemes=user_phonemes,
            score=score,
            explanation=explanation,
            correctPhonemes=correct_phonemes_dict,
            highlight=highlight,
            corrections=corrections
        )

    except HTTPException as http_exc:
        # Re-raise HTTP exceptions directly
        raise http_exc
    except Exception as e:
        # Log the error details for debugging
        print(f"Error during audio upload/analysis for question {id}: {e}")
        # Generic error for the client
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
    finally:
        if conn:
            conn.close()
        # Ensure temporary file is removed in case of early exit/error
        if 'temp_path' in locals() and temp_path.exists():
            try:
                os.remove(temp_path)
            except OSError:
                pass # Ignore if already removed or permissions issue
            
@router.post("/calculate-phoneme-score", response_model=PronunciationScoreResponse)
def calculate_phoneme_score(request: PronunciationScoreRequest):
    try:
        analysis = pronunciation_feedback(request.userPhonemes, request.correctPhonemes)
        return PronunciationScoreResponse(**analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))