"use client";

import { ChallengeProps } from "./types";

export const FillInBlankChallenge = ({
  question,
  options,
  selectedOption,
  status,
  onSelect,
}: ChallengeProps) => {
  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-neutral-700">{question}</div>
      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className="rounded-xl border-2 border-neutral-200 p-4 text-neutral-700 font-bold hover:bg-neutral-100"
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
};
