import random
from llama_index.core.prompts import PromptTemplate
from ..config.settings import llm
from ..schemas.quiz import QuestionType
from typing import List, Dict, Any, Optional
import json
import re
from .voice_quiz_generator import generate_audio, get_phonemes
from .image_generator import generate_image
from .prompt_banks import POSSIBLE_CUSTOM_PROMPTS, DOK_DESCRIPTIONS

# Base prompt template for question generation without strengths/weaknesses
BASE_FIB_QUESTION_TEMPLATE = """ 
You are helping Vietnamese students improve their English through creative and varied fill-in-the-blank questions.

Use the following English learning materials as your inspiration. You are NOT restricted to the exact words or sentences in the content. Feel free to synthesize, combine, or transform ideas into realistic classroom or exam-style questions.

Base your questions on:
- Main topics and skills: {content}
- Sample textbook snippets: {text_chunks}
{custom_prompt}

Create {count} unique fill-in-the-blank multiple-choice questions.

Make sure:
1. Each question tests a **different aspect** of English (e.g., grammar, vocabulary, reading inference, pronunciation, functional language).
2. Use a variety of **common school-level question formats**, including:
    - Sentence completion (with grammar or word choice)
    - Mini-dialogues or functional language
    - Short context-based cloze tests
    - Sound or stress discrimination
    - Lexical meaning in context (synonyms, phrasal verbs, etc.)
3. The content should feel like it belongs in a **Vietnamese English textbook or exam paper**.
4. Avoid repetition and overly simple structures.

Format (in JSON array):
- question: the sentence with a blank (use ___)
- options: list of 4 options (A, B, C, D), only one correct
- correct_answer: the correct option string
- type: "fill_in_blank"

Return exactly {count} questions.
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
    text_chunks: str,
    count: int,
    custom_prompt: Optional[str] = None,
    dok_level: Optional[List[int]] = None,
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
        dok_prompt = "The questions should match these levels of cognitive complexity:\n\n"
        dok_prompt += "\n\n".join(DOK_DESCRIPTIONS[dok] for dok in dok_level)

        if not custom_prompt:
            custom_prompt = random.choice(POSSIBLE_CUSTOM_PROMPTS)
            
        custom_prompt = f"You should incorporate the following instruction when generating questions: {custom_prompt}"
        combined_custom_prompt = f"{custom_prompt}\n\n{dok_prompt}"
    
        template = BASE_FIB_QUESTION_TEMPLATE
        prompt_template = PromptTemplate(template=template)
        prompt = prompt_template.format(
            content=content,
            text_chunks=text_chunks,
            custom_prompt=combined_custom_prompt,
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
            "correct_answer": get_phonemes(q["correct_answer"]),
            "type": QuestionType.PRONUNCIATION.value,
            "audio_url": generate_audio(q["correct_answer"])
        }
        for q in questions
    ]

def generate_questions_batch(
    contents: List[str],
    text_chunks: List[str],
    multiple_choice_count: int,
    image_count: int,
    voice_count: int,
    custom_prompt: Optional[str] = None,
    dok_level: Optional[List[int]] = None,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None
) -> Dict[str, List[Dict[str, Any]]]:
    """Generate a batch of questions."""
    
    # Combine chunks into one text
    combined_content = "\n".join(contents)
    combined_text_chunk = "\n".join(text_chunks)
    
    # Split multiple choice questions between types
    fill_blank_count = multiple_choice_count
    
    # Split voice questions between voice and pronunciation
    pronunciation_count = voice_count // 2
    voice_count = voice_count - pronunciation_count
    
    # Generate questions
    fill_blank_questions = generate_fill_in_blank_questions(
        combined_content,
        combined_text_chunk,
        fill_blank_count,
        custom_prompt,
        dok_level,
        strengths=strengths,
        weaknesses=weaknesses
    )
       
    image_questions = generate_image_questions(combined_content, image_count, custom_prompt)
    voice_questions = generate_voice_questions(combined_content, voice_count, custom_prompt)
    pronunciation_questions = generate_pronunciation_questions(combined_content, pronunciation_count, custom_prompt)
    
    return {
        "multiple_choice_questions": fill_blank_questions,
        "image_questions": image_questions,
        "voice_questions": voice_questions,
        "pronunciation_questions": pronunciation_questions
    }

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