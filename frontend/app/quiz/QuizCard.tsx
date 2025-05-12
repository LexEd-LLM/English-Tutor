"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { updateQuizTitle, updateVisibility } from "./api";
import { Pencil } from "lucide-react";

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

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(quizTitle);
    const [currentTitle, setCurrentTitle] = useState(quizTitle);
    
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
    
    const handleStartEdit = () => {
        setIsEditing(true);
    };

    const handleEdit = async () => {
        try {
            await updateQuizTitle(quizId, editedTitle);
            setCurrentTitle(editedTitle);
        } catch (error) {
            console.error("Failed to update quiz title:", error);
        } finally {
            setIsEditing(false);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            await handleEdit();
        } else if (e.key === "Escape") {
            setEditedTitle(currentTitle);
            setIsEditing(false);
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
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="text-lg font-bold text-gray-800 border-b border-gray-300 focus:outline-none focus:border-blue-500"
                        />
                    ) : (
                        <>
                            <h1 className="text-lg font-bold text-gray-800">{currentTitle}</h1>
                            <Pencil
                                size={16}
                                className="text-gray-500 cursor-pointer hover:text-black"
                                onClick={handleStartEdit}
                            />
                        </>
                    )}
                </div>
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
