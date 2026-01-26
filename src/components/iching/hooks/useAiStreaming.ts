/**
 * Custom hook for managing AI streaming interpretation
 * Handles fetch requests, abort controller, and event stream parsing
 * @module hooks/useAiStreaming
 */

import { useState, useRef, useCallback } from "react";
import { IChingResult } from "@/components/iching/types";
import { logger } from "@/lib/logger";
import type { PremiumHexagramData } from "@/lib/iChing/iChingPremiumData";

/**
 * AI streaming status type
 */
export type AiStatus = "idle" | "loading" | "streaming" | "done" | "error";

/**
 * AI streaming state interface
 */
export interface AiStreamingState {
  aiStatus: AiStatus;
  currentSection: string;
  overviewText: string;
  changingText: string;
  adviceText: string;
  aiError: string;
}

/**
 * Hook return type
 */
export interface UseAiStreamingReturn extends AiStreamingState {
  startAiInterpretation: () => Promise<void>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

/**
 * Hook parameters
 */
export interface UseAiStreamingParams {
  result: IChingResult | null;
  question?: string;
  locale: string;
  lang: "ko" | "en";
  premiumData: PremiumHexagramData | null;
}

/**
 * Custom hook for AI streaming interpretation
 * Manages AI status, streaming content, and API communication
 *
 * @param params - Hook parameters including result, question, locale, etc.
 * @returns AI streaming state and control function
 */
export const useAiStreaming = ({
  result,
  question = "",
  locale,
  lang,
  premiumData,
}: UseAiStreamingParams): UseAiStreamingReturn => {
  // AI Streaming state
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [currentSection, setCurrentSection] = useState<string>("");
  const [overviewText, setOverviewText] = useState<string>("");
  const [changingText, setChangingText] = useState<string>("");
  const [adviceText, setAdviceText] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Starts AI interpretation streaming
   * Fetches streaming response from API and updates state progressively
   */
  const startAiInterpretation = useCallback(async () => {
    if (!result?.primaryHexagram || aiStatus === "streaming" || aiStatus === "loading") {return;}

    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setAiStatus("loading");
    setAiError("");
    setOverviewText("");
    setChangingText("");
    setAdviceText("");
    setCurrentSection("");

    try {
      const response = await fetch("/api/iching/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Token": process.env.NEXT_PUBLIC_API_TOKEN || "",
        },
        body: JSON.stringify({
          hexagramNumber: result.primaryHexagram.number,
          hexagramName: result.primaryHexagram.name,
          hexagramSymbol: result.primaryHexagram.symbol,
          judgment: result.primaryHexagram.judgment || "",
          image: result.primaryHexagram.image || "",
          coreMeaning: premiumData?.core_meaning?.[lang] || "",
          changingLines: result.changingLines || [],
          resultingHexagram: result.resultingHexagram ? {
            number: result.resultingHexagram.number,
            name: result.resultingHexagram.name,
            symbol: result.resultingHexagram.symbol,
            judgment: result.resultingHexagram.judgment,
          } : undefined,
          question,
          locale,
          themes: premiumData?.themes ? {
            career: premiumData.themes.career?.[lang] || "",
            love: premiumData.themes.love?.[lang] || "",
            health: premiumData.themes.health?.[lang] || "",
            wealth: premiumData.themes.wealth?.[lang] || "",
            timing: premiumData.themes.timing?.[lang] || "",
          } : {},
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(locale === "ko"
            ? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
            : "Too many requests. Please try again later.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("text/event-stream")) {
        // Fallback to JSON response
        try {
          const data = await response.json();
          if (data.error) {throw new Error(data.error);}
          // If we got JSON with content, it might be a fallback response
          if (data.overview || data.changing || data.advice) {
            setOverviewText(data.overview || "");
            setChangingText(data.changing || "");
            setAdviceText(data.advice || "");
          }
          setAiStatus("done");
          return;
        } catch (parseErr) {
          logger.error("[useAiStreaming] Failed to parse non-SSE response:", parseErr);
          throw new Error(locale === "ko"
            ? "AI 서버 응답을 처리할 수 없습니다."
            : "Unable to process AI server response.");
        }
      }

      setAiStatus("streaming");
      const reader = response.body?.getReader();
      if (!reader) {throw new Error("No reader available");}

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {break;}

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                setAiError(data.error);
                setAiStatus("error");
                return;
              }

              if (data.done) {
                setAiStatus("done");
                setCurrentSection("");
                return;
              }

              if (data.section) {
                if (data.status === "start") {
                  setCurrentSection(data.section);
                } else if (data.content) {
                  if (data.section === "overview") {
                    setOverviewText(prev => prev + data.content);
                  } else if (data.section === "changing") {
                    setChangingText(prev => prev + data.content);
                  } else if (data.section === "advice") {
                    setAdviceText(prev => prev + data.content);
                  }
                } else if (data.status === "done") {
                  // Section complete
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      setAiStatus("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      logger.error("[ResultDisplay] AI streaming error:", err);
      setAiError(err instanceof Error ? err.message : "AI 해석 중 오류가 발생했습니다.");
      setAiStatus("error");
    }
  }, [result, aiStatus, question, locale, lang, premiumData]);

  return {
    aiStatus,
    currentSection,
    overviewText,
    changingText,
    adviceText,
    aiError,
    startAiInterpretation,
    abortControllerRef,
  };
};
