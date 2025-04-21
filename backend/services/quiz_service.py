from typing import List, Dict, Any
import json
from ..database.database import get_db
from ..schemas.quiz import QuizItem, QuizOption
from ..schemas.quiz import QuestionType

class QuizService:
    def __init__(self):
        pass

    def get_quiz_questions(self, quiz_id: int) -> List[Dict]:
        """Get all questions for a quiz"""
        conn = get_db()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM quiz_questions 
                    WHERE quiz_id = %s
                    ORDER BY id
                """, (quiz_id,))
                return cur.fetchall()
        finally:
            conn.close()

    def convert_db_question_to_quiz_item(self, question: Dict) -> QuizItem:
        """Convert a database question to a QuizItem"""
        # Get question type and ensure it's a valid QuestionType enum
        question_type = QuestionType(question["type"].lower())
        
        # Base fields that are common for all question types
        base_fields = {
            "id": question["id"],
            "question": question["question_text"],
            "type": question_type,
            "explanation": question.get("explanation") or "",
            "imageUrl": question.get("image_url"),
            "audioUrl": question.get("audio_url"),
            "correctAnswer": question.get("correct_answer")
        }
        
        # Handle pronunciation questions (no options)
        if question_type == QuestionType.PRONUNCIATION:
            return QuizItem(
                **base_fields,
                challengeOptions=[]
            )
        
        # Handle other question types with options
        options = question.get("options", [])
        # Ensure options is a list
        if not isinstance(options, list):
            try:
                options = json.loads(options) if isinstance(options, str) else []
            except json.JSONDecodeError:
                options = []
                
        challenge_options = [
            QuizOption(
                id=i+1,
                text=opt["text"],
                correct=opt["correct"],
                imageSrc=opt.get("imageSrc"),
                audioSrc=opt.get("audioSrc")
            ) for i, opt in enumerate(options)
        ]
        
        return QuizItem(
            **base_fields,
            challengeOptions=challenge_options
        )

    def save_new_questions(self, quiz_id: int, new_items: List[QuizItem]):
        """Save new questions to database"""
        conn = get_db()
        try:
            with conn.cursor() as cur:
                # Verify quiz exists
                cur.execute("""
                    SELECT id, user_id, unit_id 
                    FROM user_quizzes 
                    WHERE id = %s
                """, (quiz_id,))
                quiz = cur.fetchone()
                if not quiz:
                    print(f"Quiz {quiz_id} not found!")
                    return
                
                print(f"\n=== Quiz {quiz_id} Found ===")

                # Get current question count
                cur.execute("""
                    SELECT COUNT(*) 
                    FROM quiz_questions 
                    WHERE quiz_id = %s
                """, (quiz_id,))
                current_count = cur.fetchone()['count']
                print(f"Current question count: {current_count}")

                # Add new questions
                questions_added = 0
                for item in new_items:
                    try:
                        # Handle pronunciation questions differently
                        if item.type == "pronunciation":
                            options = []  # Empty options for pronunciation
                            correct_answer = item.correctAnswer
                        else:
                            options = [
                                {
                                    "text": opt.text,
                                    "correct": opt.correct
                                } for opt in item.challengeOptions
                            ]
                            correct_answer = next((opt.text for opt in item.challengeOptions if opt.correct), None)
                            
                        if not correct_answer:
                            print(f"Warning: No correct answer found for question {item.id}")
                            continue
                        
                        cur.execute("""
                            INSERT INTO quiz_questions (
                                quiz_id, question_text, type, options, 
                                correct_answer, explanation, image_url, audio_url
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING id
                        """, (
                            quiz_id, item.question, item.type.value.upper(),
                            json.dumps(options), correct_answer,
                            item.explanation, item.imageUrl, item.audioUrl
                        ))
                        new_id = cur.fetchone()['id']
                        questions_added += 1
                        print(f"Added question {new_id}: {item.question[:50]}...")
                    except Exception as e:
                        print(item.type.upper())
                        print(f"Error adding question: {str(e)}")
                        continue

                conn.commit()
                
                # Get final question count
                cur.execute("""
                    SELECT COUNT(*) 
                    FROM quiz_questions 
                    WHERE quiz_id = %s
                """, (quiz_id,))
                final_count = cur.fetchone()['count']
                
                print(f"\n=== Quiz After Adding Questions ===")
                print(f"Questions added: {questions_added}")
                print(f"Total questions: {final_count}")
                print("=====================================\n")

        except Exception as e:
            print(f"Error in save_new_questions: {str(e)}")
            conn.rollback()
        finally:
            conn.close()

    def append_questions_to_quiz(
        self,
        quiz_id: int,
        new_questions: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, List[QuizItem]]:
        """Append new questions to existing quiz and return combined questions"""
        # Get existing questions
        existing_questions = self.get_quiz_questions(quiz_id)
        existing_items = [
            self.convert_db_question_to_quiz_item(q) 
            for q in existing_questions
        ]

        # Convert new questions to QuizItems
        multiple_choice_items = [
            QuizItem(
                id=len(existing_items) + i + 1,
                question=q["question"],
                challengeOptions=[
                    QuizOption(
                        id=j+1,
                        text=opt,
                        correct=opt == q["correct_answer"]
                    ) for j, opt in enumerate(q["options"])
                ],
                type=q["type"].upper(),
                explanation=q.get("explanation", ""),
                correctAnswer=q["correct_answer"]
            )
            for i, q in enumerate(new_questions["multiple_choice_questions"])
        ]

        image_items = [
            QuizItem(
                id=len(existing_items) + len(multiple_choice_items) + i + 1,
                question=q["question"],
                challengeOptions=[
                    QuizOption(
                        id=j+1,
                        text=opt,
                        correct=opt == q["correct_answer"]
                    ) for j, opt in enumerate(q["options"])
                ],
                type=q["type"].upper(),
                explanation=q.get("explanation", ""),
                imageUrl=q.get("image_url"),
                correctAnswer=q["correct_answer"]
            )
            for i, q in enumerate(new_questions["image_questions"])
        ]

        voice_items = [
            QuizItem(
                id=len(existing_items) + len(multiple_choice_items) + len(image_items) + i + 1,
                question=q["question"],
                challengeOptions=[
                    QuizOption(
                        id=j+1,
                        text=opt,
                        correct=opt == q["correct_answer"]
                    ) for j, opt in enumerate(q["options"])
                ],
                type=q["type"].upper(),
                explanation=q.get("explanation", ""),
                audioUrl=q.get("audio_url"),
                correctAnswer=q["correct_answer"]
            )
            for i, q in enumerate(new_questions["voice_questions"])
        ]

        pronunciation_items = [
            QuizItem(
                id=len(existing_items) + len(multiple_choice_items) + len(image_items) + len(voice_items) + i + 1,
                question=q["question"],
                challengeOptions=[],  # Empty for pronunciation
                type=q["type"].upper(),
                explanation=q.get("explanation", ""),
                audioUrl=q.get("audio_url"),
                correctAnswer=q["correct_answer"]
            )
            for i, q in enumerate(new_questions.get("pronunciation_questions", []))
        ]

        # Save new questions to database
        self.save_new_questions(quiz_id, multiple_choice_items + image_items + voice_items + pronunciation_items)

        # Return combined questions
        return {
            "multiple_choice_questions": existing_items + multiple_choice_items,
            "image_questions": image_items,
            "voice_questions": voice_items,
            "pronounc_questions": pronunciation_items
        }

    def create_new_quiz(self, unit_id: int, user_id: str, prompt: str = None) -> int:
        """Create a new quiz record and return its ID"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO user_quizzes (user_id, unit_id, prompt)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (user_id, unit_id, prompt)
            )
            quiz_id = cursor.fetchone()['id']
            conn.commit()
            return quiz_id

quiz_service = QuizService()