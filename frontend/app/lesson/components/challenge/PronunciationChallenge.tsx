"use client";

import { useEffect, useRef, useState } from "react";
import { PronunciationChallengeProps } from "./types"; 
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import Image from "next/image"; // For using icons

// Define the type for recording state
type RecordingState = "idle" | "recording" | "processing" | "done" | "error";
// Type for the analysis result received from the backend
type AnalysisResult = {
    url: string;
    userPhonemes: string | null;
    score: number;
    explanation: string | null;
    correctPhonemes: Record<string, string>; // e.g., { "en-us": "...", "en-gb": "..." }
    highlight: Array<[string, "ok"|"wrong"|"missing"]>;
    corrections: string[];
};
// Define the maximum recording time in seconds
const MAX_RECORDING_TIME = 120; // 02:00

export const PronunciationChallenge = ({
    id,
    question,
    audioUrl, // Original audio for the question
    status,   // External status affecting interaction (e.g., 'correct', 'wrong')
    onSelect, // Callback with the uploaded user audio URL
    userId
}: PronunciationChallengeProps) => {
    const [recordingState, setRecordingState] = useState<RecordingState>("idle");
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null); // For local playback
    const [recordingError, setRecordingError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(MAX_RECORDING_TIME);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null); // Store analysis results

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const userAudioRef = useRef<HTMLAudioElement>(null);
    const originalAudioRef = useRef<HTMLAudioElement>(null);

    // --- Blob URL Management ---
    useEffect(() => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            setBlobUrl(url);
            return () => { URL.revokeObjectURL(url); setBlobUrl(null); };
        } else {
            setBlobUrl(null);
        }
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
                console.log("onstop event fired"); // <-- Check if this logs
                try {
                    // Check if chunks exist
                    if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
                        console.error("No audio chunks recorded!");
                        setRecordingError("Recording failed (no data).");
                        setRecordingState("error");
                        // Stop stream tracks here too
                        try {
                            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                        } catch(e) { console.warn("Error stopping stream tracks on empty chunks:", e); }
                        return; // Stop execution here
                    }
            
                    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); // Or appropriate mime type
                    console.log("Blob created, size:", blob.size); // <-- Check size
            
                    if (blob.size === 0) {
                        console.error("Blob created but size is 0!");
                        setRecordingError("Recording failed (0 byte size).");
                        setRecordingState("error");
                         try {
                            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                        } catch(e) { console.warn("Error stopping stream tracks on zero size blob:", e); }
                        return; // Stop execution
                    }
            
                    setAudioBlob(blob); // For local playback URL generation
                    setRecordingState("processing"); // <-- This is happening
                    console.log("Calling submitRecording..."); // <-- Check if this logs
                    submitRecording(blob); // Call the async function
            
                    // Stop the stream tracks *after* processing starts
                    try {
                        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                    } catch(e) { console.warn("Error stopping stream tracks after submit:", e); }
            
            
                } catch (error) {
                    console.error("Error inside onstop handler:", error); // <-- Catch potential errors
                    setRecordingError("Error processing recording.");
                    setRecordingState("error");
                     try {
                        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                    } catch(e) { console.warn("Error stopping stream tracks in catch block:", e); }
                }
            };
            
            // Add onerror handler too, just in case
            mediaRecorderRef.current.onerror = (event) => {
                console.error("MediaRecorder error event:", event);
                // Add specific error check if possible, e.g., event.error.name
                setRecordingError(`Cannot access microphone. Please check permissions and try again.`);
                setRecordingState("error");
                stopTimer();
                try {
                     mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                } catch(e) { console.warn("Error stopping stream tracks in onerror:", e); }
            };

            mediaRecorderRef.current.start();
            setRecordingState("recording");
            startTimer();
        } catch (error) {
            console.error("Error accessing microphone:", error);
            setRecordingError("Cannot access microphone. Please check permissions and try again.");
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
        const fixedBlob = new Blob([blob], { type: "audio/webm" });
        formData.append("file", fixedBlob, `recording-${Date.now()}.webm`);
        formData.append("id", id.toString()); // Send id
        formData.append("user_id", userId.toString());

        setRecordingState("processing"); // Show processing state immediately
        setRecordingError(null);
        setAnalysisResult(null); // Clear previous results

        try {
            const response = await fetch("/api/upload-audio", {
                method: "POST",
                body: formData,
            });

            const data = await response.json(); // Read response body once

            if (!response.ok) {
                console.error("Upload/Analysis failed:", response.status, data);
                 // Use error message from backend if available
                const errorDetail = data?.detail || `Upload failed with status ${response.status}`;
                throw new Error(errorDetail);
            }

            // Assuming response matches PronunciationAnalysisResult Pydantic model
            if (!data.url || data.score === undefined || !data.correctPhonemes) {
                console.error("Invalid analysis response:", data);
                throw new Error("Server response did not include expected analysis data.");
            }

            // Store the full analysis result
            setAnalysisResult({
                url: data.url,
                userPhonemes: data.userPhonemes,
                score: data.score,
                explanation: data.explanation,
                correctPhonemes: data.correctPhonemes,
                highlight: data.highlight,
                corrections: data.corrections
            });
            setRecordingState("done");

            // Pass necessary info for final submission
            onSelect({
                userAudioUrl: data.url,
                userPhonemes: data.userPhonemes // Pass phonemes back
            });

        } catch (error: any) {
            console.error("Error uploading/analyzing audio:", error);
            setRecordingError(error.message || "Failed to send and analyze audio.");
            setRecordingState("error");
            setAudioBlob(null); // Clear blob on error
        }
    };

    const handleRerecord = () => {
        setAudioBlob(null); // Clear blob, triggers URL revoke via useEffect
        setRecordingError(null);
        setTimeLeft(MAX_RECORDING_TIME);
        stopTimer();
        setAnalysisResult(null); // Clear analysis results
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
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 font-bold uppercase tracking-wider text-sm md:text-base"> 
                    Beta
                </span>
                <div className="text-xl font-bold text-neutral-700">
                    <ReactMarkdown>{question}</ReactMarkdown> 
                </div>
                {audioUrl && (
                    <>
                        {/* Hidden player for actual playback */}
                        <audio ref={originalAudioRef} src={audioUrl} preload="metadata" className="hidden" />
                        {/* Visible button to trigger playback */}
                        <button
                            onClick={playOriginalAudio}
                            className="p-2 rounded-full hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                            aria-label="Sample pronunciation"
                            title="Sample pronunciation" // Tooltip
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
            {/* Beta badge and disclaimer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs mt-1">
                <span className="text-gray-600">* This phoneme recognition system may contain errors and may not reflect your pronunciation precisely. Please use the phonemes and feedback for reference only.</span>
            </div>
            {/* Recording Controls and Status */}
            <div className="flex flex-col items-center justify-center gap-4 mt-4 p-6 border rounded-lg shadow-sm min-h-[150px]">
                {recordingState === "idle" && (
                    <button
                        onClick={startRecording}
                        disabled={isDisabled}
                        className={`flex flex-col items-center justify-center text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200 p-4 rounded-lg ${isDisabled ? '' : 'hover:bg-blue-50'}`}
                        aria-label="Start recording"
                    >
                        <Image src="/icons/microphone.svg" alt="" width={40} height={40} style={{ filter: "invert(48%) sepia(80%) saturate(2476%) hue-rotate(200deg) brightness(118%) contrast(119%)" }}/>
                        <span className="mt-2 text-sm font-medium">Click to start recording</span>
                        <span className="mt-1 text-xs text-gray-500">(Limit: 02:00)</span>
                    </button>
                )}

                {recordingState === "recording" && (
                    <button
                        onClick={handleStopClick}
                        className="flex flex-col items-center justify-center text-red-500 hover:text-red-700 p-4 rounded-lg hover:bg-red-50 transition-colors duration-200"
                        aria-label="Stop recording"
                    >
                        <Image src="/icons/stop.svg" alt="" width={40} height={40} style={{ filter: 'invert(13%) sepia(96%) saturate(7465%) hue-rotate(1deg) brightness(90%) contrast(120%)' }}/>
                        <span className="mt-2 text-sm font-medium">Stop recording</span>
                        <span className="mt-1 text-lg font-semibold text-gray-700 tabular-nums">
                            Time left: {formatTime(timeLeft)}
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
                            Processing your recording.{"\n"}Please wait...
                        </p>
                    </div>
                )}

                {/* Display Analysis Results */}
                {recordingState === "done" && analysisResult && (
                    <div className="w-full flex flex-col items-center space-y-4">
                        {/* User Audio Player */}
                         <div className="py-3 rounded-xl px-3 bg-white w-full my-2 shadow-sm">
                            {/* Use analysisResult.url for the player source */}
                            <audio ref={userAudioRef} controls src={analysisResult.url} className="w-full h-10">
                                Your browser does not support the audio element.
                            </audio>
                        </div>

                        {/* Phoneme Comparison Display */}
                        <div className="w-full p-3 border rounded-md bg-gray-50 text-xs md:text-sm">
                           <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
                               <div className="font-semibold text-gray-600">Correct phonemes (US):</div>
                               <div className="font-mono text-gray-800 break-words">
                                   {analysisResult.correctPhonemes["en-us"] || "-"}
                               </div>

                               <div className="font-semibold text-gray-600">Correct phonemes (UK):</div>
                               <div className="font-mono text-gray-800 break-words">
                                   {analysisResult.correctPhonemes["en-gb"] || "-"}
                               </div>

                               <div className="font-semibold text-gray-600 self-start">Your phonemes:</div>
                               <div className="font-mono break-words flex flex-wrap items-center">
                                    <div className="font-mono text-gray-800 break-words">
                                        {analysisResult.userPhonemes || "-"}
                                    </div>
                               </div>
                                <div className="font-semibold text-gray-600 self-start">Pronunciation match (color-coded):</div>
                                <div className="font-mono break-words flex flex-wrap items-center">
                                    {/* leading slash */}
                                    <span className="text-gray-700">/</span>
                                    {/* each chunk → map xuống từng ký tự */}
                                    {analysisResult.highlight.flatMap(([chunk, status], idx) => {
                                        const colorClass =
                                        status === "ok"      ? "text-green-600" :
                                        status === "wrong"   ? "text-red-500"   :
                                        status === "missing" ? "text-orange-500": "text-gray-400";
                                        
                                        // nếu chunk = "" (insert/missing) thì show placeholder "·"
                                        const chars = chunk !== "" ? chunk.split("") : ["·"];

                                        return chars.map((ch, j) => (
                                            <span key={`hp-${idx}-${j}`} className={`${colorClass}`}>
                                                {ch}
                                            </span>
                                        ));
                                    })}
                                    {/* trailing slash */}
                                    <span className="text-gray-700">/</span>
                                </div>
                                <div className="mt-2 text-xs text-gray-600 space-x-3 col-span-2">
                                    <span><span className="text-green-600">●</span> = correct</span>
                                    <span><span className="text-red-500">●</span> = wrong</span>
                                    <span><span className="text-orange-500">●</span> = missing sound</span>
                                    <span><span className="text-gray-400">·</span> = placeholder</span>
                                </div>
                                {analysisResult.corrections.length > 0 && (
                                    <div className="font-semibold text-gray-600 self-start"> Advanced analysis:
                                        <ul className="list-disc list-inside">
                                            {analysisResult.corrections.map((c, idx) => {
                                                const [userPh, correctPh] = c.split(" → ");
                                                return (
                                                <li key={idx}>
                                                    <code>{correctPh}</code> sounds like <code>{userPh}</code>
                                                </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                           </div>
                           {/* Display Score */}
                           <div className="mt-3 text-center">
                               <span className={`font-bold px-2 py-1 rounded ${analysisResult.score >= 0.8 ? 'bg-green-100 text-green-700' : analysisResult.score >= 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                    Score: {(analysisResult.score * 100).toFixed(0)}%
                                </span>
                            </div>
                           {/* Display Explanation */}
                           {analysisResult.explanation && (
                                <div className="mt-4 prose prose-sm sm:prose lg:prose-lg max-w-none text-gray-800 text-left">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                        {analysisResult.explanation}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleRerecord}
                            disabled={status !== 'none'}
                            className="text-sm bg-white text-blue-500 font-medium px-5 py-2 rounded-xl hover:bg-gray-200 transition-colors duration-200 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            aria-label="Record again"
                        >
                            <Image 
                                src="/icons/rotate-left.svg" 
                                alt="" 
                                width={16} 
                                height={16} 
                                style={{ filter: "invert(48%) sepia(80%) saturate(2476%) hue-rotate(200deg) brightness(118%) contrast(119%)" }}
                            />
                            Record again
                        </button>
                    </div>
                )}

                {recordingState === "error" && (
                    <div className="w-full flex flex-col items-center text-center">
                        <p className="text-red-500 text-sm mb-4">
                            {recordingError || "Recording error. Please try again."}
                        </p>
                        <button
                            onClick={handleRerecord}
                            className="text-sm bg-blue-100 text-blue-500 font-medium px-5 py-2 rounded-xl hover:bg-blue-200 transition-colors duration-200 flex items-center gap-2"
                            aria-label="Try recording again"
                        >
                            <Image src="/icons/rotate-left.svg" alt="" width={16} height={16} />
                            Try recording again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};