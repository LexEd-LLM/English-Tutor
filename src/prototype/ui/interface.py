import gradio as gr
from prototype.services.quiz_service import check_all_answers
from prototype.database.vector_store import load_database, get_relevant_chunk
from prototype.services.question_generator import generate_questions_batch

def create_quiz_interface():
    """Creates and returns the Gradio interface components"""
    with gr.Blocks() as demo:
        gr.Markdown("### PDF Ebook / File Quiz Application")

        with gr.Row():
            with gr.Column():
                prompt_input = gr.Textbox(
                    label="Enter your topic or concept",
                    placeholder="What topic would you like to be quizzed on?",
                    lines=2
                )
                status = gr.Textbox(
                    label="Status",
                    interactive=False,
                )
                
            pdf_file = gr.File(
                label="Upload the PDF book (optional)", 
                scale=0.2,
                height="100px"
            )
        
        num_questions = gr.Slider(minimum=1, maximum=50, step=1, value=30, label="Number of Questions")
        start_btn = gr.Button("Start Quiz")
        
        # Thay đổi cách hiển thị questions
        questions_container = gr.Column(visible=False)
        with questions_container:
            # Container cho từng cặp câu hỏi và radio button
            question_boxes = []
            radio_boxes = []
            explanation_markdowns = []
            explanation_accordions = []  # Thêm list mới để theo dõi accordions
            for i in range(50):  # Pre-create containers for max questions
                with gr.Group():
                    question_box = gr.Markdown(visible=False)
                    radio_box = gr.Radio(
                        choices=[],
                        label=f"Select answer",
                        visible=False,
                        interactive=True
                    )
                    with gr.Accordion("View Explanation", open=False, visible=False) as explanation_acc:
                        explanation_md = gr.Markdown("", visible=True)
                    question_boxes.append(question_box)
                    radio_boxes.append(radio_box)
                    explanation_markdowns.append(explanation_md)
                    explanation_accordions.append(explanation_acc)  # Lưu accordion
            
            submit_all_btn = gr.Button("Submit All Answers", visible=True)
        
        questions_data_state = gr.State([])
        answer_components = gr.State([])
        
        results_container = gr.Column(visible=False)
        with results_container:
            score_label = gr.Label(label="Final Score")

        def start_quiz_new(prompt, file, num_questions, progress=gr.Progress()):
            try:
                progress(0, desc="Loading database...")
                index = load_database()
                
                progress(0.2, desc="Getting relevant content...")
                text_chunks = get_relevant_chunk(index, prompt, top_k=4)
                
                progress(0.3, desc="Generating questions...")
                questions_data = generate_questions_batch(text_chunks, num_questions)
                
                progress(0.8, desc="Preparing interface...")
                # Prepare updates
                question_updates = []
                radio_updates = []
                explanation_md_updates = []
                explanation_acc_updates = []  # Thêm updates cho accordions
                
                # Hide all containers first
                for i in range(50):
                    question_updates.append(gr.update(visible=False))
                    radio_updates.append(gr.update(visible=False))
                    explanation_md_updates.append(gr.update(value=""))
                    explanation_acc_updates.append(gr.update(visible=False))
                
                # Update containers
                for idx, (question, options, _, _) in enumerate(questions_data):
                    question_updates[idx] = gr.update(
                        value=f"### Question {idx + 1}:\n{question}",
                        visible=True
                    )
                    radio_updates[idx] = gr.update(
                        choices=options,
                        label=f"Select answer for Question {idx + 1}",
                        visible=True
                    )
                    explanation_md_updates[idx] = gr.update(value="Explanation will appear here after submission")
                    explanation_acc_updates[idx] = gr.update(visible=False)  # Ẩn accordion khi bắt đầu
                
                progress(1.0, desc="Done!")
                return [
                    questions_data,
                    *question_updates,
                    *radio_updates,
                    *explanation_md_updates,
                    *explanation_acc_updates,
                    gr.update(visible=True),    # questions_container
                    gr.update(visible=False),   # results_container
                    "Quiz ready!" 
                ]
                
            except Exception as e:
                print(f"Error: {e}")
                # Create empty updates for all containers
                empty_updates = [gr.update(visible=False)] * 100  # For both questions and radios
                return [
                    [],                               # questions_data_state
                    *empty_updates,                   # Hide all containers
                    gr.update(visible=False),         # questions_container
                    gr.update(visible=False),         # results_container
                    f"Error: {str(e)}"                # status update
                ]

        def process_all_answers(questions_data, *answers):
            """Process all answers and show results"""
            valid_answers = [ans for ans in answers if ans is not None]
            score, results = check_all_answers(valid_answers[:len(questions_data)], questions_data)
            total = len(questions_data)
            
            # Tạo updates cho explanations
            explanation_md_updates = []
            explanation_acc_updates = []
            for i in range(50):
                explanation_md_updates.append(gr.update(value=""))
                explanation_acc_updates.append(gr.update(visible=False))
            
            for res in results:
                idx = res['question_num'] - 1
                explanation_text = f"**Result**: {res['result']}\n"
                explanation_text += f"Your answer: {res['your_answer']}\n"
                explanation_text += f"Correct answer: {res['correct_answer']}\n"
                explanation_text += f"Explanation: {res['explanation']}"
                explanation_md_updates[idx] = gr.update(value=explanation_text)
                explanation_acc_updates[idx] = gr.update(visible=True)  # Hiện accordion sau khi submit
            
            return [
                f"Score: {score}/{total}",
                *explanation_md_updates,
                *explanation_acc_updates,
                gr.update(visible=True),    # results_container
                gr.update(visible=True),    # questions_container
            ]

        # Setup click handlers
        start_btn.click(
            fn=start_quiz_new,
            inputs=[prompt_input, pdf_file, num_questions],
            outputs=[
                questions_data_state,
                *question_boxes,
                *radio_boxes,
                *explanation_markdowns,
                *explanation_accordions,
                questions_container,
                results_container,
                status
            ],
            show_progress=True
        )

        submit_all_btn.click(
            process_all_answers,
            inputs=[questions_data_state] + radio_boxes,
            outputs=[
                score_label,
                *explanation_markdowns,
                *explanation_accordions,  # Thêm accordions vào outputs
                results_container,
                questions_container
            ]
        )

    return demo