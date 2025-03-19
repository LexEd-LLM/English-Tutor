from llama_index.core.prompts import PromptTemplate
from llama_index.core.output_parsers import PydanticOutputParser
from prototype.config.settings import llm
from prototype.schemas.quiz import QuizQuestion

def generate_questions_batch(chunks, n_questions):
    """Generates multiple questions from given chunks of text"""
    combined_content = "\n\n".join(chunks)
    output_parser = PydanticOutputParser(QuizQuestion)
    
    prompt_template = PromptTemplate(
        template="""
            Generate {n_questions} different multiple-choice questions based on the following content.
            Make sure questions cover different aspects and concepts from the content.
            Content: {content}
            
            For each question, provide output in exactly this format:
            {format_instructions}
            
            Generate exactly {n_questions} questions, with each question separated by two newlines.
            DO NOT return a JSON array. Return each question in the exact format specified above.
        """
    )
    
    prompt = prompt_template.format(
        content=combined_content,
        n_questions=n_questions,
        format_instructions=output_parser.get_format_string()
    )
    
    response = llm.complete(prompt)
    return parse_questions(response.text, output_parser, n_questions)

def generate_explanation(question, correct_answer):
    """Generates explanation for a question"""
    template = PromptTemplate(
        template="Provide an explanation for the following question and answer:\n\nQuestion: {question}\nCorrect Answer: {correct_answer}\n\nExplanation:"
    )
    prompt = template.format(question=question, correct_answer=correct_answer)
    response = llm.complete(prompt)
    return response.text

def parse_questions(response_text, output_parser, n_questions):
    """Parse generated questions from response"""
    questions_data = []
    question_texts = response_text.split("\n\n")
    
    for q_text in question_texts:
        if not q_text.strip():
            continue
            
        q_text = q_text.strip()
        if q_text.startswith("```json"):
            q_text = q_text[7:]
        if q_text.endswith("```"):
            q_text = q_text[:-3]
            
        try:
            result = output_parser.parse(q_text)
            questions_data.append(format_question(result))
            
            if len(questions_data) >= n_questions:
                break
                
        except Exception as e:
            print(f"Error parsing question: {e}")
            continue
            
    return questions_data[:n_questions]

def format_question(result):
    """Format parsed question data"""
    question = result.question
    correct_answer = result.correct_answer
    options = ["Option A", "Option B", "Option C", "Option D"]
    answers = [result.option_a, result.option_b, result.option_c, result.option_d]
    
    pre_answer = ['A) ', 'B) ', 'C) ', 'D) ']
    formatted_question = question + '\n' + " ".join([pre + " " + answer for pre, answer in zip(pre_answer, answers)])
    
    correct_option = options[answers.index(correct_answer)]
    explanation = generate_explanation(question, correct_answer)
    
    return (formatted_question, options, correct_option, explanation)