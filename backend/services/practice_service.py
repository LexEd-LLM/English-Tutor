from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.services.question_generator import generate_questions_batch
from backend.database.vector_store import get_relevant_chunk
from backend.schemas.quiz import PracticeHistory, WrongQuestion
from ..config.settings import llm
from llama_index.core.prompts import PromptTemplate
import json

class PracticeService:
    def __init__(self):
        # Placeholder for database - replace with actual database implementation
        self._user_data: Dict[str, Dict[str, Any]] = {}

    async def load_user_profile(self, user_id: str) -> Dict[str, List[str]]:
        """Load user's learning profile from database."""
        # Placeholder - implement actual database query
        return self._user_data.get(user_id, {
            "strengths": [],
            "weaknesses": []
        })

    def parse_json_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse generated questions from JSON response"""
        try:
            # Clean up the response text to ensure it's valid JSON
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            data = json.loads(cleaned_text)
            if isinstance(data, dict) and "strengths" in data and "weaknesses" in data:
                return data
            else:
                print("Parsed JSON is not in expected format.")
                return {}
        except Exception as e:
            print(f"Error parsing response: {e}")
            return {}
    
    async def analyze_performance(
        self,
        user_id: str,
        wrong_questions: List[WrongQuestion],
        original_prompt: str,
        previous_profile: Dict[str, List[str]]
    ) -> Dict[str, List[str]]:
        """Analyze user's performance using LLM to identify strengths and weaknesses."""
        
        prompt_template = PromptTemplate(
            template="""
            You are an expert language learning analyst. Analyze the student's English performance based on the provided information.

            Previous Performance Profile:
            - Strengths: {prev_strengths}
            - Weaknesses: {prev_weaknesses}

            Original Learning Content:
            {original_prompt}

            Incorrectly Answered Questions:
            {wrong_questions}

            Your task:
            - Identify exactly **2 strengths** and **2 weaknesses** in the student's English abilities based on the incorrect answers.
            - Compare the current performance to the previous profile, and mention if there's any improvement or recurring issue.

            ### Output Format (strictly return only valid JSON):
            [
            "strengths": 
            {
                "point_1": "Specific strength with clear example",
            },
            {
                "point_2": "Another strength with clear example"
            },
            "weaknesses": 
            {
                "point_1": "Specific weakness with clear example",
            },
            {
                "point_2": "Another weakness with clear example"
            },
            ]
            Only output JSON. Do not include any explanation or extra text outside of the JSON.
            """
        )

        # Format wrong questions for prompt
        wrong_questions_text = "\n".join([
            f"- Question: {q.question}\n  User Answer: {q.userAnswer}\n  Correct: {q.correctAnswer}\n  Type: {q.type}"
            for q in wrong_questions
        ])

        prompt = prompt_template.format(
            prev_strengths=", ".join(previous_profile["strengths"]) or "None identified yet",
            prev_weaknesses=", ".join(previous_profile["weaknesses"]) or "None identified yet",
            original_prompt=original_prompt,
            wrong_questions=wrong_questions_text
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

            # Lưu lại hồ sơ người dùng
            self._user_data[user_id] = {
                "strengths": combined_strengths,
                "weaknesses": combined_weaknesses,
            }

            return {
                "strengths": combined_strengths,
                "weaknesses": combined_weaknesses
            }
        except Exception as e:
            print(f"Error parsing analysis: {e}")
            return previous_profile
        
    async def generate_practice_questions(
        self,
        user_id: str,
        wrong_questions: List[WrongQuestion],
        original_prompt: str,
        text_chunks: List[str]
    ) -> Dict[str, Any]:
        """Generate questions focused on user's weak areas."""
        # Load previous profile
        previous_profile = await self.load_user_profile(user_id)
        print("Successfully loaded user profile")
        # Analyze current performance
        current_profile = await self.analyze_performance(
            user_id,
            wrong_questions,
            original_prompt,
            previous_profile
        )
        print("Successfully analyzed performance")
        # Extract question types from wrong questions
        question_types = set(q.type for q in wrong_questions)

        # Adjust question counts based on wrong answer types
        multiple_choice_count = 4 if "SELECT" in question_types or "TRANSLATION" in question_types else 2
        image_count = 1 if "IMAGE" in question_types else 0
        voice_count = 1 if "VOICE" in question_types else 0

        # Generate questions with focus on weak areas
        questions_data = generate_questions_batch(
            text_chunks,
            multiple_choice_count=multiple_choice_count,
            image_count=image_count,
            voice_count=voice_count,
            strengths=current_profile["strengths"],
            weaknesses=current_profile["weaknesses"]
        )
        print("Successfully generated questions")
        return questions_data

    async def clear_user_profile(self, user_id: str) -> None:
        """Clear user's learning profile after practice session."""
        if user_id in self._user_data:
            del self._user_data[user_id]

    async def save_practice_history(self, history: PracticeHistory) -> None:
        """Save practice attempt to database."""
        try:
            # TODO: Implement actual database storage
            print(f"Saving practice history for user {history.userId}")
            print(f"Wrong questions count: {len(history.wrongQuestions)}")
            print(f"Question types: {[q.type for q in history.wrongQuestions]}")
        except Exception as e:
            print(f"Error saving practice history: {e}")
            raise e

practice_service = PracticeService() 