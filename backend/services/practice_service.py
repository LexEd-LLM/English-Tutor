from typing import List, Dict, Any, Optional
from backend.services.question_generator import generate_questions_batch
from backend.schemas.quiz import QuestionType
from ..config.settings import llm
from llama_index.core.prompts import PromptTemplate
from backend.database.database import get_db
import json
from .voice_quiz_generator import process_user_audio

class PracticeService:
    def __init__(self):
        pass

    async def load_user_profile(self, quiz_id: int) -> Dict[str, List[str]]:
        """Load user's learning profile from database based on specific quiz."""
        conn = get_db()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT strengths, weaknesses 
                    FROM user_quizzes 
                    WHERE id = %s
                """, (quiz_id,))
                
                result = cur.fetchone()
                if result and result["strengths"] and result["weaknesses"]:
                    return {
                        "strengths": result["strengths"].split("\n"),
                        "weaknesses": result["weaknesses"].split("\n")
                    }
                return {
                    "strengths": [],
                    "weaknesses": []
                }
        finally:
            conn.close()

    async def get_quiz_answers(self, quiz_id: int) -> Dict[str, Any]:
        """Get all answers for a specific quiz with tracking of wrong answers."""
        conn = get_db()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        qq.question_text as question,
                        qq.options,
                        qq.correct_answer,
                        ua.user_answer,
                        qq.type,
                        ua.user_phonemes
                    FROM user_answers ua
                    JOIN quiz_questions qq ON ua.question_id = qq.id
                    WHERE qq.quiz_id = %s
                    ORDER BY ua.submitted_at DESC
                """, (quiz_id,))
                
                results = cur.fetchall()
                all_answers = []
                for row in results:
                    answer = {
                        "question": row["question"],
                        "options": row["options"],
                        "correctAnswer": row["correct_answer"],
                        "userAnswer": row["user_answer"],
                        "type": row["type"],
                        "userPhonemes": row["user_phonemes"],
                    }
                    all_answers.append(answer)
                        
                return all_answers
        finally:
            conn.close()

    async def get_prompt_data(self, quiz_id: int) -> Dict[str, Any]:
        """Get prompt data from user_quizzes table."""
        conn = get_db()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT prompt
                    FROM user_quizzes 
                    WHERE id = %s
                """, (quiz_id,))
                
                result = cur.fetchone()
                if result and result["prompt"]:
                    prompt_data = result["prompt"]
                    return {
                        "contents": prompt_data.get("contents", []),
                        "prior_contents": prompt_data.get("prior_contents", []),
                        "text_chunks": prompt_data.get("text_chunks", []),
                        "multiple_choice_count": prompt_data.get("multiple_choice_count", 0),
                        "image_count": prompt_data.get("image_count", 0),
                        "voice_count": prompt_data.get("voice_count", 0),
                        "custom_prompt": prompt_data.get("custom_prompt", "")
                    }
                return {}
        finally:
            conn.close()

    def parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parse generated questions from JSON response"""
        try:
            # Clean up the response text to ensure it's valid JSON
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            
            # Try to find JSON object within the text
            start_idx = cleaned_text.find("{")
            end_idx = cleaned_text.rfind("}")
            if start_idx >= 0 and end_idx >= 0:
                cleaned_text = cleaned_text[start_idx:end_idx + 1]
            
            data = json.loads(cleaned_text)
            if not isinstance(data, dict):
                raise ValueError("Parsed JSON is not a dictionary.")

            return {
                "strengths": data.get("strengths", {}),
                "weaknesses": data.get("weaknesses", {})
            }

        except Exception as e:
            print(f"Error parsing response: {e}")
            print(f"Response text: {response_text}")
            return {
                "strengths": {},
                "weaknesses": {}
            }
    
    async def analyze_performance(
        self,
        quiz_id: int,
        all_answers: List[Dict[str, Any]],
        prompt_data: Dict[str, Any],
        previous_profile: Dict[str, List[str]]
    ) -> Dict[str, List[str]]:
        """Analyze user's performance using LLM to identify strengths and weaknesses."""
        
        prompt_template = PromptTemplate(
            template="""
            Bạn là một giáo viên tiếng Anh có nhiều kinh nghiệm trong việc hướng dẫn học sinh cải thiện kỹ năng ngôn ngữ. Hãy đánh giá phần làm bài của học sinh dựa trên các câu trả lời đã cung cấp.

            ## Hồ sơ học tập trước đây:
            - Điểm mạnh: {prev_strengths}
            - Điểm yếu: {prev_weaknesses}

            ## Nội dung học:
            {learning_content}
            
            ## Hướng dẫn bài tập:
            {custom_prompt}

            ## Bài làm của học sinh:
            {all_answers}
            
            Nhiệm vụ của bạn:
            - Xem xét kỹ **tất cả các câu trả lời** (đúng và sai).
            - Xác định các **điểm mạnh nổi bật** và **điểm yếu cần cải thiện** trong bài làm.
            - Viết nhận xét một cách ngắn gọn, rõ ràng, giống như đang trực tiếp nhận xét với học sinh.
            - Tránh dùng các từ như “Người học” hay “The student”. Ưu tiên dùng “em” hoặc viết tự nhiên như một lời nhận xét thân thiện.
            - Viết bằng **tiếng Việt**.

            ### Định dạng đầu ra (chỉ trả về JSON hợp lệ, không thêm bất kỳ văn bản nào khác):
            {
                "strengths": {
                    "point_1": "Nhận xét điểm mạnh cụ thể",
                    "point_2": "Một điểm mạnh khác",
                    ...
                },
                "weaknesses": {
                    "point_1": "Nhận xét điểm yếu cụ thể",
                    "point_2": "Một điểm yếu khác",
                    ...
                }
            }
            Chỉ trả về JSON. Không thêm bất kỳ giải thích hay văn bản nào bên ngoài JSON.
            """
        )

        # === Combine learning content ===
        learning_content = "\n".join(prompt_data.get("prior_contents", []) + prompt_data.get("contents", []))
        
        # === Format previous profile ===
        prev_strengths = ", ".join(previous_profile.get("strengths", [])) or "None identified yet"
        prev_weaknesses = ", ".join(previous_profile.get("weaknesses", [])) or "None identified yet"

        # === Format answers for prompt ===
        formatted_answers = "\n\n".join(
            (
                f"- Question (PRONUNCIATION): {a['question']}\n"
                f"  Student's Pronunciation (phonemes): {a.get('userPhonemes', 'N/A')} \n"
                f"  IPA Phonemes: {a['correctAnswer']}"
                if a['type'] == 'PRONUNCIATION'
                else
                f"- Question ({a['type']}): {a['question']}\n"
                f"  Options:\n" +
                "\n".join(
                    f"    {'correct -' if opt.get('correct') else 'incorrect -'} {opt.get('text')}"
                    for opt in (a.get('options') or [])
                ) + f"\n  Student's Answer: {a['userAnswer']}"
            )
            for a in all_answers[-50:]
        )
        
        # TODO: Tách riêng nhận xét cho từng type
        prompt = prompt_template.format(
            prev_strengths=prev_strengths,
            prev_weaknesses=prev_weaknesses,
            learning_content=learning_content,
            custom_prompt=prompt_data.get("custom_prompt", ""),
            all_answers=formatted_answers
        )

        response = llm.complete(prompt)
        try:
            analysis = self.parse_json_response(response.text)
            # Store the updated profile
            strengths = analysis.get("strengths", {})
            weaknesses = analysis.get("weaknesses", {})
            
            unique_strengths = list(dict.fromkeys(str(v) for v in strengths.values()))
            unique_weaknesses = list(dict.fromkeys(str(v) for v in weaknesses.values()))

            combined_strengths = "\n".join(unique_strengths)
            combined_weaknesses = "\n".join(unique_weaknesses)

            # Update quiz with new strengths and weaknesses
            conn = get_db()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE user_quizzes 
                        SET strengths = %s, weaknesses = %s
                        WHERE id = %s
                    """, (combined_strengths, combined_weaknesses, quiz_id))
                    conn.commit()
            finally:
                conn.close()

            return {
                "strengths": unique_strengths,
                "weaknesses": unique_weaknesses
            }
        except Exception as e:
            print(f"Error parsing analysis: {e}")
            return previous_profile

    async def generate_practice_questions(
        self,
        user_id: str,
        quiz_id: int,
    ) -> Dict[str, Any]:
        """Generate questions focused on user's weak areas."""
        # Load user profile
        user_profile = await self.load_user_profile(quiz_id)
        print("Successfully loaded user profile")

        # Get prompt data
        prompt_data = await self.get_prompt_data(quiz_id)
        print("Successfully loaded prompt data")

        # Get all answers including wrong ones
        answers_data = await self.get_quiz_answers(quiz_id)
        print("Successfully loaded quiz answers")
        # Analyze current performance
        user_profile = await self.analyze_performance(
            quiz_id,
            answers_data,
            prompt_data,
            user_profile
        )
        print("Successfully analyzed performance")


        # Generate questions with focus on weak areas
        # questions_data = generate_questions_batch()
        # print("Successfully generated questions")
        # return questions_data

practice_service = PracticeService() 