"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { updateQuizTitle, updateVisibility, deleteQuiz } from "./api";
import { Pencil, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

    const handleDeleteQuiz = async () => {
        const confirmDelete = confirm("Are you sure you want to delete this quiz?");
        if (!confirmDelete) return;

        setLoading(true);
        try {
            await deleteQuiz(quizId);
            toast.success("Quiz deleted");
            router.push("/learn");
        } catch (error) {
            console.error("Failed to delete quiz:", error);
            toast.error("Failed to delete quiz");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 shadow-sm bg-white flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Thumbnail */}
            <div className="w-full md:w-20 h-40 md:h-20 relative bg-green-100 rounded-md overflow-hidden flex-shrink-0">
                <Image
                    src={imageUrl}
                    alt="Thumbnail"
                    fill
                    className="object-contain"
                />
            </div>
            {/* Quiz Info */}
            <div className="flex-1 space-y-1 w-full">
                <h2 className="text-sm text-gray-500 font-semibold">{curriculumTitle}</h2>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-full text-lg font-bold text-gray-800 border-b border-gray-300 focus:outline-none focus:border-blue-500"
                        />
                    ) : (
                        <div className="flex items-center gap-2 w-full">
                            <h1 className="text-lg font-bold text-gray-800 flex-1 break-words">{currentTitle}</h1>
                            <Pencil
                                size={16}
                                className="text-gray-500 cursor-pointer hover:text-black"
                                onClick={handleStartEdit}
                            />
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-400">
                    Created at: {new Date(createdAt).toLocaleDateString()}
                </p>

                {/* Bottom Buttons */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 gap-2">
                    {/* Left buttons */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button
                            onClick={toggleVisibility}
                            variant="secondaryOutline"
                            size="sm"
                            disabled={loading}
                            className="flex-1 md:flex-none"
                        >
                            {isPublic ? "Make Private" : "Make Public"}
                        </Button>

                        {/* More Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical size={16} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                    onClick={handleDeleteQuiz}
                                    className="text-red-600 focus:bg-red-100"
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    Delete Quiz
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Right button */}
                    <Button
                        onClick={handleStartQuiz}
                        size="sm"
                        variant="secondary"
                        className="w-full md:w-auto"
                    >
                        Start Quiz
                    </Button>
                </div>
            </div>
        </div>
    );
}