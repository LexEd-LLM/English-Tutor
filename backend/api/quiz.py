import psycopg2
import random
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import List

from backend.schemas.quiz import (
    PracticeHistory,
    QuizItem,
    QuizOption,
    QuizRequest,
    QuizResponse,
    ExplanationRequest,
    QuizSubmission,
    QuestionType,
    QuizQuestionWithUserAnswer
)
from backend.services.question_generator import generate_questions_batch
from backend.services.quiz_service import quiz_service
from backend.services.unit_service import get_unit_main_chunks, get_unit_subordinate_chunks
from backend.services.practice_service import practice_service
from backend.services.explanation_generator import generate_explanation_mcq
from backend.database import get_db
from backend.services.voice_quiz_generator import calculate_pronunciation_score

router = APIRouter(tags=["quiz"])

# Chuyển đổi định dạng từ backend sang frontend
def convert_to_quiz_items(questions: List[dict], start_id: int = 0):
    quiz_items = []
    for idx, q in enumerate(questions):
        challenge_options = []
        
        # Handle pronunciation questions differently
        if q["type"] == "pronunciation":
            quiz_item = QuizItem(
                id=start_id + idx + 1,
                question=q["question"],
                challengeOptions=[],  # Empty for pronunciation
                type=q["type"],
                explanation=q.get("explanation", ""),
                audioUrl=q["audio_url"],
                correctAnswer=q["correct_answer"]
            )
        else:
            for i, option in enumerate(q["options"]):
                is_correct = option == q["correct_answer"]
                challenge_options.append(
                    QuizOption(
                        id=i+1,
                        text=option,
                        correct=is_correct,
                        imageSrc=None,
                        audioSrc=None
                    )
                )

            quiz_item = QuizItem(
                id=start_id + idx + 1,
                question=q["question"],
                challengeOptions=challenge_options,
                type=q["type"],
                explanation=q.get("explanation", ""),
                correctAnswer=q["correct_answer"]
            )
            
            # Add image URL for image questions
            if "image_url" in q:
                quiz_item.imageUrl = q["image_url"]
            
            # Add audio URL for voice questions
            if "audio_url" in q:
                quiz_item.audioUrl = q["audio_url"]
        
        quiz_items.append(quiz_item)
    
    return quiz_items
        
@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    print(f"Received request - user: {request.user_id}, units: {request.unit_ids}, prompt: {request.prompt}, mc: {request.multiple_choice_count}, img: {request.image_count}, voice: {request.voice_count}, dok_level: {request.dok_level}")
    
    # Create new quiz record first
    quiz_id = quiz_service.create_new_quiz(request.unit_ids[0], request.user_id, request.prompt)
    print(f"Created new quiz with ID: {quiz_id}")
    
    # Lấy text chunks liên quan đến unit
    main_contents = []
    for unit_id in request.unit_ids:
        unit_chunks = get_unit_main_chunks(unit_id)
        main_contents.extend(unit_chunks)
    
    vocab_chunks, text_chunks = [], []
    for unit_id in request.unit_ids:
        vocab_chunk, text_chunk = get_unit_subordinate_chunks(unit_id)
        vocab_chunks.extend(vocab_chunk)
        text_chunks.extend(text_chunk)
    random_text_chunks = random.sample(text_chunks, 2) if len(text_chunks) > 2 else text_chunks
    
    vocabs = [vocab.strip() for vocab_per_unit in vocab_chunks for vocab in vocab_per_unit.split("\n") if vocab.strip()]
    random_vocab_chunks = random.sample(vocabs, 30) if len(vocabs) > 30 else vocabs

    # Generate questions from chunks
    questions_data = generate_questions_batch(
        contents=main_contents,
        vocab_chunks=random_vocab_chunks,
        text_chunks=random_text_chunks,
        multiple_choice_count=request.multiple_choice_count,
        image_count=request.image_count,
        voice_count=request.voice_count,
        custom_prompt=request.prompt,
        dok_level=request.dok_level
    )
    
    # Convert each question type
    multiple_choice_items = convert_to_quiz_items(questions_data["multiple_choice_questions"], 0)
    image_items = convert_to_quiz_items(questions_data["image_questions"], len(multiple_choice_items))
    voice_items = convert_to_quiz_items(questions_data["voice_questions"], len(multiple_choice_items) + len(image_items))
    pronunc_items = convert_to_quiz_items(questions_data["pronunciation_questions"], len(multiple_choice_items) + len(image_items) + len(voice_items))
    
    # Save questions to database
    all_items = multiple_choice_items + image_items + voice_items + pronunc_items
    quiz_service.save_new_questions(quiz_id, all_items)
    
    result = QuizResponse(
        quiz_id=quiz_id,  # Add quiz_id to response
        multiple_choice_questions=multiple_choice_items,
        image_questions=image_items,
        voice_questions=voice_items,
        pronunc_questions=pronunc_items
    )

    print(f"Generated questions - MC: {len(multiple_choice_items)}, Image: {len(image_items)}, Voice: {len(voice_items)}, pronunc: {len(pronunc_items)}")
    return result

