import random
from llama_index.core.prompts import PromptTemplate
from ..config.settings import llm
from ..schemas.quiz import QuestionType
from typing import List, Dict, Any, Optional
import json
import re
from .voice_quiz_generator import generate_audio, get_phonemes
from .image_generator import generate_image
from .prompt_banks import POSSIBLE_CUSTOM_PROMPTS, DOK_DESCRIPTIONS, QUESTION_TYPES
from .quiz_service import quiz_service

# Base prompt template for question generation without strengths/weaknesses
BASE_TEXT_QUESTION_TEMPLATE = """ 
You are helping Vietnamese students improve their English through creative and varied questions.

Use the following English learning materials as your inspiration. You are NOT restricted to the exact words or sentences in the provided data. Feel free to synthesize, combine, or transform ideas into realistic classroom or exam-style questions.

{ 
  "main_knowledge": "{content}",
  "prior_knowledge": "{prior_contents}",
  "text_chunks": "{text_chunks}",
  "custom_prompt": "{custom_prompt}",
  "question_types": "{question_types}",
  "count": "{count}"
}

Instruction:
Create {count} unique multiple-choice questions.

Make sure:
1. Use a variety of school-level question formats. Avoid repeating similar formats.
2. The content should feel like it belongs in a Vietnamese English textbook or exam paper.
3. Avoid repetition.
4. The "question" field should only contain the problem statement (stem). Do not include any answer choices here. Put all four answer choices into the "options" list.
5. You may use standard Markdown syntax only (e.g., **bold**, *italic*, ~~strikethrough~~, line breaks \n). Use ___ for blanks.

Format (in JSON array):
- id: from 1 to {count}
- question: the word, phrase or sentence
- options: list of 4 options, only one correct
- correct_answer: the correct option string
- type: "text"

Return exactly {count} questions.
"""

# Template for practice questions with strengths/weaknesses
ADAPTIVE_QUESTION_TEMPLATE = """ 
You are helping Vietnamese students improve their English through personalized and diverse multiple-choice questions.

Use the materials below for inspiration. You are NOT limited to the exact sentences. You may adapt, merge, or simplify ideas to create natural, exam-style questions.

{ 
  "main_knowledge": "{content}",
  "prior_knowledge": "{prior_contents}",
  "text_chunks": "{text_chunks}",
  "custom_prompt": "{custom_prompt}",
  "question_types": "{question_types}",
  "count": "{count}",
  "adaptive_prompt": "{adaptive_prompt}"
}

Instruction:
Create {count} unique multiple-choice questions based on the above.

Guidelines:
1. Adapt content to address weaknesses and reinforce strengths in the adaptive_prompt.
2. Vary question types and difficulty levels. Avoid repeating formats.
3. Questions should feel suitable for Vietnamese textbooks or exams.
4. In "question", include only the stem. Put 4 options in "options".
5. Use Markdown (e.g., **bold**, *italic*, ___ for blanks).

Output format (JSON array):
- id: from 1 to {count}
- question: stem only
- options: list of 4 strings (one correct)
- correct_answer: the correct string
- type: "text"

Return exactly {count} questions.
"""

