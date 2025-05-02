"use client";

import { MultipleChoiceChallengeProps  } from "./types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export const TextChallenge = ({
  question,
  options,
  selectedOption,
  status,
  onSelect,
}: MultipleChoiceChallengeProps ) => {
  // Xử lý lỗi phổ biến do LLM sinh ra
  const preprocessMarkdown = (text: string) =>
    text.replace(/\*\*\*/g, "___");

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-neutral-700">
        <ReactMarkdown>{preprocessMarkdown(question)}</ReactMarkdown>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
                "rounded-xl border-2 border-neutral-200 p-4 text-neutral-700 font-bold hover:bg-neutral-100 text-left",
                selectedOption === option.id && status === "none" && "border-blue-300 bg-blue-50 hover:bg-blue-50",
                status !== "none" && selectedOption !== option.id && "opacity-50"
            )}
          >
            <ReactMarkdown>
              {preprocessMarkdown(option.text)}
            </ReactMarkdown>
          </button>
        ))}
      </div>
    </div>
  );
};
