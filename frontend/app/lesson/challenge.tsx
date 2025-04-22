"use client";

import { questionTypeEnum } from "@/db/schema";
import { FillInBlankChallenge } from "./components/challenge/FillInBlankChallenge";
import { TranslationChallenge } from "./components/challenge/TranslationChallenge";
import { ImageChallenge } from "./components/challenge/ImageChallenge";
import { VoiceChallenge } from "./components/challenge/VoiceChallenge";
// import { PronunciationChallenge } from "./components/challenge/PronunciationChallenge";
import { ChallengeProps } from "./components/challenge/types";


export const Challenge = (props: ChallengeProps) => {
  const { type } = props;

  switch (type) {
    case "FILL_IN_BLANK":
      return <FillInBlankChallenge {...props} />;
    case "TRANSLATION":
      return <TranslationChallenge {...props} />;
    case "IMAGE":
      return <ImageChallenge {...props} />;
    case "VOICE":
      return <VoiceChallenge {...props} />;
    // case "PRONUNCIATION":
    //   return <PronunciationChallenge {...props} />;
    default:
      return <div>Unknown challenge type</div>;
  }
};