"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { questionTypeEnum } from "@/db/schema";

type ChallengeProps = {
  id: number;
  type: typeof questionTypeEnum.enumValues[number];
  question: string;
  options: {
    id: number;
    text: string;
    correct: boolean;
    imageSrc?: string | null;
    audioSrc?: string | null;
  }[];
  selectedOption?: number;
  status: "none" | "correct" | "wrong";
  onSelect: (id: number) => void;
  imageUrl?: string;
  audioUrl?: string;
};

export const Challenge = ({
  id,
  type,
  question,
  options,
  selectedOption,
  status,
  onSelect,
  imageUrl,
  audioUrl,
}: ChallengeProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Tự động phát âm thanh khi component mount (cho câu hỏi voice)
  useEffect(() => {
    if (type === "VOICE" && audioRef.current && audioUrl) {
      audioRef.current.play().catch(error => {
        console.error("Error playing audio:", error);
      });
    }
  }, [type, audioUrl]);

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset về đầu
      audioRef.current.play().catch(error => {
        console.error("Error playing audio:", error);
      });
    }
  };

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setImageError(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="text-xl font-bold text-neutral-700">
          {question}
        </div>
        {type === "VOICE" && audioUrl && (
          <button
            onClick={handlePlayAudio}
            className="flex items-center justify-center p-2 rounded-full hover:bg-neutral-100 transition"
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

      {/* Hidden audio element for voice questions */}
      {type === "VOICE" && audioUrl && (
        <audio ref={audioRef} src={audioUrl} controls={false} />
      )}

      {/* Image for image questions */}
      {type === "IMAGE" && imageUrl && !imageError && (
        <div className="relative h-64 w-full overflow-hidden rounded-lg">
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-800" />
            </div>
          )}
          <Image
            src={imageUrl}
            alt="Question image"
            fill
            className={cn(
              "object-contain transition-opacity duration-300",
              isImageLoading ? "opacity-0" : "opacity-100"
            )}
            priority
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            disabled={status !== "none"}
            onClick={() => onSelect(option.id)}
            className={cn(
              "relative flex items-center rounded-xl border-2 border-neutral-200 p-4 font-bold text-neutral-700 hover:bg-neutral-100",
              selectedOption === option.id && status === "none" && "border-blue-300 bg-blue-50 hover:bg-blue-50",
              selectedOption === option.id && status === "correct" && "border-green-300 bg-green-50",
              selectedOption === option.id && status === "wrong" && "border-red-300 bg-red-50",
              status !== "none" && selectedOption !== option.id && "opacity-50"
            )}
          >
            <div className="flex items-center justify-start gap-4">
              {/* Show image if option has imageSrc */}
              {option.imageSrc && (
                <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                  <Image
                    src={option.imageSrc}
                    alt={option.text}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <p className="text-sm">{option.text}</p>
            </div>

            {/* Status indicators */}
            {selectedOption === option.id && status === "correct" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute right-4"
              >
                <Image
                  src="/check.svg"
                  alt="Correct"
                  height={32}
                  width={32}
                />
              </motion.div>
            )}
            {selectedOption === option.id && status === "wrong" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute right-4"
              >
                <Image
                  src="/close.svg"
                  alt="Wrong"
                  height={32}
                  width={32}
                />
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
