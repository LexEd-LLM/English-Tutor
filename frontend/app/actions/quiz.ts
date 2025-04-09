// Get stored quiz questions
export const getGeneratedQuiz = async (): Promise<QuizQuestion[]> => {
  try {
    const questions = await getUserQuizQuestions();
    
    if (questions && Array.isArray(questions)) {
      return questions;
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}; 