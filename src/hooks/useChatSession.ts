// src/hooks/useChatSession.ts
// Shared hook for chat session management across counselor components

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  generateSessionId,
  generateMessageId as generateMessageIdFromUtils,
} from "@/components/destiny-map/chat-utils";

/**
 * Message type for chat sessions
 */
export interface ChatSessionMessage {
  role: "system" | "user" | "assistant";
  content: string;
  id?: string;
}

/**
 * Feedback type for messages
 */
export type FeedbackType = "up" | "down" | null;

/**
 * Options for useChatSession hook
 */
export interface UseChatSessionOptions {
  /** Initial system context message */
  initialContext?: string;
  /** Initial follow-up questions */
  initialFollowUps?: string[];
  /** Storage key for session persistence */
  storageKey?: string;
}

/**
 * Generate a unique message ID (re-exported for convenience)
 */
export function generateMessageId(): string {
  return generateMessageIdFromUtils("user");
}

/**
 * Shared hook for chat session state management
 * Provides common functionality used across AstrologyChat, SajuChat, TarotChat, etc.
 */
export function useChatSession(options: UseChatSessionOptions = {}) {
  const { initialContext, initialFollowUps = [], storageKey } = options;

  // Session ID (stable across renders) - use state instead of ref to avoid render-time access issues
  const [sessionId] = useState<string>(() => generateSessionId());

  // Core state
  const [messages, setMessages] = useState<ChatSessionMessage[]>(() => {
    // Try to restore from storage if key provided
    if (storageKey && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
    // Default: start with system context if provided
    return initialContext ? [{ role: "system" as const, content: initialContext }] : [];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, FeedbackType>>({});
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>(initialFollowUps);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist messages to storage
  useEffect(() => {
    if (storageKey && typeof window !== "undefined" && messages.length > 0) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        // Ignore storage errors
      }
    }
  }, [messages, storageKey]);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add a user message
  const addUserMessage = useCallback((content: string) => {
    const message: ChatSessionMessage = {
      role: "user",
      content,
      id: generateMessageId(),
    };
    setMessages((prev) => [...prev, message]);
    setShowSuggestions(false);
    return message;
  }, []);

  // Add an assistant message
  const addAssistantMessage = useCallback((content: string) => {
    const message: ChatSessionMessage = {
      role: "assistant",
      content,
      id: generateMessageId(),
    };
    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  // Update the last assistant message (for streaming)
  const updateLastAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && prev[lastIdx].role === "assistant") {
        const updated = [...prev];
        updated[lastIdx] = { ...updated[lastIdx], content };
        return updated;
      }
      return prev;
    });
  }, []);

  // Handle feedback on a message
  const handleFeedback = useCallback((messageId: string, type: FeedbackType) => {
    setFeedback((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === type ? null : type,
    }));
  }, []);

  // Clear the chat
  const clearChat = useCallback(() => {
    setMessages(initialContext ? [{ role: "system", content: initialContext }] : []);
    setInput("");
    setFeedback({});
    setFollowUpQuestions(initialFollowUps);
    setShowSuggestions(true);
    setError(null);
    if (storageKey && typeof window !== "undefined") {
      sessionStorage.removeItem(storageKey);
    }
  }, [initialContext, initialFollowUps, storageKey]);

  // Abort any ongoing request
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Create a new abort controller for a request
  const createAbortController = useCallback(() => {
    abortRequest();
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, [abortRequest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRequest();
    };
  }, [abortRequest]);

  return {
    // State
    messages,
    setMessages,
    input,
    setInput,
    loading,
    setLoading,
    feedback,
    setFeedback,
    followUpQuestions,
    setFollowUpQuestions,
    showSuggestions,
    setShowSuggestions,
    error,
    setError,

    // Session
    sessionId,
    messagesEndRef,

    // Actions
    addUserMessage,
    addAssistantMessage,
    updateLastAssistantMessage,
    handleFeedback,
    clearChat,
    scrollToBottom,
    createAbortController,
    abortRequest,
  };
}

export default useChatSession;
