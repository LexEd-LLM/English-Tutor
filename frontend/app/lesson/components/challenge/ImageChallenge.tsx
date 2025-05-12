"use client";

import { useState } from "react";
import Image from "next/image";
import { MultipleChoiceChallengeProps  } from "./types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export const ImageChallenge = ({
  question,
  options,
  selectedOption,
  status,
  onSelect,
  imageUrl,
}: MultipleChoiceChallengeProps ) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const getFullImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`;
  };

  return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 font-bold uppercase tracking-wider text-sm md:text-base">
            Beta
          </span>
          <div className="text-xl font-bold text-neutral-700">
            <ReactMarkdown>{question}</ReactMarkdown>
          </div>
      </div>
      {imageUrl && !imageError && (
        <div className="relative h-64 w-full overflow-hidden rounded-lg">
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-800" />
            </div>
          )}
          <Image
            src={getFullImageUrl(imageUrl)}
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
      {/* Beta badge and disclaimer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs mt-1">
          <span className="text-gray-600"> * This image is AI-generated and may not perfectly match the vocabulary context. Thank you for your understanding-we’re working to improve it.
          </span>
      </div>
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
                    src={getFullImageUrl(option.imageSrc)}
                    alt={option.text}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="text-sm">
                <ReactMarkdown>
                {option.text}
                </ReactMarkdown>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
