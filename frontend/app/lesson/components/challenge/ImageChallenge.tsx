"use client";

import { useState } from "react";
import Image from "next/image";
import { ChallengeProps } from "./types";
import { cn } from "@/lib/utils";

export const ImageChallenge = ({
  question,
  options,
  selectedOption,
  status,
  onSelect,
  imageUrl,
}: ChallengeProps) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-xl font-bold text-neutral-700">{question}</div>

      {imageUrl && !imageError && (
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
            onLoad={() => setIsImageLoading(false)}
            onError={() => {
              setIsImageLoading(false);
              setImageError(true);
            }}
          />
        </div>
      )}

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
            <div className="flex items-center justify-start gap-4">
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
          </button>
        ))}
      </div>
    </div>
  );
};
