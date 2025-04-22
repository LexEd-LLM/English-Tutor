from llama_index.core.prompts import PromptTemplate
from ..config.settings import llm
from ..schemas.quiz import QuestionType
from typing import List, Dict, Any, Optional
import json
import re
from .voice_quiz_generator import generate_audio
from .image_generator import generate_image
import eng_to_ipa as ipa


# Base prompt template for question generation without strengths/weaknesses
BASE_FIB_QUESTION_TEMPLATE = """
    You are helping Vietnamese learners review English. Generate {count} different fill_in_blank multiple-choice questions from the following content.
    Make sure questions cover different aspects and concepts from the content.
    Content: {content}

    For each question:
    1. Create a question in the specified format
    2. Generate 4 options with only one correct answer
    3. Mark the correct answer

    Return the questions in JSON format with these fields:
    - question: the fill in blank question
    - options: array of 4 possible answers
    - correct_answer: the correct option
    - type: fill_in_blank

    Generate exactly {count} questions.
"""

BASE_TRANSLATION_QUESTION_TEMPLATE = """
    You are helping Vietnamese learners review English. Generate {count} Vietnamese-English translation multiple-choice questions based on the following content.
    Content: {content}
    {custom_prompt}

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
    You are a language learning expert helping **Vietnamese learners** improve their English. Generate {count} {question_type} questions focused on improving the student's weak areas while occasionally reinforcing their strengths.

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
    custom_prompt: Optional[str] = None,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    """Generate fill-in-the-blank questions."""
    if strengths or weaknesses:
        template = PRACTICE_QUESTION_TEMPLATE 
        prompt_template = PromptTemplate(template=template)
        
        prompt = prompt_template.format(
            content=content,
            count=count,
            question_type=QuestionType.FILL_IN_BLANK.value,
            strengths=", ".join(strengths) if strengths else "None",
            weaknesses=", ".join(weaknesses) if weaknesses else "None"
        )
    else:
        custom_prompt = f"You should incorporate the following instruction when generating questions: {custom_prompt}" if custom_prompt else ""
        template = BASE_FIB_QUESTION_TEMPLATE
        prompt_template = PromptTemplate(template=template)
        prompt = prompt_template.format(
            content=content,
            custom_prompt=custom_prompt,
            count=count,
        )
    
    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    return [
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "type": QuestionType.FILL_IN_BLANK.value
        }
        for q in questions
    ]

def generate_translation_questions(
    content: str,
    count: int,
    custom_prompt: Optional[str] = None,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    """Generate translation questions."""
    
    if strengths or weaknesses:
        template = PRACTICE_QUESTION_TEMPLATE
        prompt_template = PromptTemplate(template=template)
        
        prompt = prompt_template.format(
            content=content,
            count=count,
            question_type=QuestionType.TRANSLATION.value,
            strengths=", ".join(strengths) if strengths else "None",
            weaknesses=", ".join(weaknesses) if weaknesses else "None"
        )
    else:
        template = BASE_TRANSLATION_QUESTION_TEMPLATE
        custom_prompt = f"You should incorporate the following instruction when generating questions: {custom_prompt}" if custom_prompt else ""
        prompt_template = PromptTemplate(template=template)
        prompt = prompt_template.format(
            content=content,
            custom_prompt=custom_prompt,
            count=count,
        )
    
    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    return [
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "type": QuestionType.TRANSLATION.value
        }
        for q in questions
    ]

def generate_image_questions(
    content: str,
    count: int,
    custom_prompt: Optional[str] = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    prompt_template = PromptTemplate(
        template="""
            Generate {count} image-based questions from the following content.
            Content: {content}
            {custom_prompt}
            
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
    
    custom_prompt = f"You should incorporate the following instruction when generating questions: {custom_prompt}" if custom_prompt else ""
    prompt = prompt_template.format(content=content, custom_prompt=custom_prompt, count=count)
    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    
    # Generate images for each question
    return [
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "type": QuestionType.IMAGE.value,
            "image_url": generate_image(
                f"An illustration of {q['correct_answer']}, in the style of Duolingo learning illustration. {q.get('image_description', '')}"
            ),
            "image_description": q.get("image_description", "")
        }
        for q in questions
    ]

