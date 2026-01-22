/**
 * Custom hook for managing AI completion notifications
 * Handles refs and effects for triggering onComplete callback
 * @module hooks/useAiCompletion
 */

import { useEffect, useRef } from "react";
import { AiStatus } from "./useAiStreaming";

/**
 * AI text sections interface
 */
export interface AiTextSections {
  overview: string;
  changing: string;
  advice: string;
}

/**
 * Hook parameters
 */
export interface UseAiCompletionParams {
  aiStatus: AiStatus;
  overviewText: string;
  changingText: string;
  adviceText: string;
  onAiComplete?: (aiText: AiTextSections) => void;
}

/**
 * Custom hook for AI completion notification
 * Manages refs to capture latest streaming text and notifies parent when complete
 *
 * @param params - AI status, text sections, and completion callback
 */
export const useAiCompletion = ({
  aiStatus,
  overviewText,
  changingText,
  adviceText,
  onAiComplete,
}: UseAiCompletionParams): void => {
  // Refs to store latest callback and text values
  const onAiCompleteRef = useRef(onAiComplete);
  const hasNotifiedRef = useRef(false);
  const overviewTextRef = useRef(overviewText);
  const changingTextRef = useRef(changingText);
  const adviceTextRef = useRef(adviceText);

  // Keep callback ref updated
  useEffect(() => {
    onAiCompleteRef.current = onAiComplete;
  }, [onAiComplete]);

  // Keep text refs updated with latest values
  useEffect(() => {
    overviewTextRef.current = overviewText;
  }, [overviewText]);

  useEffect(() => {
    changingTextRef.current = changingText;
  }, [changingText]);

  useEffect(() => {
    adviceTextRef.current = adviceText;
  }, [adviceText]);

  // Notify parent when AI is complete
  useEffect(() => {
    if (aiStatus === "done" && !hasNotifiedRef.current && onAiCompleteRef.current) {
      hasNotifiedRef.current = true;
      // Delay to ensure all streaming text is fully captured in refs
      setTimeout(() => {
        onAiCompleteRef.current?.({
          overview: overviewTextRef.current,
          changing: changingTextRef.current,
          advice: adviceTextRef.current,
        });
      }, 300);
    }
  }, [aiStatus]);
};
