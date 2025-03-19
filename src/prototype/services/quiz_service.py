def check_all_answers(user_answers, questions_data):
    """Checks all answers and generates results"""
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