def generate_voice_questions(
    content: str,
    count: int,
    custom_prompt: Optional[str] = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    prompt_template = PromptTemplate(
        template="""
            Generate {count} pronunciation-based questions using words with similar sounds.
            Content: {content}
            
            For each question:
                1. Select a word from the content that may be confusing in pronunciation
                2. Find another real English word that sounds similar but has a different meaning
                3. Create a question that helps learners distinguish them by sound
                4. Do **not** include phonetic transcriptions in the `options` or `correct_answer` fields
            
            Return the questions in JSON format with these fields:
            - question: "Which word did you hear?"
            - options: array with the correct word and similar-sounding word
            - correct_answer: the word from the content
            - type: "voice"
            
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
            "type": QuestionType.VOICE.value,
            "audio_url": generate_audio(q["correct_answer"])
        }
        for q in questions
    ]

def generate_pronunciation_questions(
    content: str,
    count: int,
    custom_prompt: Optional[str] = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    prompt_template = PromptTemplate(
        template="""
            Generate {count} pronunciation practice questions from the following content.
            Content: {content}
            
            For each question:
                1. Select a word for pronunciation practice
                2. Create a question asking the user to pronounce it correctly
                3. Include the word/phrase as both the option and correct answer
                4. Focus on commonly mispronounced words by Vietnamese learners
            
            Return the questions in JSON format with these fields:
            - question: "Please pronounce this word correctly: word"
            - correct_answer: word
            - type: "pronunciation"
            
            Generate exactly {count} questions.
        """
    )
    
    prompt = prompt_template.format(content=content, count=count)
    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    
    # Generate audio for each question using gTTS
    return [
        {
            "question": q["question"],
            "correct_answer": ipa.convert(q["correct_answer"]).replace(" ", ""),
            "type": QuestionType.PRONUNCIATION.value,
            "audio_url": generate_audio(q["correct_answer"])
        }
        for q in questions
    ]

def generate_questions_batch(
    text_chunks: List[str],
    multiple_choice_count: int,
    image_count: int,
    voice_count: int,
    custom_prompt: Optional[str] = None,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None
) -> Dict[str, List[Dict[str, Any]]]:
    """Generate a batch of questions."""
    
    # Combine chunks into one text
    combined_content = "\n".join(text_chunks)
    
    # Split multiple choice questions between types
    fill_blank_count = multiple_choice_count // 2
    translation_count = multiple_choice_count - fill_blank_count
    
    # Split voice questions between voice and pronunciation
    pronunciation_count = voice_count // 2
    voice_count = voice_count - pronunciation_count
    
    # Generate questions
    fill_blank_questions = generate_fill_in_blank_questions(
        combined_content,
        fill_blank_count,
        custom_prompt,
        strengths=strengths,
        weaknesses=weaknesses
    )
    
    translation_questions = generate_translation_questions(
        combined_content,
        translation_count,
        custom_prompt,
        strengths=strengths,
        weaknesses=weaknesses
    )
    
    image_questions = generate_image_questions(combined_content, image_count, custom_prompt)
    voice_questions = generate_voice_questions(combined_content, voice_count, custom_prompt)
    pronunciation_questions = generate_pronunciation_questions(combined_content, pronunciation_count, custom_prompt)
    
    return {
        "multiple_choice_questions": fill_blank_questions + translation_questions,
        "image_questions": image_questions,
        "voice_questions": voice_questions,
        "pronunciation_questions": pronunciation_questions
    }

def generate_explanation(question: str, correct_answer: str, user_answer: str) -> str:
    """Generate explanation for a question."""
    template = PromptTemplate(
        template=(
        "Bạn là một giáo viên tận tâm, hướng dẫn học sinh lớp 12 ôn tập môn tiếng Anh. "
        "Hãy giải thích ngắn gọn, đi thẳng vào nội dung chính để giúp học sinh hiểu rõ kiến thức.\n\n"
        "- Luôn giải thích vì sao đáp án đúng là {correct_answer}.\n"
        "- Nếu đáp án của học sinh ({user_answer}) khác đáp án đúng, hãy phân tích lý do sai và đưa ví dụ minh họa.\n"
        "- Nếu học sinh đã chọn đúng, hãy củng cố bằng cách giải thích rõ vì sao đó là lựa chọn tốt nhất và đưa ví dụ tương tự để học sinh ghi nhớ.\n\n"
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
        # if cleaned_text.startswith("```json"):
        #     cleaned_text = cleaned_text[7:]
        # if cleaned_text.endswith("```"):
        #     cleaned_text = cleaned_text[:-3]
        
        cleaned_text = re.sub(r"^```json\s*", "", cleaned_text)
        cleaned_text = re.sub(r"\s*```$", "", cleaned_text)

        # Remove trailing commas before array or object ends
        # Handles cases like: ..., ] or ..., }
        cleaned_text = re.sub(r",(\s*[\]}])", r"\1", cleaned_text)
        
        data = json.loads(cleaned_text)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "questions" in data:
            return data["questions"]
        else:
            return []
    except Exception as e:
        print(f"Error parsing questions: {e}")
        print(response_text)
        return []