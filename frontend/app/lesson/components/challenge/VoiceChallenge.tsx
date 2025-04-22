"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ChallengeProps } from "./types";
import { cn } from "@/lib/utils";

export const VoiceChallenge = ({
  question,
  options,
  selectedOption,
  status,
  onSelect,
  audioUrl,
}: ChallengeProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play().catch(console.error);
    }
  }, [audioUrl]);

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="text-xl font-bold text-neutral-700">{question}</div>
        {audioUrl && (
          <button
            onClick={handlePlayAudio}
            className="p-2 rounded-full hover:bg-neutral-100 transition"
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

      <audio ref={audioRef} src={audioUrl ?? ""} controls={false} />

      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "relative flex items-center rounded-xl border-2 border-neutral-200 p-4 font-bold text-neutral-700 hover:bg-neutral-100",
              selectedOption === option.id && status === "none" && "border-blue-300 bg-blue-50 hover:bg-blue-50",
              status !== "none" && selectedOption !== option.id && "opacity-50"
            )}
          >
            <p className="text-sm">{option.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
