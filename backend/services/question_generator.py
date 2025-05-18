import random
from llama_index.core.prompts import PromptTemplate
from ..config.settings import llm
from ..schemas.quiz import QuestionType
from typing import List, Dict, Any, Optional
import json
import re
from .voice_quiz_generator import generate_audio, get_phonemes
from .image_generator import generate_image
from .prompt_banks import POSSIBLE_CUSTOM_PROMPTS, DOK_DESCRIPTIONS, QUESTION_TYPES, DIFFICULTY_LEVELS_VOICE_QUESTIONS, DIFFICULTY_LEVELS_PHONUNCIATION_QUESTIONS
from .quiz_service import quiz_service

# Base prompt template for question generation without strengths/weaknesses
BASE_TEXT_QUESTION_TEMPLATE = """ 
You are helping Vietnamese students improve their English through creative and varied questions.

Use the following English learning materials as your inspiration. You are NOT restricted to the exact words or sentences in the provided data. Feel free to synthesize, combine, or transform ideas into realistic classroom or exam-style questions.

{ 
  "main_knowledge": "{content}",
  "prior_knowledge": "{prior_contents}",
  "sample_text": "{text_chunks}",
  "custom_prompt": "{custom_prompt}",
  "question_types": "{question_types}",
  "count": "{count}"
}

Instruction:
Create {count} unique multiple-choice questions.

Make sure:
1. Use a variety of school-level question formats. Avoid repeating similar formats.
2. You may occasionally draw on vocabulary or grammar students are likely to have learned in earlier units, to reflect natural cumulative learning.
3. The content should feel like it belongs in a Vietnamese English textbook or exam paper.
4. Avoid repetition.
5. The "question" field should only contain the problem statement (stem). Do not include any answer choices here. Put all four answer choices into the "options" list.
6. You may use standard Markdown syntax only (e.g., **bold**, *italic*, ~~strikethrough~~, line breaks \n). Use ___ for blanks.

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
    vocab: str,
    count: int,
    custom_prompt: Optional[str] = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    prompt_template = PromptTemplate(
        template="""
            You are an educational content creation expert. Create {count} English vocabulary learning questions using images based on the following vocabulary list:
            {vocab_list}
            
            
            ## TASK REQUIREMENTS
            1. Each question must focus on **one specific vocabulary word** that is a noun and can be visualized with an image.
            2. For each word:
                - Create a question: What is this?
                - The correct answer must be the vocabulary word.
                - Incorrect options **must not be semantically or visually similar** to the correct word. Avoid:
                    - Synonyms or related terms (e.g., 'road' vs 'path', 'chef' vs 'cook')
                    - Words that can appear in similar contexts or environments.
                - Think about what a beginner learner might confuse visually or conceptually — and avoid that.
            3. Include a detailed, unambiguous image description that:
                - Clearly shows the correct object or person in a relevant, identifiable setting.
                - Specifies the character's role, location, outfit, or actions to **eliminate confusion with similar roles**.
                - Includes **background context** (e.g., workplace, tools, environment) to support correct interpretation.
            
            Return the questions in JSON format with these fields:
            - question: "What is this?"
            - options: array of 4 English words
            - correct_answer: the correct English word
            - type: "image"
            - image_description: detailed description for image generation
            
            ## FORMAT INSTRUCTIONS
            Return the output as a valid JSON array of {count} question objects. Each object must strictly follow this schema:
            ```json
            {
            "question": "What is this?",
            "options": array of 4 English words,
            "correct_answer": "the correct English word",
            "type": "image",
            "image_description": "Detailed visual description here"
            }
            ```
        """
    )
    
    prompt = prompt_template.format(vocab_list=vocab, count=count)
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
                f"An illustration in Duolingo flat style based on the following scene: {q.get('image_description', '')}. The image must not include any text or labels."
            ),
            "image_description": q.get("image_description", "")
        }
        for q in questions
    ]

def generate_voice_questions(
    content: str,
    count: int,
    text_chunks: Optional[str] = None,
    custom_prompt: Optional[str] = None,
    dok_level: Optional[int] = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    prompt_template = PromptTemplate(
        template="""
            You are an expert in designing English listening comprehension questions to help Vietnamese learners distinguish between similar-sounding words.
            Use the vocabulary list and sample English text provided as inspiration. You are NOT restricted to the exact words or sentences. Feel free to create realistic, classroom-style or exam-style questions that test pronunciation discrimination.
            
            {
                "vocabulary_list": {vocab_list},
                "sample_text": {text_chunks},
                "difficulty_level": {diffucult_level} 
            }
            
            ## For each question (choose {count} total):
            Create EITHER of the following two types:
                1. **Multiple Choice Listening**
                - Prompt: "Which word did you hear?"
                - Pick one word from the list and one similar-sounding distractor (e.g., sheep vs ship, live vs leave).
                - These words should sound similar but have different meanings.

                2. **Fill in the Blank with Phrase Context**
                - Use one of the vocabulary words (or a similar-sounding word pair) in a natural sentence or phrase.
                - Mask the target word with a blank (e.g., "He sat on the ___ by the fire.")
                - Provide two options: correct word and a distractor.

            ## You must:
            - Use real, natural English phrases or sentences (can be based on sample_text)
            - Prioritize word pairs that Vietnamese learners tend to confuse in listening (e.g., bad–bed, pan–pen, rice–lice)
            - Randomly mix between the two question types

            ## Output format:
            Return a list of JSON objects with these fields:
            - question: "Which word did you hear?"
            - options: array with the correct word and similar-sounding word
            - correct_answer: word
            - type: "voice"

            Generate exactly {count} questions. Output only the JSON list.
            """
        )
    text_chunks = f"- Sample textbook snippets: {text_chunks}" if len(text_chunks) > 0 else ""
    diffucult_level = DIFFICULTY_LEVELS_VOICE_QUESTIONS[dok_level]
    prompt = prompt_template.format(
        vocab_list=content, 
        count=count,
        text_chunks=text_chunks,
        diffucult_level=diffucult_level
    )
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
    text_chunks: str,
    custom_prompt: Optional[str] = None,
    dok_level: Optional[int] = None
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    
    prompt_template = PromptTemplate(
        template="""
            You are an expert in creating pronunciation practice questions for English learners, especially Vietnamese speakers.
            Use the materials below for inspiration. You are NOT limited to the exact sentences. You may adapt, merge, or simplify ideas to create natural, exam-style questions.

            ## Instructions:
            From the given list of English vocabulary items, generate {count} pronunciation practice questions. The questions can focus on either:
            - A **single word** (especially those commonly mispronounced by Vietnamese learners)
            - A **natural phrase** (e.g., short common expressions, idioms, or real-life collocations using the provided words)

            {
                "vocabulary_list": {vocab_list},
                "sample_text": {text_chunks},
                "difficulty_level": {diffucult_level} 
            }

            ## For each question:
            1. Choose a target: either a **word** or a **realistic phrase** containing one or more of the input words.
            2. Ensure phrases reflect real spoken English and are useful for learners.

            ## Output format:
            Return a list of JSON objects with these fields:
            - question: "Please pronounce this word correctly: word"
            - correct_answer: word
            - type: "pronunciation"

            Generate exactly {count} items. Output only the JSON list, no extra text.
            """
            )
    text_chunks = f"- Sample textbook snippets: {text_chunks}" if len(text_chunks) > 0 else ""
    diffucult_level = DIFFICULTY_LEVELS_PHONUNCIATION_QUESTIONS[dok_level]
    prompt = prompt_template.format(
        vocab_list=content, 
        count=count,
        text_chunks=text_chunks,
        diffucult_level=diffucult_level
    )
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
    vocabs: List[str],
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
    combined_vocabs = "\n".join(vocabs)
       
    # Split voice questions between voice and pronunciation
    pronunciation_count = 1 if voice_count > 0 else 0
    listen_count = voice_count - pronunciation_count
    
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
        vocabs=combined_vocabs,
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
    
    # Get maximum of dok_level to meaning difficult level
    image_questions = generate_image_questions(vocabs, image_count, custom_prompt)
    voice_questions = generate_voice_questions(vocabs, listen_count, combined_text_chunks, custom_prompt, max(dok_level))
    pronunciation_questions = generate_pronunciation_questions(vocabs, pronunciation_count, combined_text_chunks, custom_prompt, max(dok_level))
    
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
    dok_level: Optional[str] = None
) -> Dict[str, List[Dict[str, Any]]]:
    """Generate adaptive questions based on user's strengths and weaknesses."""   
    # Split voice questions between voice and pronunciation
    pronunciation_count = 1 if voice_count > 0 else 0
    voice_count = voice_count - pronunciation_count

    # Create adaptive prompt based on strengths and weaknesses
    adaptive_prompt = "Please focus on these areas that need improvement:\n"
    adaptive_prompt += "\n".join(f"- {weakness}" for weakness in weaknesses)
    adaptive_prompt += "\n\nWhile maintaining these strong areas:\n"
    adaptive_prompt += "\n".join(f"- {strength}" for strength in strengths)
    
    # Convert DOK Enum to DOK Level
    DOK_LEVEL = {
        "RECALL": 1,
        "SKILL_CONCEPT": 2,
        "STRATEGIC_THINKING": 3,
    }
    dok_level = dok_level.strip('{}').split(',')
    dok_level = max([DOK_LEVEL[i] for i in dok_level])
    
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
    voice_questions = generate_voice_questions(contents, voice_count, text_chunks, custom_prompt, dok_level)
    pronunciation_questions = generate_pronunciation_questions(contents, pronunciation_count, text_chunks, custom_prompt, dok_level)
    
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