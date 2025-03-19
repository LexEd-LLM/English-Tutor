import gradio as gr
import random
import numpy as np
from dotenv import load_dotenv, find_dotenv
import os
import json
import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from llama_index.core import (
    VectorStoreIndex, 
    SimpleDirectoryReader,
    StorageContext,
    Settings
)
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.langchain import LangchainEmbedding
from llama_index.core.response_synthesizers import ResponseMode
from llama_index.llms.gemini import Gemini
from llama_index.core.schema import QueryBundle
from llama_index.core.output_parsers import PydanticOutputParser
from llama_index.core.prompts import PromptTemplate
from pydantic import BaseModel, Field
from typing import List

_ = load_dotenv(find_dotenv())

# Initialize Gemini
os.environ["GEMINI_API_KEY"] = os.getenv('GEMINI_API_KEY')
llm = Gemini(model="models/gemini-2.0-flash", temperature=1)

# Initialize embedding model
lc_embed_model = HuggingFaceEmbeddings(
    model_name="intfloat/multilingual-e5-small"
)
embed_model = LangchainEmbedding(lc_embed_model)
Settings.embed_model = embed_model

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(path="../chromadb")

def load_database():
    """
    Connect database with ChromaDB backend.
    :return: LlamaIndex index
    """
    # Setup ChromaDB
    chroma_collection = chroma_client.get_collection("unit1_db")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    
    # Create index with custom embedding model
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model,
    )
    
    return index

def get_relevant_chunk(index, question_context, top_k=3):
    """
    Gets the most relevant chunks of text for a given context using similarity search
    :param index: LlamaIndex index object
    :param question_context: Context/prompt to search for relevant chunks
    :param top_k: Number of top chunks to retrieve
    :return: List of relevant text chunks
    """
    query_engine = index.as_query_engine(
        similarity_top_k=top_k,
        response_mode=ResponseMode.NO_TEXT
    )
    response = query_engine.query(question_context)
    source_nodes = response.source_nodes
    
    # Extract text from source nodes
    text_chunks = [node.node.text for node in source_nodes]
    return text_chunks

class QuizQuestion(BaseModel):
    question: str = Field(description="The multiple-choice question")
    option_a: str = Field(description="Option A for the question")
    option_b: str = Field(description="Option B for the question")
    option_c: str = Field(description="Option C for the question")
    option_d: str = Field(description="Option D for the question")
    correct_answer: str = Field(description="The correct answer for the question which should be one of the multiple-choice question")

def generate_questions_batch(chunks, n_questions):
    """
    Generates multiple questions from given chunks of text
    :param chunks: List of text chunks to generate questions from
    :param n_questions: Number of questions to generate
    :return: List of tuples (question, options, correct_answer, explanation)
    """
    combined_content = "\n\n".join(chunks)
    
    # Create the output parser
    output_parser = PydanticOutputParser(QuizQuestion)
    
    # Define the prompt template for multiple questions
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
    
    # Format the prompt
    prompt = prompt_template.format(
        content=combined_content,
        n_questions=n_questions,
        format_instructions=output_parser.get_format_string()
    )
    
    # Generate response
    response = llm.complete(prompt)

    questions_data = []
    
    try:
        # Split response into individual questions
        question_texts = response.text.split("\n\n")
        
        for q_text in question_texts:
            if not q_text.strip():
                continue
                
            # Clean up the text to ensure proper JSON format
            q_text = q_text.strip()
            if q_text.startswith("```json"):
                q_text = q_text[7:]
            if q_text.endswith("```"):
                q_text = q_text[:-3]
                
            try:
                result = output_parser.parse(q_text)
                
                question = result.question
                correct_answer = result.correct_answer
                options = ["Option A", "Option B", "Option C", "Option D"]
                answers = [result.option_a, result.option_b, result.option_c, result.option_d]
                
                pre_answer = ['A) ', 'B) ', 'C) ', 'D) ']
                formatted_question = question + '\n' + " ".join([pre + " " + answer for pre, answer in zip(pre_answer, answers)])
                
                correct_option = options[answers.index(correct_answer)]
                explanation = generate_explanation(question, correct_answer)
                
                questions_data.append((formatted_question, options, correct_option, explanation))
                
                if len(questions_data) >= n_questions:
                    break
                    
            except Exception as e:
                print(f"Error parsing individual question: {e}")
                continue
                
    except Exception as e:
        print(f"Error processing questions: {e}")
        return []
    
    return questions_data[:n_questions]

