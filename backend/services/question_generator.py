from llama_index.core.prompts import PromptTemplate
from llama_index.core.output_parsers import PydanticOutputParser
from ..config.settings import llm
from ..schemas.quiz import BaseQuestion, ImageQuestion, VoiceQuestion, QuestionType
from typing import List, Dict, Any, Optional
import json
import random
from .voice_quiz_generator import generate_audio
from .image_generator import generate_image
from langchain.prompts import ChatPromptTemplate

# Base prompt template for question generation without strengths/weaknesses
BASE_FIB_QUESTION_TEMPLATE = """
    Generate {count} different {question_type} multiple-choice questions from the following content.
    Make sure questions cover different aspects and concepts from the content.
    Content: {content}

    For each question:
    1. Create a question in the specified format
    2. Generate 4 options with only one correct answer
    3. Mark the correct answer

    Return the questions in JSON format with these fields:
    - question: the {question_type} question
    - options: array of 4 possible answers
    - correct_answer: the correct option
    - type: "{question_type}"

    Generate exactly {count} questions.
"""

BASE_TRANSLATION_QUESTION_TEMPLATE = """
    Generate {count} Vietnamese-English translation multiple-choice questions based on the following content.
    Content: {content}
    
    For each question:
    1. Create a question in Vietnamese asking for the English meaning of a word/phrase
    2. The correct answer should be the English translation
    3. Generate 3 other plausible but incorrect English translations
    4. Provide a brief explanation in Vietnamese
    
    Return the questions in JSON format with these fields:
    - question: the Vietnamese question
    - options: array of 4 English options
    - correct_answer: the correct English translation
    - type: "translation"
    
    Generate exactly {count} questions.
"""

# Template for practice questions with strengths/weaknesses
PRACTICE_QUESTION_TEMPLATE = """
You are a language learning expert. Generate {count} {question_type} questions focused on improving the student's weak areas while occasionally reinforcing their strengths.

Student Profile:
Strengths: {strengths}
Weaknesses: {weaknesses}

Content: {content}

For each question:
1. Create a question targeting specific language skills
2. Generate 4 options with only one correct answer
3. Mark the correct answer
4. Focus on areas where the student needs improvement

Return the questions in JSON format with these fields:
- question: the question text
- options: array of 4 possible answers
- correct_answer: the correct option
- type: "{question_type}"

Generate exactly {count} questions.
"""

def generate_fill_in_blank_questions(
    content: str, 
    count: int,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Generate fill-in-the-blank questions."""
    if strengths or weaknesses:
        template = PRACTICE_QUESTION_TEMPLATE 
        prompt_template = PromptTemplate(template=template)
        
        prompt = prompt_template.format(
            content=content,
            count=count,
            question_type="fill_in_blank",
            strengths=", ".join(strengths) if strengths else "None",
            weaknesses=", ".join(weaknesses) if weaknesses else "None"
        )
    else:
        template = BASE_FIB_QUESTION_TEMPLATE
        prompt_template = PromptTemplate(template=template)
        prompt = prompt_template.format(
            content=content,
            count=count,
        )
    
    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    return [
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "type": "fill_in_blank"
        }
        for q in questions
    ]

def generate_translation_questions(
    content: str, 
    count: int,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Generate translation questions."""
    
    if strengths or weaknesses:
        template = PRACTICE_QUESTION_TEMPLATE
        prompt_template = PromptTemplate(template=template)
        
        prompt = prompt_template.format(
            content=content,
            count=count,
            question_type="translation",
            strengths=", ".join(strengths) if strengths else "None",
            weaknesses=", ".join(weaknesses) if weaknesses else "None"
        )
    else:
        template = BASE_TRANSLATION_QUESTION_TEMPLATE
        prompt_template = PromptTemplate(template=template)
        prompt = prompt_template.format(
            content=content,
            count=count,
        )
    
    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    return [
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "type": "translation"
        }
        for q in questions
    ]

