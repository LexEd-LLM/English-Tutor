from fastapi import APIRouter, HTTPException
from typing import List

from backend.schemas.quiz import (
    PracticeHistory,
    QuizItem,
    QuizOption,
    QuizRequest,
    QuizResponse,
    ExplanationRequest,
    QuizAgainRequest,
    QuizSubmission,
    QuestionType
)
from backend.services.question_generator import generate_questions_batch, generate_explanation
from backend.services.quiz_service import quiz_service
from backend.services.unit_service import get_unit_chunks
from backend.services.practice_service import practice_service
from backend.database import get_db

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
    print(f"Received request - user: {request.user_id}, units: {request.unit_ids}, prompt: {request.prompt}, mc: {request.multiple_choice_count}, img: {request.image_count}, voice: {request.voice_count}")
    
    # Create new quiz record first
    quiz_id = quiz_service.create_new_quiz(request.unit_ids[0], request.user_id, request.prompt)
    print(f"Created new quiz with ID: {quiz_id}")
    
    # Lấy text chunks liên quan đến unit
    text_chunks = []
    for unit_id in request.unit_ids:
        unit_chunks = get_unit_chunks(unit_id)
        text_chunks.extend(unit_chunks)

    # Generate questions from chunks
    questions_data = generate_questions_batch(
        text_chunks=text_chunks,
        multiple_choice_count=request.multiple_choice_count,
        image_count=request.image_count,
        voice_count=request.voice_count,
        custom_prompt=request.prompt
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

@router.post("/generate-explanation")
async def generate_explanation_api(request: ExplanationRequest):
    print(f"Received request for explanation - question: {request.question}")
    try:
        explanation = generate_explanation(
            question=request.question, 
            correct_answer=request.correct_answer, 
            user_answer=request.user_answer
        )
        print(f"Generated explanation: {explanation[:100]}...")
        
        return {"explanation": explanation}
    except Exception as e:
        print(f"Error generating explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-again", response_model=QuizResponse)
async def generate_quiz_again(request: QuizAgainRequest):
    try:
        print("Start generate quiz again")
        # Get relevant chunks for the original prompt
        text_chunks = []
        for unit_id in request.unit_ids:
            unit_chunks = get_unit_chunks(unit_id)
            text_chunks.extend(unit_chunks)
        
        # Generate new questions based on practice history
        questions_data = await practice_service.generate_practice_questions(
            request.userId,
            request.wrongQuestions,
            request.originalPrompt,
            text_chunks
        )

        # Convert each question type to QuizItems
        multiple_choice_items = convert_to_quiz_items(questions_data["multiple_choice_questions"], 0)
        image_items = convert_to_quiz_items(questions_data["image_questions"], len(multiple_choice_items))
        voice_items = convert_to_quiz_items(questions_data["voice_questions"], len(multiple_choice_items) + len(image_items))
        
        # Save new questions to database
        quiz_service.save_new_questions(request.quizId, multiple_choice_items + image_items + voice_items)

        # Return only new questions
        result = QuizResponse(
            multiple_choice_questions=multiple_choice_items,
            image_questions=image_items,
            voice_questions=voice_items
        )

        print(f"Generated questions - MC: {len(multiple_choice_items)}, Image: {len(image_items)}, Voice: {len(voice_items)}")
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit")
async def submit_quiz(submission: QuizSubmission):
    """
    Process quiz submission and return results.
    """
    try:
        conn = get_db()
        try:
            total_questions = len(submission.answers)
            correct_answers = 0
            
            with conn.cursor() as cur:
                # Get correct answers for all questions
                question_ids = [ans.questionId for ans in submission.answers]
                placeholders = ','.join(['%s'] * len(question_ids))
                cur.execute(f"""
                    SELECT id, correct_answer 
                    FROM quiz_questions 
                    WHERE id IN ({placeholders})
                """, question_ids)
                correct_answers_map = {row['id']: row['correct_answer'] for row in cur.fetchall()}
                
                # Process each answer
                for answer in submission.answers:
                    is_correct = str(answer.userAnswer) == str(correct_answers_map.get(answer.questionId))
                    if is_correct:
                        correct_answers += 1
                        
                    # Save answer to database
                    cur.execute("""
                        INSERT INTO user_answers (user_id, question_id, user_answer, is_correct)
                        VALUES (%s, %s, %s, %s)
                    """, (submission.userId, answer.questionId, answer.userAnswer, is_correct))
                
            conn.commit()
            
            # Store results in localStorage via frontend
            results = {
                "success": True,
                "totalQuestions": total_questions,
                "correctAnswers": correct_answers,
                "quizId": submission.quizId
            }
            
            return results
            
        finally:
            conn.close()
    except Exception as e:
        print(f"Error submitting quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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