def generate_explanation(question, correct_answer):
    """
    Generates an explanation for the provided question and correct answer.
    :param question: The question for which to generate an explanation.
    :param correct_answer: The correct answer to the question.
    :return: Generated explanation as a string.
    """
    template = PromptTemplate(
        template="Provide an explanation for the following question and answer:\n\nQuestion: {question}\nCorrect Answer: {correct_answer}\n\nExplanation:"
    )
    
    # Format the prompt
    prompt = template.format(question=question, correct_answer=correct_answer)
    
    # Generate response
    response = llm.complete(prompt)
    
    return response.text

def check_all_answers(user_answers, questions_data):
    """
    Checks all answers and generates results
    :param user_answers: List of user's answers
    :param questions_data: List of question data tuples
    :return: Score, results and explanations
    """
    score = 0
    results = []
    for idx, (answer, (_, _, correct_answer, explanation)) in enumerate(zip(user_answers, questions_data)):
        if answer == correct_answer:
            score += 1
            result = "✓ Correct!"
        else:
            result = "✗ Incorrect"
        results.append({
            'question_num': idx + 1,
            'result': result,
            'explanation': explanation,
            'your_answer': answer,
            'correct_answer': correct_answer
        })
    return score, results

# Update Gradio interface
with gr.Blocks() as demo:
    gr.Markdown("### PDF Ebook / File Quiz Application")

    with gr.Row():
        prompt_input = gr.Textbox(
            label="Enter your topic or concept",
            placeholder="What topic would you like to be quizzed on?",
            lines=2
        )
        pdf_file = gr.File(label="Upload the PDF book (optional)")
    
    num_questions = gr.Slider(minimum=1, maximum=50, step=1, value=30, label="Number of Questions")
    start_btn = gr.Button("Start Quiz")

    # Container for dynamically generated questions
    questions_container = gr.Column(visible=True)
    with questions_container:
        questions_box = gr.Column()  # Container for dynamic questions
        submit_all_btn = gr.Button("Submit All Answers", visible=False)
    
    # States
    questions_data_state = gr.State([])
    answer_components = gr.State([])  # Store radio components
    
    # Results section
    results_container = gr.Column(visible=True)
    with results_container:
        score_label = gr.Label(label="Final Score")
        with gr.Accordion("View Detailed Explanations", open=False):
            results_markdown = gr.Markdown()

    def generate_question_components(questions_data):
        """Creates question components dynamically"""
        components = []
        radio_components = []
        
        for idx, (question, options, _, _) in enumerate(questions_data):
            with gr.Group():
                q_text = gr.Markdown(f"**Question {idx + 1}:**\n{question}")
                q_radio = gr.Radio(
                    choices=options,
                    label=f"Answer for Question {idx + 1}",
                    interactive=True
                )
                components.extend([q_text, q_radio])
                radio_components.append(q_radio)
                
        return components, radio_components

    def process_all_answers(questions_data, *answers):
        """Process all answers and show results"""
        score, results = check_all_answers(answers, questions_data)
        total = len(questions_data)
        
        # Generate detailed results markdown
        details = "### Detailed Results\n\n"
        for res in results:
            details += f"**Question {res['question_num']}**: {res['result']}\n"
            details += f"Your answer: {res['your_answer']}\n"
            details += f"Correct answer: {res['correct_answer']}\n"
            details += f"Explanation: {res['explanation']}\n\n"
            details += "---\n\n"
        
        return [
            f"Score: {score}/{total}",  # score_label
            details,                    # results_markdown
            gr.update(visible=True),    # results_container
            gr.update(visible=True),   # questions_container
        ]

    def start_quiz_new(prompt, file, num_questions):
        try:
            index = load_database()
            text_chunks = get_relevant_chunk(index, prompt, top_k=4)
            questions_data = generate_questions_batch(text_chunks, num_questions)
            
            # Generate components for all questions
            components, radio_components = generate_question_components(questions_data)
            
            return [
                questions_data,                 # questions_data_state
                radio_components,               # answer_components
                gr.update(value=components),    # questions_box
                gr.update(visible=True),        # questions_container
                gr.update(visible=True),        # submit_all_btn
                gr.update(visible=True),       # results_container
            ]
            
        except Exception as e:
            print(f"Error: {e}")
            return [
                [],                             # questions_data_state
                [],                             # answer_components
                gr.update(value=[]),            # questions_box
                gr.update(visible=False),       # questions_container
                gr.update(visible=False),       # submit_all_btn
                gr.update(visible=False),       # results_container
            ]

    start_btn.click(
        start_quiz_new,
        inputs=[prompt_input, pdf_file, num_questions],
        outputs=[
            questions_data_state,
            answer_components,
            questions_box,
            questions_container,
            submit_all_btn,
            results_container
        ]
    )

    submit_all_btn.click(
        process_all_answers,
        inputs=[questions_data_state] + [answer_components],
        outputs=[
            score_label,
            results_markdown,
            results_container,
            questions_container
        ]
    )

demo.launch(share=False)