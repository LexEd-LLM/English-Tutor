"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { getQuizWithAnswers, generateExplanation, calculatePhonemeScore } from "./api";

const renderColoredPhonemes = (correct: string, user: string = "") => {
  const output = [];

  for (let i = 0; i < Math.max(correct.length, user.length); i++) {
    const cChar = correct[i] || "";
    const uChar = user[i] || "";

    const isMatch = cChar === uChar;

    output.push(
      <span
        key={i}
        className={isMatch ? "text-green-600" : "text-red-500"}
      >
        {uChar || "·"}
      </span>
    );
  }

  return output;
};

export default function ExplanationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const quizId = searchParams.get("quizId");
  const [questions, setQuestions] = useState<any[]>([]);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [generatingExplanations, setGeneratingExplanations] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const [phonemeScores, setPhonemeScores] = useState<Record<number, number>>({});

  useEffect(() => {
    if (quizId) {
      getQuizWithAnswers(Number(quizId)).then(async (quizData) => {
        setQuestions(quizData);
  
        const scores: Record<number, number> = {};
  
        for (const q of quizData) {
          if (q.type === "PRONUNCIATION") {
            try {
              const correctPhonemes = JSON.parse(q.correctAnswer)["en-us"];
              const result = await calculatePhonemeScore(q.userPhonemes!, correctPhonemes);
              scores[q.id] = result.score;
            } catch (e) {
              console.error("Error calculating phoneme score:", e);
            }
          }
        }
  
        setPhonemeScores(scores);
      });
    }
  }, [quizId]);  

  const toggleExplanation = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateExplanation = async (questionId: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    if (["VOICE", "IMAGE"].includes(question.type)) {
      alert("Dạng bài này không được hỗ trợ");
      return;
    }

    setGeneratingExplanations((prev) => ({ ...prev, [questionId]: true }));
    try {
      const explanation = await generateExplanation(question);
      setExplanations((prev) => ({
        ...prev,
        [questionId]: explanation,
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

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Back to Learn
        </Button>
        <h1 className="text-3xl font-bold text-center flex-1">Quiz Explanations</h1>
      </div>

      {questions.map((q, index) => {
        const isExpanded = expanded[q.id];
        const hasExplanation = !!(explanations[q.id] || q.explanation);

        return (
          <div key={q.id} className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="border-b pb-4 mb-4">
              <div className="inline-block bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm font-medium mb-2">
                Question {index + 1}
              </div>
              <div className="font-semibold mb-2">{q.questionText}</div>
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
              {q.type === "AUDIO" && q.audioUrl && (
                <div className="flex items-center gap-2 mb-2">
                  <audio controls src={q.audioUrl} className="h-10" />
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
                      <span className="font-medium">{opt.text}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="space-y-2">
                {(() => {
                  let phonemes;
                  try {
                    phonemes = JSON.parse(q.correctAnswer);
                  } catch (err) {
                    return <div className="text-red-500">Invalid phoneme data</div>;
                  }

                  return (
                    <div className="grid grid-cols-2 gap-y-2 text-sm mt-2">
                      <div className="font-semibold">Phiên âm đúng (US)</div>
                      <div className="font-mono text-gray-800">{phonemes["en-us"]}</div>

                      <div className="font-semibold">Phiên âm đúng (UK)</div>
                      <div className="font-mono text-gray-800">{phonemes["en-gb"]}</div>

                      <div className="font-semibold">Phiên âm của bạn</div>
                      <div className="font-mono">
                        {renderColoredPhonemes(phonemes["en-us"], q.userPhonemes)}
                        {phonemeScores[q.id] !== undefined && (
                        <span className={`font-bold px-2 py-1 rounded ${
                          phonemeScores[q.id] >= 0.8
                            ? 'bg-green-100 text-green-700'
                            : phonemeScores[q.id] >= 0.5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          Điểm: {(phonemeScores[q.id] * 100).toFixed(0)}%
                        </span>
                      )}
                      </div>
                    </div>
                  );
                })()}
                {q.userAudioUrl && (
                  <audio controls src={q.userAudioUrl} className="w-full h-10" />
                )}
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
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

                    {explanations[q.id] && (
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

      <div className="flex justify-center mt-10">
        <Button size="lg" onClick={() => router.back()}>
          Return to Learn
        </Button>
      </div>
    </div>
  );
}
