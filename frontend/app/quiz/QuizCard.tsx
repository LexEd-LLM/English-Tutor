"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { updateVisibility } from "./api";

interface QuizCardProps {
    quizId: number;
    imageUrl: string;
    curriculumTitle: string;
    quizTitle: string;
    createdAt: string;
    visibility: boolean;
}

export const QuizCard = ({
    quizId,
    imageUrl,
    curriculumTitle,
    quizTitle,
    createdAt,
    visibility,
}: QuizCardProps) => {
    const router = useRouter();
    const [isPublic, setIsPublic] = useState(visibility);
    const [loading, setLoading] = useState(false);

    const handleStartQuiz = () => {
        router.push(`/lesson?quizId=${quizId}`);
    };

    const toggleVisibility = async () => {
        setLoading(true);
        try {
            const updated = await updateVisibility(quizId, !isPublic);
            setIsPublic(updated.visibility);
        } catch (error) {
            console.error("Failed to update visibility:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 shadow-sm bg-white flex gap-4 items-center">
            <div className="w-20 h-20 flex-shrink-0 relative bg-green-100 rounded-md overflow-hidden">
                <Image
                    src={imageUrl}
                    alt="Thumbnail"
                    fill
                    className="object-contain"
                />
            </div>
            <div className="flex-1 space-y-1">
                <h2 className="text-sm text-gray-500 font-semibold">{curriculumTitle}</h2>
                <h1 className="text-lg font-bold text-gray-800">{quizTitle}</h1>
                <p className="text-xs text-gray-400">Created at: {new Date(createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    onClick={toggleVisibility}
                    variant="secondaryOutline"
                    size="sm"
                    disabled={loading}
                >
                    {isPublic ? "Make Private" : "Make Public"}
                </Button>
                <Button
                    onClick={handleStartQuiz}
                    size="sm"
                    variant="secondary"
                    className="min-w-[120px]"
                >
                    Start Quiz
                </Button>
            </div>
        </div>
    );
};
