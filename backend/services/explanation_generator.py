from typing import List
from llama_index.core.prompts import PromptTemplate
from ..config.settings import llm
from googletrans import Translator

def generate_explanation_mcq(question: str, correct_answer: str, user_answer: str, options: List[dict]) -> str:
    """Generate explanation for a question."""
    option_text = "\n".join(
        [f"{chr(65+i)}. {opt['text']}{' (Đáp án đúng)' if opt['correct'] else ''}" for i, opt in enumerate(options)]
    )
    
    template = PromptTemplate(
        template=(
        "You are a dedicated teacher helping 12th-grade students review English. "
        "Provide concise and focused explanations to help students clearly understand the concept.\n\n"
        "- Always explain why the correct answer is {correct_answer}.\n"
        "- If the student's answer ({user_answer}) is different from the correct answer, analyze the mistake and provide a relevant example.\n"
        "- If the student selected the correct answer, reinforce the concept by explaining why it is the best choice and give a similar example to help them remember.\n\n"
        "Question: {question}\n"
        "Options:\n{option_text}\n\n"
        "Student's answer: {user_answer}\n\n"
        "Explanation:"
        )
    )

    prompt = template.format(
        question=question,
        correct_answer=correct_answer,
        user_answer=user_answer,
        option_text=option_text
    )
    response = llm.complete(prompt)
    return "\n".join(response.text.splitlines()[1:])

def generate_explanation_pronunciation(question: str, correct_answer: str, user_answer: str) -> str:
    """Generate explanation for a question."""
    template = PromptTemplate(
        template=(
            "You are an experienced English pronunciation teacher (female persona) helping Vietnamese students improve their pronunciation.\n\n"
            "Below is the correct IPA transcription and the IPA transcription detected from the student's speech.\n"
            "Give your feedback in a natural and friendly tone (avoid describing actions or emotions), and keep your explanation clear and in English.\n\n"
            "- If the student pronounced the word correctly, acknowledge and give positive encouragement.\n"
            "- If there are clear mistakes, gently point them out and suggest how to improve, only when necessary.\n"
            "- You may refer to the following ideas to guide your feedback:\n"
            "  + Suggest which standard pronunciation (British or American) the student's pronunciation is closer to.\n"
            "  + Mention what is correct and what could be improved.\n"
            "  + Remind the student that small differences might be caused by limitations in the speech recognition system:\n"
            "      * \"ih\" <-> \"ah\", \"ih\" <-> \"eh\", \"ih\" <-> \"iy\"\n"
            "      * \"aa\" instead of \"ah\", \"ae\" instead of \"eh\", \"er\" instead of \"ah\", \"r\" instead of \"er\"\n"
            "    => Do not blame the student for minor mismatches.\n"
            "  + Offer tips on how to articulate the sound (mouth shape, tongue position, airflow) if helpful.\n"
            "  + Mention word stress naturally, and note that it may vary depending on the word's part of speech. Try to infer the part of speech based on how the student pronounced the word.\n"
            "  + Do not use numbered lists — write as if you're having a conversation.\n\n"
            "Information:\n\n"
            "Question: {question}\n"
            "Correct IPA transcription: {correct_answer}\n"
            "IPA transcription from the student's speech: {user_answer}\n"
            "Do not mention any system or AI in your response. Respond as if you are a teacher who just listened to the student speak.\n"
            "Your feedback and guidance (in English):"
        )
    )
    prompt = template.format(
        question=question,
        correct_answer=correct_answer,
        user_answer=user_answer
    )
    response = llm.complete(prompt)
    return "\n".join(response.text.splitlines())

async def generate_explanation_image(options: List[dict]) -> str:
    """Translate 4 answers and return Markdown table."""
    translator = Translator()
    
    translated_table = [
        "Dưới đây là phần dịch nghĩa các từ.",
        "| English  | Vietnamese     |",
        "|----------|----------------|"
    ]
    for option in options:
        translated = await translator.translate(option['text'], src='en', dest='vi')
        translated_table.append(f"| {option['text']} | {translated.text} |")

    return "\n".join(translated_table)