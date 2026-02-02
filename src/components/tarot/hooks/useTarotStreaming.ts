/**
 * Tarot streaming API hook
 * Extracted from TarotChat.tsx lines 520-710
 */

import { useState, useCallback } from "react";
import type { Message } from "../types";
import type { PersistedContext } from "../types/storage";
import { apiFetch } from "@/lib/api";
import { logger } from "@/lib/logger";
import { useCreditModal } from "@/contexts/CreditModalContext";
import { parseSSEStream, isSSEStream } from "../utils/streamingParser";
import { buildContextWithNewCard } from "../utils/contextBuilder";

const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: unknown[]) => isDev && logger.debug('[useTarotStreaming]', ...args);
const devWarn = (...args: unknown[]) => isDev && logger.warn('[useTarotStreaming]', ...args);
const devError = (...args: unknown[]) => logger.error('[useTarotStreaming]', ...args);

interface UseTarotStreamingParams {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  buildContext: () => PersistedContext;
  language: 'ko' | 'en';
  categoryName: string;
  counselorId?: string;
  counselorStyle?: string;
  errorMessage: string;
  onLoadingStart: () => void;
  onLoadingStop: () => void;
}

/**
 * Hook for handling tarot chat streaming with card drawing
 *
 * @param params - Hook parameters
 * @returns Streaming state and send function
 */
export function useTarotStreaming(params: UseTarotStreamingParams) {
  const {
    messages,
    setMessages,
    buildContext,
    language,
    categoryName,
    counselorId,
    counselorStyle,
    errorMessage,
    onLoadingStart,
    onLoadingStop
  } = params;

  const { showDepleted } = useCreditModal();
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [usedFallback, setUsedFallback] = useState(false);

  /**
   * Send a message and handle streaming response
   */
  const handleSend = useCallback(async (messageText: string) => {
    if (!messageText || loading) {return;}
    setUsedFallback(false);

    const nextMessages: Message[] = [...messages, { role: "user", content: messageText }];
    setLoading(true);
    setMessages(nextMessages);
    setStreamingContent("");
    onLoadingStart();

    // Log counselor info for debugging
    devLog('Sending request with counselor:', counselorId, 'style:', counselorStyle);

    try {
      // Step 1: Draw a new card for this question (타로집 스타일)
      let newDrawnCard = null;
      try {
        const drawResponse = await apiFetch("/api/tarot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: categoryName,
            spreadId: "quick-reading", // 1장 뽑기
            cardCount: 1,
            userTopic: messageText
          })
        });

        if (!drawResponse.ok && drawResponse.status === 402) {
          devWarn("Insufficient credits when drawing card (402)");
          showDepleted();
          throw new Error("INSUFFICIENT_CREDITS");
        }

        if (drawResponse.ok) {
          const drawData = await drawResponse.json();
          if (drawData.drawnCards && drawData.drawnCards.length > 0) {
            newDrawnCard = drawData.drawnCards[0];
            devLog('Drew new card for question:', newDrawnCard.card.name);
          }
        }
      } catch (drawErr) {
        // 크레딧 부족 에러는 상위로 전파
        if (drawErr instanceof Error && drawErr.message === "INSUFFICIENT_CREDITS") {
          throw drawErr;
        }
        devWarn('Failed to draw new card, using existing context:', drawErr);
      }

      // Build context with new card added to cards array (backend processes cards array)
      const baseContext = buildContext();
      const contextWithNewCard = newDrawnCard
        ? buildContextWithNewCard(baseContext, newDrawnCard, language)
        : baseContext;

      // Step 2: Try streaming endpoint with the new card context
      const response = await apiFetch("/api/tarot/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: contextWithNewCard,
          language,
          counselor_id: counselorId,
          counselor_style: counselorStyle
        })
      });

      if (!response.ok) {
        // 402 Payment Required - 크레딧 부족
        if (response.status === 402) {
          devWarn("Insufficient credits (402)");
          showDepleted();
          throw new Error("INSUFFICIENT_CREDITS");
        }
        throw new Error(`Stream failed: ${response.status}`);
      }

      if (response.headers.get("x-fallback") === "1") {
        setUsedFallback(true);
      }

      if (isSSEStream(response)) {
        // Handle SSE streaming
        const reader = response.body!.getReader();

        // Stop loading messages once streaming starts
        onLoadingStop();

        const accumulatedContent = await parseSSEStream(reader, (content) => {
          setStreamingContent(content);
        });

        // If no done signal received, still add the message
        if (accumulatedContent && !messages.find(m => m.content === accumulatedContent)) {
          setMessages(prev => {
            // Check if last message is already this content
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last?.content === accumulatedContent) {
              return prev;
            }
            return [...prev, { role: "assistant", content: accumulatedContent }];
          });
          setStreamingContent("");
        }
      } else {
        // Fallback to JSON response
        onLoadingStop();
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply || errorMessage
        }]);
      }
    } catch (error) {
      devError("Streaming error, falling back:", error);
      onLoadingStop();

      // Fallback to non-streaming endpoint
      try {
        const fallbackResponse = await apiFetch("/api/tarot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            context: buildContext(),
            language,
            counselor_id: counselorId,
            counselor_style: counselorStyle
          })
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setUsedFallback(true);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: data.reply || errorMessage
          }]);
        } else {
          throw new Error("Fallback also failed");
        }
      } catch (fallbackError) {
        devError("Fallback error:", fallbackError);
        setUsedFallback(true);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: errorMessage
        }]);
      }
    } finally {
      setLoading(false);
      onLoadingStop();
      setStreamingContent("");
    }
  }, [
    loading,
    messages,
    setMessages,
    buildContext,
    language,
    categoryName,
    counselorId,
    counselorStyle,
    errorMessage,
    onLoadingStart,
    onLoadingStop
  ]);

  return {
    loading,
    streamingContent,
    usedFallback,
    handleSend
  };
}
