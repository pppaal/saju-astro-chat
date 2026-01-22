/**
 * Question engine hook for generating suggested questions
 * Extracted from TarotChat.tsx lines 209-323, 406-423
 */

import { useMemo, useCallback, useState } from "react";
import type { DrawnCard } from "@/lib/Tarot/tarot.types";
import type { Message, ReadingResponse } from "../types";
import { SPREAD_QUESTIONS, CATEGORY_QUESTIONS, generateDynamicQuestions } from "../data";
import type { LangKey } from "../data";
import { generateTopicBasedQuestions } from "../utils/topicDetector";
import { generateContextualQuestions } from "../utils/contextAnalyzer";

/**
 * Hook for managing suggested questions based on context, cards, and conversation
 *
 * @param readingResult - The reading result
 * @param categoryName - Category name
 * @param spreadId - Spread ID
 * @param userTopic - User's topic
 * @param language - Language code
 * @param messages - Current conversation messages
 * @returns Question engine state and functions
 */
export function useQuestionEngine(
  readingResult: ReadingResponse,
  categoryName: string,
  spreadId: string,
  userTopic: string | undefined,
  language: LangKey,
  messages: Message[]
) {
  const [usedQuestionIndices, setUsedQuestionIndices] = useState<Set<number>>(new Set());

  // Generate dynamic questions based on actual drawn cards
  const dynamicQuestions = useMemo(
    () => generateDynamicQuestions(readingResult.drawnCards, language),
    [readingResult.drawnCards, language]
  );

  // Generate topic-based questions from userTopic
  const topicQuestions = useMemo(
    () => generateTopicBasedQuestions(userTopic, language),
    [userTopic, language]
  );

  // Get spread/category questions
  const spreadQuestions = useMemo(
    () =>
      SPREAD_QUESTIONS[spreadId]?.[language] ||
      CATEGORY_QUESTIONS[categoryName]?.[language] ||
      CATEGORY_QUESTIONS.default[language],
    [spreadId, categoryName, language]
  );

  // Combine all suggested questions in priority order
  const allSuggestedQuestions = useMemo(
    () =>
      [
        ...topicQuestions.slice(0, 3), // Top 3 topic-specific questions (highest priority)
        ...dynamicQuestions.slice(0, 4), // Top 4 card-specific questions
        ...spreadQuestions.slice(0, 3) // Top 3 spread-specific questions
      ].slice(0, 10), // Max 10 total
    [topicQuestions, dynamicQuestions, spreadQuestions]
  );

  // Generate contextual questions based on last response
  const getContextualQuestions = useCallback(
    (lastResponse: string): string[] => {
      return generateContextualQuestions(lastResponse, readingResult.drawnCards, language);
    },
    [readingResult.drawnCards, language]
  );

  // Get next 2 questions - prioritize contextual questions from last response
  const getNextSuggestions = useCallback((): string[] => {
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();

    if (lastAssistantMessage) {
      const contextual = getContextualQuestions(lastAssistantMessage.content);
      if (contextual.length > 0) {
        // Mix contextual with unused general questions
        const available = allSuggestedQuestions.filter((_, idx) => !usedQuestionIndices.has(idx));
        const mixed = [...contextual.slice(0, 2), ...available.slice(0, 1)];
        return mixed.slice(0, 2);
      }
    }

    // Fallback to general questions
    const available = allSuggestedQuestions.filter((_, idx) => !usedQuestionIndices.has(idx));
    return available.slice(0, 2);
  }, [messages, getContextualQuestions, allSuggestedQuestions, usedQuestionIndices]);

  /**
   * Mark a question as used
   */
  const markQuestionUsed = useCallback((question: string) => {
    const suggestionIndex = allSuggestedQuestions.indexOf(question);
    if (suggestionIndex !== -1) {
      setUsedQuestionIndices(prev => new Set([...prev, suggestionIndex]));
    }
  }, [allSuggestedQuestions]);

  return {
    allSuggestedQuestions,
    getNextSuggestions,
    markQuestionUsed
  };
}