def generate_image_questions(content: str, count: int) -> List[Dict[str, Any]]:
    prompt_template = PromptTemplate(
        template="""
            Generate {count} image-based questions from the following content.
            Content: {content}
            
            For each question:
            1. Select a concrete noun or object that can be visualized
            2. Create a question asking "What is this?" in Vietnamese
            3. The correct answer should be the English word for the object
            4. Generate 3 other plausible but incorrect English words
            5. Include an image description that would be used to generate the image
            
            Return the questions in JSON format with these fields:
            - question: "Đây là cái gì?"
            - options: array of 4 English words
            - correct_answer: the correct English word
            - type: "image"
            - image_description: detailed description for image generation
            
            Generate exactly {count} questions.
        """
    )
    
    prompt = prompt_template.format(content=content, count=count)
    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    
    # Generate images for each question
    return [
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "type": "image",
            "image_url": generate_image(
                f"An illustration of {q['correct_answer']}, in the style of Duolingo learning illustration. {q.get('image_description', '')}"
            ),
            "image_description": q.get("image_description", "")
        }
        for q in questions
    ]

def generate_voice_questions(content: str, count: int) -> List[Dict[str, Any]]:
    prompt_template = PromptTemplate(
        template="""
            Generate {count} pronunciation-based questions using words with similar sounds.
            Content: {content}
            
            For each question:
            1. Find a word from the content that has a potentially confusing pronunciation
            2. Find another English word that sounds similar but has a different meaning
            3. Create a question about distinguishing these similar-sounding words
            4. Include phonetic transcriptions for both words
            
            Return the questions in JSON format with these fields:
            - question: "Which word did you hear?"
            - options: array with the correct word and similar-sounding word
            - correct_answer: the word from the content
            - type: "voice"
            - similar_word: the similar-sounding word
            
            Generate exactly {count} questions.
        """
    )
    
    prompt = prompt_template.format(content=content, count=count)
    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    
    # Generate audio for each question
    return [
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "type": "voice",
            "audio_url": generate_audio(q["correct_answer"]),
            "similar_word": q.get("similar_word", "")
        }
        for q in questions
    ]

def generate_questions_batch(
    text_chunks: List[str],
    multiple_choice_count: int,
    image_count: int,
    voice_count: int,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None
) -> Dict[str, List[Dict[str, Any]]]:
    """Generate a batch of questions."""
    
    # Combine chunks into one text
    combined_content = "\n".join(text_chunks)
    
    # Split multiple choice questions between types
    fill_blank_count = multiple_choice_count // 2
    translation_count = multiple_choice_count - fill_blank_count
    
    # Generate questions
    fill_blank_questions = generate_fill_in_blank_questions(
        combined_content, 
        fill_blank_count,
        strengths=strengths,
        weaknesses=weaknesses
    )
    
    translation_questions = generate_translation_questions(
        combined_content, 
        translation_count,
        strengths=strengths,
        weaknesses=weaknesses
    )
    
    image_questions = generate_image_questions(combined_content, image_count)
    voice_questions = generate_voice_questions(combined_content, voice_count)
    
    return {
        "multiple_choice_questions": fill_blank_questions + translation_questions,
        "image_questions": image_questions,
        "voice_questions": voice_questions
    }

def generate_explanation(question: str, correct_answer: str, user_answer: str) -> str:
    """Generate explanation for a question."""
    template = PromptTemplate(
        template=(
            "Bạn là một giáo viên tận tâm, hướng dẫn học sinh lớp 12 ôn tập môn tiếng Anh. "
            "Hãy giải thích ngắn gọn, đi thẳng vào nội dung chính, giúp học sinh hiểu vì sao đáp án đúng là {correct_answer} "
            "và tại sao đáp án của học sinh ({user_answer}) chưa chính xác. "
            "Dự đoán lý do học sinh có thể chọn sai, sau đó đưa ví dụ minh họa để làm rõ nghĩa.\n\n"
            "Câu hỏi: {question}\n"
            "Đáp án đúng: {correct_answer}\n"
            "Đáp án của học sinh: {user_answer}\n\n"
            "Giải thích:"
        )
    )
    prompt = template.format(
        question=question,
        correct_answer=correct_answer,
        user_answer=user_answer
    )
    response = llm.complete(prompt)
    return "\n".join(response.text.splitlines()[1:])

def parse_json_questions(response_text: str) -> List[Dict[str, Any]]:
    """Parse generated questions from JSON response"""
    try:
        # Clean up the response text to ensure it's valid JSON
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        
        data = json.loads(cleaned_text)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "questions" in data:
            return data["questions"]
        else:
            return []
    except Exception as e:
        print(f"Error parsing questions: {e}")
        return []