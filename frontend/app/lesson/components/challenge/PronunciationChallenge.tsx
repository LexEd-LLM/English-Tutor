"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PronunciationChallengeProps  } from "./types";
import { AudioPlayer } from "../AudioPlayer";

export const PronunciationChallenge = ({
  question,
  audioUrl,
  status,
  onSelect,
}: PronunciationChallengeProps ) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
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
        setAudioBlob(blob);
        submitRecording(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingError(null);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setRecordingError("Không thể truy cập microphone. Vui lòng kiểm tra quyền.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitRecording = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      // Gửi blob lên server và nhận lại URL (mock)
      const userAudioUrl = URL.createObjectURL(blob); // Thay bằng URL từ server thực tế
      onSelect(userAudioUrl); // callback với URL để lưu vào userAnswers
    } catch (error) {
      console.error("Error uploading audio:", error);
      setRecordingError("Gửi âm thanh thất bại. Vui lòng thử lại.");
    }
  };

  const handleRerecord = () => {
    setAudioBlob(null);
    setRecordingError(null);
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="text-xl font-bold text-neutral-700">{question}</div>
        {audioUrl && (
          <AudioPlayer audioUrl={audioUrl} />
        )}
      </div>

      {recordingError && (
        <div className="text-red-500 text-sm">{recordingError}</div>
      )}

      <div className="flex flex-col items-center gap-4">
        {!audioBlob ? (
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-8 py-4 rounded-full ${
              isRecording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={status !== "none"}
          >
            {isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
          </Button>
        ) : (
          <div className="space-y-4">
            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
            <Button onClick={handleRerecord} variant="primaryOutline">
              Ghi lại
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