@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz_by_id(quiz_id: int):
    """
    Get quiz data by ID.
    Returns all questions and metadata for the specified quiz.
    """
    try:
        # Get quiz questions from database
        questions = quiz_service.get_quiz_questions(quiz_id)
        if not questions:
            raise HTTPException(status_code=404, detail="Quiz not found")

        # Convert questions to QuizItems
        multiple_choice_questions = []
        image_questions = []
        voice_questions = []
        pronunc_questions = []

        for question in questions:
            quiz_item = quiz_service.convert_db_question_to_quiz_item(question)
            if quiz_item.type == QuestionType.PRONUNCIATION:
                pronunc_questions.append(quiz_item)
            elif quiz_item.type == QuestionType.IMAGE:
                image_questions.append(quiz_item)
            elif quiz_item.type == QuestionType.VOICE:
                voice_questions.append(quiz_item)
            else:
                multiple_choice_questions.append(quiz_item)

        return QuizResponse(
            quiz_id=quiz_id,
            multiple_choice_questions=multiple_choice_questions,
            image_questions=image_questions,
            voice_questions=voice_questions,
            pronunc_questions=pronunc_questions
        )

    except Exception as e:
        print(f"Error fetching quiz {quiz_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 
    
@router.post("/submit")
async def submit_quiz(submission: QuizSubmission):
    """
    Process quiz submission and return results.
    """
    try:
        conn = get_db()
        total_questions = len(submission.answers)
        correct_answers_score = 0.0
        
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Get correct answers and types for all questions
            question_ids = [ans.questionId for ans in submission.answers]
            placeholders = ','.join(['%s'] * len(question_ids))
            cur.execute(f"""
                SELECT id, question_text, correct_answer, type
                FROM quiz_questions 
                WHERE id IN ({placeholders})
            """, tuple(question_ids))
            question_map = {row['id']: row for row in cur.fetchall()}
            
            # Process each answer
            for answer in submission.answers:
                q = question_map.get(answer.questionId)
                if not q:
                    continue

                question_type = q['type']
                correct_answer = q['correct_answer']
                user_answer = answer.userAnswer # Answer (text, URL)

                is_correct = False
                user_phonemes = None
                
                # ==== Handle PRONUNCIATION questions ====
                if question_type == "PRONUNCIATION":
                    user_phonemes = answer.userPhonemes # Phonemes from payload (for pronunciation)
                    correct_phonemes = correct_answer  # stringified JSON
                    score = calculate_pronunciation_score(user_phonemes, correct_phonemes)
                    correct_answers_score += score  # fractional point
                    # Define a threshold for what is "correct"
                    is_correct = score >= 0.8

                # ==== Handle OTHER question types ====
                else:
                    is_correct = str(user_answer) == str(correct_answer)
                    if is_correct:
                        correct_answers_score += 1.0

                # --- Save answer details to user_answers table ---
                cur.execute("""
                    INSERT INTO user_answers (user_id, question_id, user_answer, is_correct, user_phonemes)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, question_id) DO UPDATE SET
                        user_answer = EXCLUDED.user_answer,
                        is_correct = EXCLUDED.is_correct,
                        user_phonemes = EXCLUDED.user_phonemes,
                        submitted_at = NOW() -- Optionally track submission time
                """, (
                    submission.userId,
                    answer.questionId,
                    user_answer, # Ensure user_answer is stored as text (URL for pronunciation)
                    is_correct,
                    user_phonemes # Save the submitted phonemes
                ))

        conn.commit()
        
        results = {
            "success": True,
            "totalQuestions": total_questions,
            "correctAnswers": correct_answers_score,
            "quizId": submission.quizId
        }
        
        return results
        
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Error during quiz submission: {error}")
        if conn:
            conn.rollback() # Rollback transaction on error
        # Return an error response
        # Consider more specific error handling
        return JSONResponse(status_code=500, content={"success": False, "error": f"An error occurred processing the submission: {error}"})

    finally:
        if conn:
            conn.close()
        
@router.post("/generate-explanation")
async def generate_explanation_api(request: ExplanationRequest):
    try:
        explanation = generate_explanation_mcq(
            question=request.question_text, 
            correct_answer=request.correct_answer, 
            user_answer=request.user_answer
        )
        
        return {"explanation": explanation}
    except Exception as e:
        print(f"Error generating explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{quiz_id}/explanations")
async def get_quiz_with_user_answers(quiz_id: int) -> List[QuizQuestionWithUserAnswer]:
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    q.id AS question_id,
                    q.question_text,
                    q.type,
                    q.options,
                    q.correct_answer,
                    q.explanation,
                    q.image_url,
                    q.audio_url,
                    ua.user_answer,
                    ua.is_correct,
                    ua.user_phonemes
                FROM quiz_questions q
                LEFT JOIN user_answers ua ON ua.question_id = q.id
                WHERE q.quiz_id = %s
                ORDER BY q.id
            """, (quiz_id,))
            rows = cur.fetchall()
            return [
                QuizQuestionWithUserAnswer(
                    id=i,
                    questionId=row["question_id"],
                    questionText=row["question_text"],
                    type=row["type"],
                    options=row.get("options"),
                    correctAnswer=row["correct_answer"],
                    explanation=row.get("explanation"),
                    imageUrl=row.get("image_url"),
                    audioUrl=row.get("audio_url"),
                    userAnswer=row.get("user_answer"),
                    isCorrect=row.get("is_correct"),
                    userPhonemes=row.get("user_phonemes")
                )
                for i, row in enumerate(rows, start=1)
            ]
    except Exception as e:
        print(f"[ERROR] Failed to fetch quiz explanations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch quiz explanations")
    finally:
        conn.close()