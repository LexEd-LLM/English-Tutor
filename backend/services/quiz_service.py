from typing import List, Dict, Any
import json
from ..database.database import get_db
from ..schemas.quiz import QuizItem, QuizOption

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
        options = json.loads(question["options"])
        return QuizItem(
            id=question["id"],
            question=question["question_text"],
            challengeOptions=[
                QuizOption(
                    id=i+1,
                    text=opt["text"],
                    correct=opt["correct"]
                ) for i, opt in enumerate(options)
            ],
            type=question["type"],
            explanation=question["explanation"] or "",
            imageUrl=question["image_url"],
            audioUrl=question["audio_url"]
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
                print(f"User ID: {quiz[1]}")
                print(f"Unit ID: {quiz[2]}")

                # Get current question count
                cur.execute("""
                    SELECT COUNT(*) 
                    FROM quiz_questions 
                    WHERE quiz_id = %s
                """, (quiz_id,))
                current_count = cur.fetchone()[0]
                print(f"Current question count: {current_count}")

                # Add new questions
                questions_added = 0
                for item in new_items:
                    try:
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
                            quiz_id, item.question, item.type,
                            json.dumps(options), correct_answer,
                            item.explanation, item.imageUrl, item.audioUrl
                        ))
                        new_id = cur.fetchone()[0]
                        questions_added += 1
                        print(f"Added question {new_id}: {item.question[:50]}...")
                    except Exception as e:
                        print(f"Error adding question: {str(e)}")
                        continue

                conn.commit()
                
                # Get final question count
                cur.execute("""
                    SELECT COUNT(*) 
                    FROM quiz_questions 
                    WHERE quiz_id = %s
                """, (quiz_id,))
                final_count = cur.fetchone()[0]
                
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
                explanation=q.get("explanation", "")
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
                imageUrl=q.get("image_url")
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
                audioUrl=q.get("audio_url")
            )
            for i, q in enumerate(new_questions["voice_questions"])
        ]

        # Save new questions to database
        self.save_new_questions(quiz_id, multiple_choice_items + image_items + voice_items)

        # Return combined questions
        return {
            "multiple_choice_questions": existing_items + multiple_choice_items,
            "image_questions": image_items,
            "voice_questions": voice_items
        }

quiz_service = QuizService()
