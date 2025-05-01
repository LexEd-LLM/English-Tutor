"use client";

import { TextChallenge } from "./components/challenge/TextChallenge";
import { ImageChallenge } from "./components/challenge/ImageChallenge";
import { VoiceChallenge } from "./components/challenge/VoiceChallenge";
import { PronunciationChallenge } from "./components/challenge/PronunciationChallenge";
import {
  ChallengeProps,
  MultipleChoiceChallengeProps,
  PronunciationChallengeProps,
} from "./components/challenge/types";

export const Challenge = (props: ChallengeProps) => {
  const { type } = props;

  switch (type) {
    case "TEXT":
      return <TextChallenge {...props as MultipleChoiceChallengeProps} />;
    case "IMAGE":
      return <ImageChallenge {...props as MultipleChoiceChallengeProps} />;
    case "VOICE":
      return <VoiceChallenge {...props as MultipleChoiceChallengeProps} />;
    case "PRONUNCIATION":
      return <PronunciationChallenge {...props as PronunciationChallengeProps} />;
    default:
      return <div>Unknown challenge type</div>;
  }
};