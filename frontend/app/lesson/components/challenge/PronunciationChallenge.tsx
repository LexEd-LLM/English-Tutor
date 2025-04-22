"use client";

import { useEffect, useRef, useState } from "react";
// Removed Button import as we're using standard buttons now for simplicity
import { PronunciationChallengeProps } from "./types"; // Assuming types file exists
import Image from "next/image"; // For using icons

// Define the type for recording state
type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

// Define the maximum recording time in seconds
const MAX_RECORDING_TIME = 120; // 02:00

export const PronunciationChallenge = ({
    question,
    audioUrl, // Original audio for the question
    status,   // External status affecting interaction (e.g., 'correct', 'wrong')
    onSelect, // Callback with the uploaded user audio URL
}: PronunciationChallengeProps) => {
    const [recordingState, setRecordingState] = useState<RecordingState>("idle");
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    // State specifically for the temporary blob URL for the player
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [recordingError, setRecordingError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(MAX_RECORDING_TIME);
    // No need to store userAudioUrl state here anymore if onSelect handles it
    // const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const userAudioRef = useRef<HTMLAudioElement>(null); // Ref for the user's recording player
    const originalAudioRef = useRef<HTMLAudioElement>(null); // Ref for the original audio playback

    // --- Blob URL Management ---
    useEffect(() => {
        // Effect to create and revoke the blob URL
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            setBlobUrl(url);
            console.log("Created blob URL:", url); // For debugging

            // Return cleanup function
            return () => {
                console.log("Revoking blob URL:", url); // For debugging
                URL.revokeObjectURL(url);
                setBlobUrl(null); // Ensure state is also cleared
            };
        } else {
            // If audioBlob becomes null, ensure blobUrl is also null
            setBlobUrl(null);
        }
        // Dependency: run this effect when audioBlob changes
    }, [audioBlob]);


    // --- Timer Logic ---
    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startTimer = () => {
        stopTimer();
        setTimeLeft(MAX_RECORDING_TIME);
        timerRef.current = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    stopTimer();
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                        stopRecordingInternal();
                    }
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
    };

    // --- Recording Logic ---
    const startRecording = async () => {
        if (status !== "none") return;

        setRecordingState("idle");
        setAudioBlob(null); // This will trigger the useEffect to clear blobUrl
        setRecordingError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                // Set the blob first, the useEffect will handle creating the URL
                setAudioBlob(blob);
                setRecordingState("processing");
                submitRecording(blob); // Submit after setting blob
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error("MediaRecorder error:", event);
                setRecordingError("Đã xảy ra lỗi trong quá trình ghi âm.");
                setRecordingState("error");
                stopTimer();
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setRecordingState("recording");
            startTimer();
        } catch (error) {
            console.error("Error accessing microphone:", error);
            setRecordingError("Không thể truy cập microphone. Vui lòng kiểm tra quyền và thử lại.");
            setRecordingState("error");
        }
    };

    const stopRecordingInternal = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop(); // onstop will handle state transitions
        }
        stopTimer();
    };

    const handleStopClick = () => {
        stopRecordingInternal();
    };

    const submitRecording = async (blob: Blob) => {
        const formData = new FormData();
        formData.append("file", blob, `recording-${Date.now()}.webm`);

        try {
            const response = await fetch("/api/upload-audio", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error("Upload failed:", response.status, errorData);
                throw new Error(`Upload failed with status ${response.status}`);
            }

            const data = await response.json();
            if (!data.url) {
                console.error("Upload response missing URL:", data);
                throw new Error("Server response did not include audio URL.");
            }

            const generatedUserAudioUrl = data.url;
            setRecordingState("done"); // Set state to done AFTER successful upload
            onSelect(generatedUserAudioUrl);

        } catch (error) {
            console.error("Error uploading audio:", error);
            setRecordingError("Gửi âm thanh thất bại. Vui lòng thử lại.");
            setRecordingState("error");
            setAudioBlob(null); // Clear blob on error, triggers URL revoke via useEffect
        }
    };

    const handleRerecord = () => {
        setAudioBlob(null); // Clear blob, triggers URL revoke via useEffect
        setRecordingError(null);
        setTimeLeft(MAX_RECORDING_TIME);
        stopTimer();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            try {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            } catch (e) { console.warn("Could not stop stream tracks on rerecord:", e) }
        }
        mediaRecorderRef.current = null;
        setRecordingState("idle");
    };

    // --- Original Audio Playback ---
    const playOriginalAudio = async () => {
        if (originalAudioRef.current) {
            try {
                originalAudioRef.current.currentTime = 0; // Rewind first
                await originalAudioRef.current.play();
            } catch (error) {
                console.error("Error playing original audio:", error);
                // Optional: show a small error message to the user
            }
        }
    };

    // Cleanup function for component unmount
    useEffect(() => {
        return () => {
            stopTimer();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
                try {
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                } catch (e) { console.warn("Could not stop stream tracks on unmount:", e) }
            }
            // Blob URL cleanup is handled by the other useEffect watching audioBlob
        };
    }, []);

    // Format time remaining (MM:SS)
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Determine if interaction should be disabled
    const isDisabled = status !== "none" || recordingState === "processing";

    return (
        <div className="space-y-4">
            {/* Question and Original Audio Player Button */}
            <div className="flex items-center gap-4">
                <div className="text-xl font-bold text-neutral-700">{question}</div>
                {audioUrl && (
                    <>
                        {/* Hidden player for actual playback */}
                        <audio ref={originalAudioRef} src={audioUrl} preload="metadata" className="hidden" />
                        {/* Visible button to trigger playback */}
                        <button
                            onClick={playOriginalAudio}
                            className="p-2 rounded-full hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                            aria-label="Play sample audio"
                            title="Phát âm mẫu" // Tooltip
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
                    </>
                )}
            </div>

            {/* Recording Controls and Status */}
            <div className="flex flex-col items-center justify-center gap-4 mt-4 p-6 border rounded-lg shadow-sm min-h-[150px]">
                {recordingState === "idle" && (
                    <button
                        onClick={startRecording}
                        disabled={isDisabled}
                        className={`flex flex-col items-center justify-center text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200 p-4 rounded-lg ${isDisabled ? '' : 'hover:bg-blue-50'}`}
                        aria-label="Bắt đầu ghi âm"
                    >
                        <Image src="/icons/microphone.svg" alt="" width={40} height={40} />
                        <span className="mt-2 text-sm font-medium">Nhấn để bắt đầu ghi âm</span>
                        <span className="mt-1 text-xs text-gray-500">(Giới hạn: 02:00)</span>
                    </button>
                )}

                {recordingState === "recording" && (
                    <button
                        onClick={handleStopClick}
                        className="flex flex-col items-center justify-center text-red-500 hover:text-red-700 p-4 rounded-lg hover:bg-red-50 transition-colors duration-200"
                        aria-label="Dừng ghi âm"
                    >
                        <Image src="/icons/stop.svg" alt="" width={40} height={40} />
                        <span className="mt-2 text-sm font-medium">Dừng ghi âm</span>
                        <span className="mt-1 text-lg font-semibold text-gray-700 tabular-nums">
                            Còn lại: {formatTime(timeLeft)}
                        </span>
                    </button>
                )}

                {recordingState === "processing" && (
                    <div className="text-center text-gray-700 text-sm flex flex-col items-center">
                        <div className="flex space-x-1.5 animate-pulse mb-3">
                            <span className="w-2.5 h-2.5 bg-blue-400 rounded-full"></span>
                            <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animation-delay-200"></span>
                            <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animation-delay-400"></span>
                        </div>
                        <p className="whitespace-pre-line leading-relaxed">
                            Hệ thống đang xử lý bài ghi âm của bạn.{"\n"}Hãy chờ chút nhé...
                        </p>
                    </div>
                )}

                {/* Use blobUrl state for conditional rendering and src */}
                {recordingState === "done" && blobUrl && (
                    <div className="w-full flex flex-col items-center">
                        <div className="py-3 rounded-xl px-3 bg-white w-full my-4 shadow-sm">
                            <audio ref={userAudioRef} controls src={blobUrl} className="w-full h-10">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                        <button
                            onClick={handleRerecord}
                            disabled={status !== 'none'}
                            className="text-sm bg-white text-blue-500 font-medium px-5 py-2 rounded-xl hover:bg-gray-200 transition-colors duration-200 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            aria-label="Ghi âm lại"
                        >
                            <Image 
                                src="/icons/rotate-left.svg" 
                                alt="" 
                                width={16} 
                                height={16} 
                                style={{ filter: "invert(48%) sepia(80%) saturate(2476%) hue-rotate(200deg) brightness(118%) contrast(119%)" }}
                            />
                            Ghi âm lại
                        </button>
                    </div>
                )}

                {recordingState === "error" && (
                    <div className="w-full flex flex-col items-center text-center">
                        <p className="text-red-500 text-sm mb-4">
                            {recordingError || "Ghi âm lỗi. Vui lòng thử lại."}
                        </p>
                        <button
                            onClick={handleRerecord}
                            className="text-sm bg-blue-100 text-blue-500 font-medium px-5 py-2 rounded-xl hover:bg-blue-200 transition-colors duration-200 flex items-center gap-2"
                            aria-label="Thử ghi âm lại"
                        >
                            <Image src="/icons/rotate-left.svg" alt="" width={16} height={16} />
                            Thử ghi âm lại
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};