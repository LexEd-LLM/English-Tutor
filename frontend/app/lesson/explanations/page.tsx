"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { getGeneratedQuiz } from "@/actions/quiz";
import ReactMarkdown from 'react-markdown';
import Image from "next/image";
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";

// Types
interface ChallengeOption {
  id: number;
  text: string;
  correct: boolean;
  imageSrc?: string | null;
  audioSrc?: string | null;
}

interface BaseQuestion {
  id: number;
  question: string;
  type: string;
  challengeOptions: ChallengeOption[];
  explanation?: string;
}

interface ImageQuestion extends BaseQuestion {
  imageUrl: string;
}

interface VoiceQuestion extends BaseQuestion {
  audioUrl: string;
}

type QuizQuestion = BaseQuestion | ImageQuestion | VoiceQuestion;

// Utility functions
const isImageQuestion = (question: QuizQuestion): question is ImageQuestion => 
  question.type === "IMAGE";

const isVoiceQuestion = (question: QuizQuestion): question is VoiceQuestion => 
  question.type === "VOICE";

const getImageUrl = (question: QuizQuestion): string | undefined => {
  const q = question as any;
  return q.type === "IMAGE" && q.imageUrl ? q.imageUrl : undefined;
};

const getAudioUrl = (question: QuizQuestion): string | undefined => {
  const q = question as any;
  return q.type === "VOICE" && q.audioUrl ? q.audioUrl : undefined;
};

