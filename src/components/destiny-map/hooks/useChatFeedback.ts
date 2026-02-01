"use client";

import React from "react";
import { logger } from "@/lib/logger";
import type { Message, FeedbackType } from "../chat-constants";

interface UseChatFeedbackOptions {
  sessionIdRef: React.MutableRefObject<string>;
  theme: string;
  lang: string;
  messages: Message[];
}

interface UseChatFeedbackReturn {
  feedback: Record<string, FeedbackType>;
  handleFeedback: (msgId: string, type: FeedbackType) => Promise<void>;
}

/**
 * Hook for managing message feedback (thumbs up/down)
 */
export function useChatFeedback(options: UseChatFeedbackOptions): UseChatFeedbackReturn {
  const { sessionIdRef, theme, lang, messages } = options;
  const [feedback, setFeedback] = React.useState<Record<string, FeedbackType>>({});

  const getLastUserMessage = React.useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return lastUser?.content || "";
  }, [messages]);

  const handleFeedback = React.useCallback(async (msgId: string, type: FeedbackType) => {
    const previousFeedback = feedback[msgId];

    // Toggle off if clicking same feedback
    if (previousFeedback === type) {
      setFeedback((prev) => ({ ...prev, [msgId]: null }));
      return;
    }

    setFeedback((prev) => ({ ...prev, [msgId]: type }));

    const message = messages.find((m) => m.id === msgId);
    const lastUserMsg = getLastUserMessage();
    const sessionId = sessionIdRef.current;

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "destiny-map",
          theme,
          sectionId: msgId,
          helpful: type === "up",
          locale: lang,
          userHash: sessionId,
          recordId: msgId,
          rating: type === "up" ? 5 : 1,
          userQuestion: lastUserMsg,
          consultationSummary: message?.content?.slice(0, 500),
        }),
      });

      if (response.ok) {
        logger.debug(`[Feedback] Sent: ${msgId} = ${type}`);
      } else {
        logger.warn("[Feedback] API error:", response.status);
      }
    } catch (err) {
      logger.warn("[Feedback] Failed to send:", err);
    }
  }, [feedback, messages, theme, lang, sessionIdRef, getLastUserMessage]);

  return {
    feedback,
    handleFeedback,
  };
}
