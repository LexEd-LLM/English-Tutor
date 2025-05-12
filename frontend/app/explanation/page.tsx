"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { getQuizWithAnswers, generateExplanation, calculatePhonemeScore, generatePracticeQuiz, getStrengthWeakness, PhonemeAnalysis } from "./api";
import { Footer } from "./footer";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { ChatbotPopup } from "@/components/ChatbotPopup";

export default function ExplanationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const quizId = searchParams.get("quizId");
  const { userId } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [generatingExplanations, setGeneratingExplanations] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [savedExplanations, setSavedExplanations] = useState<Record<number, boolean>>({});
  const sampleAudioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const userAudioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const [strengths, setStrengths] = useState<string | null>(null);
  const [weaknesses, setWeaknesses] = useState<string | null>(null);
  const [phonemeAnalyses, setPhonemeAnalyses] = useState<
    Record<number, PhonemeAnalysis>
  >({});
  const pageContent = useMemo(() => {
    const blocks: string[] = [];
  
    if (strengths)   blocks.push(`Strengths:\n${strengths}`);
    if (weaknesses)  blocks.push(`Weaknesses:\n${weaknesses}`);
  
    questions.forEach((q, idx) => {
      blocks.push(`\nQuestion ${idx + 1}: ${q.questionText}`);
  
      // thêm các lựa chọn (nếu không phải PRONUNCIATION)
      if (q.type !== "PRONUNCIATION") {
        const opts = q.options.map((o: any) => {
          // đánh dấu đáp án đúng bằng *, đáp án người chọn bằng >
          const prefix = o.text === q.correctAnswer ? "*" :
                         o.text === q.userAnswer   ? ">" : " ";
          return `${prefix} ${o.text}`;
        }).join("\n");
        blocks.push("Options:\n" + opts);
      }
  
      // đáp án / kết quả
      const userAns = q.type === "PRONUNCIATION" ? q.userPhonemes : q.userAnswer;
      const result  = userAns === q.correctAnswer ? "Correct" : "Incorrect";
      blocks.push(`User answer: ${userAns || "-"}\nCorrect answer: ${q.correctAnswer}\nResult: ${result}`);
  
      // lời giải
      const exp = explanations[q.id] || q.explanation;
      if (exp) blocks.push("Explanation:\n" + exp);
    });
  
    return blocks.join("\n\n").trim();
  }, [strengths, weaknesses, questions, explanations]);

  useEffect(() => {
    if (quizId) {
      getQuizWithAnswers(Number(quizId)).then(async (quizData) => {
        setQuestions(quizData);
  
        const tempAnalyses: Record<number, PhonemeAnalysis> = {};
  
        for (const q of quizData) {
          if (q.type === "PRONUNCIATION") {
            try {
              const analysis  = await calculatePhonemeScore(q.userPhonemes!, q.correctAnswer);
              tempAnalyses[q.id] = analysis; 
            } catch (e) {
              console.error("Error calculating phoneme score:", e);
            }
          }
        }
  
        setPhonemeAnalyses(tempAnalyses);
      });

      getStrengthWeakness(Number(quizId)).then(data => {
        setStrengths(data.strengths);
        setWeaknesses(data.weaknesses);
      }).catch(err => {
        console.error("Failed to load strengths/weaknesses:", err);
      });
      
    }
  }, [quizId]);  

  const toggleExplanation = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateExplanation = async (questionId: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;
    
    setGeneratingExplanations((prev) => ({ ...prev, [questionId]: true }));

    try {
      const payload = {
        questionId: question.questionId,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        type: question.type,
        userAnswer: question.type === "PRONUNCIATION" ? question.userPhonemes : question.userAnswer,
      };
  
      const { explanation, saved } = await generateExplanation(payload);
      setExplanations((prev) => ({
        ...prev,
        [questionId]: explanation,
      }));

      setSavedExplanations((prev) => ({
      ...prev,
      [questionId]: saved,
      }));

    } catch (err) {
      console.error("Error generating explanation:", err);
    } finally {
      setGeneratingExplanations((prev) => ({
        ...prev,
        [questionId]: false,
      }));
    }
  };

  const handleReturnToLearn = () => {
    router.push("/learn");
  };

  const handlePracticeAgain = async () => {
    if (!userId || !quizId) {
      toast.error("Missing required information to start practice");
      return;
    }
    
    try {
      await generatePracticeQuiz(userId, Number(quizId));
    } catch (error) {
      console.error("Error starting practice:", error);
      toast.error("Failed to start practice session");
    }
  };

  const handlePlayAudio = (questionId: number, type: 'sample' | 'user') => {
    const audioRef = type === 'sample' ? sampleAudioRefs.current[questionId] : userAudioRefs.current[questionId];
    if (audioRef) {
      audioRef.currentTime = 0;
      audioRef.play().catch(console.error);
    }
  };

  const setSampleAudioRef = (questionId: number) => (el: HTMLAudioElement | null): void => {
    sampleAudioRefs.current[questionId] = el;
  };

  const setUserAudioRef = (questionId: number) => (el: HTMLAudioElement | null): void => {
    userAudioRefs.current[questionId] = el;
  };

  const getSpeakerColorFilter = (score?: number) => {
    if (score === undefined) return "grayscale(100%)";
  
    if (score >= 0.8) {
      return "invert(48%) sepia(95%) saturate(427%) hue-rotate(101deg) brightness(90%) contrast(108%)"; // green
    } else if (score >= 0.5) {
      return "invert(92%) sepia(37%) saturate(1313%) hue-rotate(8deg) brightness(102%) contrast(96%)"; // yellow
    } else {
      return "invert(41%) sepia(99%) saturate(5792%) hue-rotate(348deg) brightness(98%) contrast(116%)"; // red
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 pb-24">
      <ChatbotPopup pageContent={pageContent} />
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Back
        </Button>
        <h1 className="text-3xl font-bold text-center flex-1">Quiz Explanations</h1>
      </div>
      {(strengths || weaknesses) && (
        <div className="mt-4 space-y-2 mb-10">
          {strengths && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md font-medium whitespace-pre-wrap">
              <div className="mb-1">🟢 <strong>Điểm tốt:</strong></div>
              <ReactMarkdown>{strengths}</ReactMarkdown>
            </div>
          )}
          {weaknesses && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-md font-medium whitespace-pre-wrap">
              <div className="mb-1">🔴 <strong>Điểm chưa tốt:</strong></div>
              <ReactMarkdown>{weaknesses}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {questions.map((q, index) => {
        const isExpanded = expanded[q.id];
        const hasExplanation = !!(explanations[q.id] || q.explanation);

        return (
          <div key={q.id} className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="border-b pb-4 mb-4">
              <div className="inline-block bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm font-medium mb-2">
                Question {index + 1}
              </div>
              <div className="font-semibold mb-2 flex items-center gap-4">
                {q.questionText}
                <div className="flex items-center gap-2">
                  {q.audioUrl && (
                    <>
                      <audio ref={setSampleAudioRef(q.id)} src={q.audioUrl} controls={false} />
                      <button
                        onClick={() => handlePlayAudio(q.id, 'sample')}
                        className="p-2 rounded-full hover:bg-blue-100 transition-colors"
                        title="Sample pronunciation"
                      >
                        <Image
                          src="/speaker.svg"
                          alt="Play sample audio"
                          width={24}
                          height={24}
                          className="cursor-pointer"
                          style={{ filter: "invert(48%) sepia(80%) saturate(2476%) hue-rotate(200deg) brightness(118%) contrast(119%)" }}
                        />
                      </button>
                    </>
                  )}
                  {q.type === "PRONUNCIATION" && q.userAnswer && (
                    <>
                      <audio ref={setUserAudioRef(q.id)} src={q.userAnswer} controls={false} />
                      <button
                        onClick={() => handlePlayAudio(q.id, 'user')}
                        className="p-2 rounded-full hover:bg-green-100 transition-colors"
                        title="Your pronunciation"
                      >
                        <Image
                          src="/speaker.svg"
                          alt="Play user audio"
                          width={24}
                          height={24}
                          className="cursor-pointer"
                          style={{ filter: getSpeakerColorFilter(phonemeAnalyses[q.id]?.score) }}
                        />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {q.type === "IMAGE" && q.imageUrl && (
                <div className="h-64 overflow-hidden rounded mb-2">
                  <Image
                    src={q.imageUrl}
                    alt="Question image"
                    width={400}
                    height={250}
                    className="object-contain w-full h-full"
                  />
                </div>
              )}
            </div>

            {q.type !== "PRONUNCIATION" ? (
              <ul className="space-y-2">
                {q.options.map((opt: any, idx: number) => {
                  const isUserAnswer = opt.text === q.userAnswer;
                  const isCorrectAnswer = opt.text === q.correctAnswer;
                  const isWrongSelected = isUserAnswer && !isCorrectAnswer;
                  const classes = [
                    "p-4 rounded-lg",
                    isCorrectAnswer ? "bg-green-50 text-green-600" :
                    isWrongSelected ? "bg-red-50 text-red-600" :
                    "bg-gray-50",
                  ].join(" ");

                  const icon = isCorrectAnswer ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : isWrongSelected ? (
                    <XCircle className="w-4 h-4 mr-2" />
                  ) : null;

                  return (
                    <li key={idx} className={classes + " flex items-center"}>
                      {icon}
                      <span className="font-medium"><ReactMarkdown>{opt.text}</ReactMarkdown></span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="space-y-2">
                {/* PHONEME SECTION (PRONUNCIATION) */}
                {(() => {
                  const phonemes = JSON.parse(q.correctAnswer);
                  const analysisResult = phonemeAnalyses[q.id];
                  if (!analysisResult) return null;   // hoặc loader

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-y-2 text-sm mt-2">
                        <div className="font-semibold text-gray-600">Correct phonemes (US):</div>
                        <div className="font-mono text-gray-800 break-words">
                          {phonemes["en-us"] || "-"}
                        </div>

                        <div className="font-semibold text-gray-600">Correct phonemes (UK):</div>
                        <div className="font-mono text-gray-800 break-words">
                          {phonemes["en-gb"] || "-"}
                        </div>

                        <div className="font-semibold text-gray-600 self-start">Your phonemes:</div>
                        <div className="font-mono break-words flex flex-wrap items-center">
                          <div className="font-mono text-gray-800 break-words">
                            {q.userPhonemes || "-"}
                          </div>
                        </div>

                        <div className="font-semibold text-gray-600 self-start">
                          Pronunciation match (color-coded):
                        </div>
                        <div className="font-mono break-words flex flex-wrap items-center">
                          <span className="text-gray-700">/</span>
                          {analysisResult.highlight.flatMap(([chunk, status], idx) => {
                            const colorClass =
                              status === "ok"
                                ? "text-green-600"
                                : status === "wrong"
                                ? "text-red-500"
                                : "text-orange-500";

                            const chars = chunk !== "" ? chunk.split("") : ["·"];
                            return chars.map((ch, j) => (
                              <span key={`hp-${idx}-${j}`} className={colorClass}>
                                {ch}
                              </span>
                            ));
                          })}
                          <span className="text-gray-700">/</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 space-x-3 col-span-2">
                            <span><span className="text-green-600">●</span> = correct</span>
                            <span><span className="text-red-500">●</span> = wrong</span>
                            <span><span className="text-orange-500">●</span> = missing sound</span>
                            <span><span className="text-gray-400">·</span> = placeholder</span>
                        </div>
                        {analysisResult.corrections.length > 0 && (
                            <div className="font-semibold text-gray-600 self-start"> Advanced analysis:
                                <ul className="list-disc list-inside">
                                    {analysisResult.corrections.map((c, idx) => {
                                        const [userPh, correctPh] = c.split(" → ");
                                        return (
                                        <li key={idx}>
                                            <code>{correctPh}</code> sounds like <code>{userPh}</code>
                                        </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                      </div>

                      {/* điểm tổng */}
                      <div className="flex justify-center mt-2">
                        <span
                          className={`font-bold px-3 py-1 rounded text-sm ${
                            analysisResult.score >= 0.8
                              ? "bg-green-100 text-green-700"
                              : analysisResult.score >= 0.5
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          Điểm: {(analysisResult.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mt-6">
              <Button
                onClick={() => toggleExplanation(q.id)}
                className="w-full justify-center"
              >
                Explanation {isExpanded ? "▲" : "▼"}
              </Button>

              {isExpanded && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md">
                  <div className="prose prose-sm max-w-none">
                    {hasExplanation ? (
                      <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        table: ({node, ...props}) => (
                          <table className="min-w-full border border-gray-300 my-4" {...props} />
                        ),
                        thead: ({node, ...props}) => (
                          <thead className="bg-gray-100" {...props} />
                        ),
                        tbody: ({node, ...props}) => (
                          <tbody className="divide-y divide-gray-200" {...props} />
                        ),
                        tr: ({node, ...props}) => (
                          <tr className="border-b border-gray-300" {...props} />
                        ),
                        th: ({node, ...props}) => (
                          <th className="px-4 py-2 border border-gray-300 text-left font-medium" {...props} />
                        ),
                        td: ({node, ...props}) => (
                          <td className="px-4 py-2 border border-gray-300" {...props} />
                        ),
                      }}
                    >
                      {explanations[q.id] || q.explanation}
                    </ReactMarkdown>
                    ) : (
                      <p>Chưa có giải thích cho câu hỏi này.</p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      onClick={() => handleGenerateExplanation(q.id)}
                      disabled={generatingExplanations[q.id]}
                      variant={hasExplanation ? "secondaryOutline" : "default"}
                      className="flex items-center gap-2"
                    >
                      {generatingExplanations[q.id] ? (
                        <>
                          <div className="w-4 h-4 border-2 border-t-green-500 border-b-green-500 rounded-full animate-spin"></div>
                          Generating...
                        </>
                      ) : hasExplanation ? (
                        <>
                          <RefreshCw size={16} /> Regenerate Explanation
                        </>
                      ) : (
                        <>
                          <Image src="/gemini-icon.png" alt="AI" width={20} height={20} />
                          AI Generate Explanation
                        </>
                      )}
                    </Button>

                    {savedExplanations[q.id] && (
                      <span className="text-green-600 text-sm flex items-center gap-1">
                        <CheckCircle size={14} /> Saved
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <Footer 
        onReturnToLearn={handleReturnToLearn}
        onPracticeAgain={handlePracticeAgain}
        userId={userId || undefined}
        quizId={quizId ? Number(quizId) : undefined}
      />
    </div>
  );
}
