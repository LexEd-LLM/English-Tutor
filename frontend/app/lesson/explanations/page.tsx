"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { getGeneratedQuiz } from "@/actions/quiz";
import ReactMarkdown from 'react-markdown';
import Image from "next/image";
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

export default function ExplanationsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [generatingExplanations, setGeneratingExplanations] = useState<Record<number, boolean>>({});
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const router = useRouter();

  const generateExplanation = async (questionId: number, question: string, correctAnswer: string) => {
    setGeneratingExplanations(prev => ({
      ...prev,
      [questionId]: true
    }));
    
    try {
      const response = await fetch("/api/generate-explanation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          correct_answer: correctAnswer
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate explanation");
      }
      
      const data = await response.json();
      
      setExplanations(prev => ({
        ...prev,
        [questionId]: data.explanation
      }));
    } catch (error) {
      console.error("Error generating explanation:", error);
    } finally {
      setGeneratingExplanations(prev => ({
        ...prev,
        [questionId]: false
      }));
    }
  };

  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoading(true);
        const quizQuestions = await getGeneratedQuiz();
        setQuestions(quizQuestions || []);
      } catch (error) {
        console.error("Failed to load quiz questions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, []);

  const goBackToLearn = () => {
    router.push("/learn");
  };

  const toggleExplanation = (id: number) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-green-500 border-b-green-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading explanations...</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-lg p-6 bg-white rounded-xl shadow-md">
          <h2 className="text-center text-xl font-bold mb-4">No Quiz Data Found</h2>
          <div className="flex flex-col items-center">
            <p className="mb-4">There are no quiz questions to explain.</p>
            <Button onClick={goBackToLearn} variant="primary">Return to Learn</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center">
        <Button 
          variant="ghost" 
          onClick={goBackToLearn} 
          className="flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Learn
        </Button>
        <h1 className="text-3xl font-bold text-center flex-1">Quiz Explanations</h1>
      </div>

      <div className="space-y-8">
        {questions.map((question, index) => {
          const correctOption = question.challengeOptions.find((opt: any) => opt.correct);
          const isExpanded = expandedQuestions[question.id] || false;
          
          return (
            <div key={question.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 font-medium px-2 py-1 rounded-full flex-shrink-0">
                    Question {index + 1}
                  </span>
                  <span className="font-semibold">{question.question}</span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Answer Options:</h3>
                  <ul className="space-y-2">
                    {question.challengeOptions.map((option: any) => (
                      <li 
                        key={option.id} 
                        className={`flex items-center p-2 rounded ${
                          option.correct 
                            ? 'bg-green-50 text-green-600 font-medium' 
                            : 'bg-gray-50'
                        }`}
                      >
                        {option.correct ? (
                          <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="mr-2 h-5 w-5 text-gray-400" />
                        )}
                        {option.text}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <Button 
                    onClick={() => toggleExplanation(question.id)}
                    className="w-full flex justify-between items-center"
                    variant="default"
                  >
                    <span className="font-semibold">Explanation</span>
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </Button>
                  
                  {isExpanded && (
                    <div className="mt-2 p-4 bg-blue-50 rounded-md">
                      {question.explanation || explanations[question.id] ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeRaw]}
                          >
                            {explanations[question.id] || question.explanation}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div>
                          <p className="italic text-gray-500 mb-4">
                            No explanation available for this question.
                          </p>
                          
                          <Button 
                            onClick={() => generateExplanation(
                              question.id, 
                              question.question, 
                              correctOption.text
                            )}
                            disabled={generatingExplanations[question.id]}
                            className="flex items-center gap-2"
                            variant="outline"
                          >
                            {generatingExplanations[question.id] ? (
                              <>
                                <div className="w-4 h-4 border-2 border-t-green-500 border-b-green-500 rounded-full animate-spin"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Image src="/gemini-icon.png" alt="AI" width={20} height={20} />
                                AI Generate Explanation
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      
                      <div className="mt-4 p-3 bg-green-50 rounded-md">
                        <h3 className="font-semibold mb-1">Correct Answer:</h3>
                        <p className="font-medium text-green-700">
                          {correctOption ? correctOption.text : 'No correct answer specified'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 flex justify-center">
        <Button onClick={goBackToLearn} variant="primary" size="lg">
          Return to Learn
        </Button>
      </div>
    </div>
  );
} 