def generate_text_questions(
    content: str,
    prior_contents: str,
    text_chunks: str,
    count: int,
    custom_prompt: str,
    adaptive_prompt: str = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    """Generate text questions."""
    text_chunks = f"- Sample textbook snippets: {text_chunks}" if len(text_chunks) > 0 else ""
    
    question_types = random.sample(QUESTION_TYPES, min(len(QUESTION_TYPES), random.randint(min(count//2, 5), count//2)))
    question_types = "\n - ".join(question_types)

    if adaptive_prompt:
        template = ADAPTIVE_QUESTION_TEMPLATE 
        prompt_template = PromptTemplate(template=template)
        
        prompt = prompt_template.format(
            content=content,
            prior_contents=prior_contents,
            text_chunks=text_chunks,
            custom_prompt=custom_prompt,
            question_types=question_types,
            count=count,
        )
    else:   
        template = BASE_TEXT_QUESTION_TEMPLATE
        prompt_template = PromptTemplate(template=template)
        prompt = prompt_template.format(
            content=content,
            prior_contents=prior_contents,
            text_chunks=text_chunks,
            custom_prompt=custom_prompt,
            question_types=question_types,
            adaptive_prompt=adaptive_prompt,
            count=count,
        )

    response = llm.complete(prompt)
    questions = parse_json_questions(response.text)
    return [
        {
            "question": q["question"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "type": QuestionType.TEXT.value
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
    quiz_id: int,
    contents: List[str],
    prior_contents: List[str],
    text_chunks: List[str],
    multiple_choice_count: int,
    image_count: int,
    voice_count: int,
    custom_prompt: Optional[str] = None,
    dok_level: Optional[List[int]] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """Generate a batch of questions."""
    
    # Combine chunks into one text
    combined_contents = "\n".join(contents)
    combined_text_chunks = "\n".join(text_chunks)
    combined_prior_contents = "\n".join(prior_contents)
       
    # Split voice questions between voice and pronunciation
    pronunciation_count = voice_count // 2
    voice_count = voice_count - pronunciation_count
    
    # Convert dok_level to string
    dok_prompt = "The questions should match these levels of cognitive complexity:\n\n"
    dok_prompt += "\n\n".join(DOK_DESCRIPTIONS[dok] for dok in dok_level)

    # if not custom_prompt:
    #     custom_prompt = random.choice(POSSIBLE_CUSTOM_PROMPTS)
    
    # Add depth of knowledge to custom prompt
    instruction = custom_prompt if custom_prompt else dok_prompt
    combined_custom_prompt = f"You should incorporate the following instruction when generating questions: {instruction}"
    if custom_prompt:
        combined_custom_prompt += f"\n\n{dok_prompt}"
    
    # Update new prompt
    quiz_service.update_prompt(
        quiz_id=quiz_id,
        contents=combined_contents,
        prior_contents=combined_prior_contents,
        text_chunks=combined_text_chunks,
        multiple_choice_count=multiple_choice_count,
        image_count=image_count,
        voice_count=voice_count,
        custom_prompt=combined_custom_prompt,
    )
    
    # Generate questions
    text_questions = generate_text_questions(
        combined_contents,
        combined_prior_contents,
        combined_text_chunks,
        multiple_choice_count,
        combined_custom_prompt,
    )
       
    image_questions = generate_image_questions(combined_contents, image_count, custom_prompt)
    voice_questions = generate_voice_questions(combined_contents, voice_count, custom_prompt)
    pronunciation_questions = generate_pronunciation_questions(combined_contents, pronunciation_count, custom_prompt)
    
    return {
        "multiple_choice_questions": text_questions,
        "image_questions": image_questions,
        "voice_questions": voice_questions,
        "pronunciation_questions": pronunciation_questions
    }

def generate_questions_adaptive(
    quiz_id: int,
    contents: str,
    prior_contents: str, 
    text_chunks: str,
    multiple_choice_count: int,
    image_count: int,
    voice_count: int,
    strengths: str,
    weaknesses: str,
    custom_prompt: Optional[str] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """Generate adaptive questions based on user's strengths and weaknesses."""   
    # Split voice questions between voice and pronunciation
    pronunciation_count = voice_count // 2
    voice_count = voice_count - pronunciation_count
       
    # Create adaptive prompt based on strengths and weaknesses
    adaptive_prompt = "Please focus on these areas that need improvement:\n"
    adaptive_prompt += "\n".join(f"- {weakness}" for weakness in weaknesses)
    adaptive_prompt += "\n\nWhile maintaining these strong areas:\n"
    adaptive_prompt += "\n".join(f"- {strength}" for strength in strengths)
    
    # Generate questions with adaptive focus
    text_questions = generate_text_questions(
        contents,
        prior_contents,
        text_chunks,
        multiple_choice_count,
        custom_prompt,
        adaptive_prompt
    )
    
    image_questions = generate_image_questions(contents, image_count, custom_prompt)
    voice_questions = generate_voice_questions(contents, voice_count, custom_prompt)
    pronunciation_questions = generate_pronunciation_questions(contents, pronunciation_count, custom_prompt)
    
    # Return questions to be appended to existing quiz
    return {
        "multiple_choice_questions": text_questions,
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