export default function ExplanationsPage() {
  // State
  const [mounted, setMounted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [generatingExplanations, setGeneratingExplanations] = useState<Record<number, boolean>>({});
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [savedExplanations, setSavedExplanations] = useState<Record<number, boolean>>({});
  
  // Refs
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const router = useRouter();

  // Add hydration protection
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Load saved explanation from database
  const loadSavedExplanation = async (questionId: number) => {
    try {
      const response = await fetch(`/api/generate-explanation?questionId=${questionId}`);
      
      if (response.ok) {
        const data = await response.json();
        setExplanations(prev => ({
          ...prev,
          [questionId]: data.explanation
        }));
        setSavedExplanations(prev => ({
          ...prev,
          [questionId]: true
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error loading explanation:", error);
      return false;
    }
  };

  // Generate explanation function
  const generateExplanation = async (questionId: number, question: string, correctAnswer: string, questionType?: string, userAnswer?: string) => {
    // Don't generate for image/audio questions
    if (questionType === "IMAGE" || questionType === "VOICE") {
      setExplanations(prev => ({
        ...prev,
        [questionId]: "Dạng bài này không được hỗ trợ"
      }));
      return;
    }
    
    setGeneratingExplanations(prev => ({ ...prev, [questionId]: true }));
    
    try {
      const response = await fetch("/api/generate-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          correct_answer: correctAnswer,
          question_type: questionType,
          question_id: questionId,
          user_answer: userAnswer
        })
      });
      
      if (!response.ok) throw new Error("Failed to generate explanation");
      
      const data = await response.json();
      
      // Cập nhật explanation
      setExplanations(prev => ({
        ...prev,
        [questionId]: data.explanation
      }));
      
      // Chỉ cập nhật trạng thái saved nếu API trả về saved: true
      if (data.saved) {
        setSavedExplanations(prev => ({
          ...prev,
          [questionId]: true
        }));
      } else {
        // Nếu không lưu được vào DB, hiển thị thông báo lỗi
        console.error("Failed to save explanation:", data.error);
        setSavedExplanations(prev => ({
          ...prev,
          [questionId]: false
        }));
      }
    } catch (error) {
      console.error("Error generating explanation:", error);
      setSavedExplanations(prev => ({
        ...prev,
        [questionId]: false
      }));
    } finally {
      setGeneratingExplanations(prev => ({ ...prev, [questionId]: false }));
    }
  };

  // Load questions and user answers on mount
  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoading(true);
        const quizQuestions = await getGeneratedQuiz();
        
        // Process questions to ensure proper URLs and maintain order
        const transformedQuestions = quizQuestions
          .map(q => {
            const transformed: any = { ...q };
            
            if (q.type === "IMAGE") {
              const imageUrl = (q as any).imageUrl || (q as any).image_url;
              if (imageUrl) {
                transformed.imageUrl = imageUrl.startsWith('http') || imageUrl.startsWith('/') 
                  ? imageUrl : '/' + imageUrl;
              }
            }
            
            if (q.type === "VOICE") {
              const audioUrl = (q as any).audioUrl || (q as any).audio_url;
              if (audioUrl) {
                transformed.audioUrl = audioUrl.startsWith('http') || audioUrl.startsWith('/') 
                  ? audioUrl : '/' + audioUrl;
              }
            }
            
            return transformed as QuizQuestion;
          })
          // Sort by question ID to maintain original order
          .sort((a, b) => a.id - b.id);
        
        setQuestions(transformedQuestions);
        
        // Lấy câu trả lời của người dùng từ localStorage
        const savedAnswers = localStorage.getItem('quizUserAnswers');
        if (savedAnswers) {
          try {
            const parsedAnswers = JSON.parse(savedAnswers);
            setUserAnswers(parsedAnswers);
            
            // Lấy explanations từ database cho mỗi câu hỏi
            if (transformedQuestions.length > 0) {
              for (const question of transformedQuestions) {
                await loadSavedExplanation(question.id);
              }
            }
          } catch (e) {
            console.error("Error parsing saved answers:", e);
          }
        }
      } catch (error) {
        console.error("Error loading questions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, []);

  // Audio play function
  const handlePlayAudio = (questionId: number, audioUrl?: string) => {
    if (!audioUrl || !audioRefs.current[questionId]) return;
    
    const audio = audioRefs.current[questionId];
    // Reset về đầu và phát
    audio.currentTime = 0;
    audio.play()
      .catch(error => {
        // Xử lý lỗi phát audio
      });
  };

  // Navigation
  const goBackToLearn = () => router.push("/learn");
  const toggleExplanation = (id: number) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Loading state
  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-green-500 border-b-green-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading explanations...</p>
      </div>
    );
  }

  // No data state
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
          const userSelectedId = userAnswers[question.id];
          const userSelectedOption = userSelectedId 
            ? question.challengeOptions.find((opt: any) => opt.id === userSelectedId) 
            : null;
          const isUserAnswerCorrect = userSelectedOption?.correct || false;
          const isExpanded = expandedQuestions[question.id] || false;
          const hasImage = isImageQuestion(question);
          const hasAudio = isVoiceQuestion(question);
          const questionType = hasImage ? "IMAGE" : hasAudio ? "VOICE" : "TEXT";
          const hasExplanation = explanations[question.id] || question.explanation;
          const isSaved = savedExplanations[question.id];
          
          return (
            <div key={question.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 font-medium px-2 py-1 rounded-full flex-shrink-0">
                    Question {index + 1}
                  </span>
                  <div className="w-full">
                    <div className="flex items-center gap-4 font-semibold">
                      <span>{question.question}</span>
                      {hasAudio && (
                        <button
                          onClick={() => handlePlayAudio(question.id, getAudioUrl(question))}
                          className="flex items-center justify-center p-2 rounded-full hover:bg-neutral-100 transition"
                          title="Phát âm thanh"
                        >
                          <Image
                            src="/speaker.svg"
                            alt="Play audio"
                            width={24}
                            height={24}
                            className="cursor-pointer"
                            style={{ filter: "invert(48%) sepia(80%) saturate(2476%) hue-rotate(200deg) brightness(118%) contrast(119%)" }}
                          />
                        </button>
                      )}
                    </div>
                    
                    {/* Audio player */}
                    {mounted && hasAudio && getAudioUrl(question) && (
                      <audio 
                        ref={el => { 
                          audioRefs.current[question.id] = el;
                        }}
                        src={getAudioUrl(question)}
                        preload="metadata"
                      />
                    )}
                    
                    {/* Image display */}
                    {mounted && hasImage && getImageUrl(question) && (
                      <div className="relative h-64 w-full overflow-hidden rounded-lg mt-4">
                        <img 
                          src={getImageUrl(question)} 
                          alt="Question image"
                          className="absolute inset-0 w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Answer Options:</h3>
                  <ul className="space-y-2">
                    {question.challengeOptions.map((option: any) => {
                      // Xác định class dựa trên việc option có phải là câu trả lời đã chọn hay không
                      const isSelected = option.id === userSelectedId;
                      const bgColorClass = option.correct 
                        ? 'bg-green-50 text-green-600 font-medium' 
                        : isSelected && !option.correct
                          ? 'bg-red-50 text-red-600 font-medium'
                          : 'bg-gray-50';
                      
                      // Xác định icon phù hợp
                      const iconClass = option.correct 
                        ? "text-green-500" 
                        : isSelected && !option.correct
                          ? "text-red-500"
                          : "text-gray-400";
                          
                      return (
                        <li 
                          key={option.id} 
                          className={`flex items-center p-2 rounded ${bgColorClass} ${isSelected ? 'border border-2 border-blue-300' : ''}`}
                        >
                          {option.correct ? (
                            <CheckCircle className={`mr-2 h-5 w-5 ${iconClass}`} />
                          ) : isSelected ? (
                            <XCircle className={`mr-2 h-5 w-5 ${iconClass}`} />
                          ) : (
                            <XCircle className="mr-2 h-5 w-5 text-gray-400" />
                          )}
                          
                          <div className="flex-1">
                            {option.text}
                            {isSelected && (
                              <span className="ml-2 font-medium">
                                {option.correct 
                                  ? '(Đáp án của bạn - Đúng)' 
                                  : '(Đáp án của bạn - Sai)'}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
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
                      {hasExplanation && mounted && (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeRaw]}
                          >
                            {explanations[question.id] || question.explanation}
                          </ReactMarkdown>
                        </div>
                      )}
                      
                      <div className="mt-4 flex gap-2">
                        <Button 
                          onClick={() => generateExplanation(
                            question.id, 
                            question.question, 
                            correctOption?.text || 'No correct answer',
                            questionType,
                            userSelectedOption?.text
                          )}
                          disabled={generatingExplanations[question.id]}
                          className="flex items-center gap-2"
                          variant={hasExplanation ? "secondaryOutline" : "default"}
                        >
                          {generatingExplanations[question.id] ? (
                            <>
                              <div className="w-4 h-4 border-2 border-t-green-500 border-b-green-500 rounded-full animate-spin"></div>
                              Generating...
                            </>
                          ) : hasExplanation ? (
                            <>
                              <RefreshCw size={16} />
                              Regenerate Explanation
                            </>
                          ) : (
                            <>
                              <Image src="/gemini-icon.png" alt="AI" width={20} height={20} />
                              AI Generate Explanation
                            </>
                          )}
                        </Button>
                        
                        {isSaved && (
                          <div className="text-xs text-green-600 flex items-center">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Saved
                          </div>
                        )}
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