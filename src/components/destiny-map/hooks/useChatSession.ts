"use client";

import React from "react";
import { logger } from "@/lib/logger";
import { CHAT_TIMINGS } from "../chat-constants";
import type { Message } from "../chat-constants";
import type { SessionItem } from "../modals/HistoryModal";

interface UseChatSessionOptions {
  theme: string;
  lang: string;
  initialContext?: string;
  saju?: unknown;
  astro?: unknown;
}

interface UseChatSessionReturn {
  sessionIdRef: React.MutableRefObject<string>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessionLoaded: boolean;
  sessionHistory: SessionItem[];
  historyLoading: boolean;
  deleteConfirmId: string | null;
  setDeleteConfirmId: React.Dispatch<React.SetStateAction<string | null>>;
  loadSessionHistory: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  startNewChat: () => void;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Hook for managing chat session state and persistence
 */
export function useChatSession(options: UseChatSessionOptions): UseChatSessionReturn {
  const { theme, lang, initialContext, saju, astro } = options;

  const sessionIdRef = React.useRef<string>(generateSessionId());
  const [messages, setMessages] = React.useState<Message[]>(
    initialContext ? [{ role: "system", content: initialContext }] : []
  );
  const [sessionLoaded, setSessionLoaded] = React.useState(false);
  const [sessionHistory, setSessionHistory] = React.useState<SessionItem[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  // Mark session as loaded on mount
  React.useEffect(() => {
    setSessionLoaded(true);
    logger.debug("[Chat] Session ready (fresh start - history available via button)");
  }, []);

  // Auto-save messages to database
  React.useEffect(() => {
    if (!sessionLoaded) {return;}
    if (messages.length === 0) {return;}

    const saveTimer = setTimeout(async () => {
      try {
        await fetch("/api/counselor/session/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            theme: theme || "chat",
            locale: lang || "ko",
            messages: messages.filter(m => m.role !== "system"),
          }),
        });
        logger.debug("[Chat] Session auto-saved:", { messageCount: messages.length });
      } catch (e) {
        logger.warn("[Chat] Failed to save session:", e);
      }
    }, CHAT_TIMINGS.DEBOUNCE_SAVE);

    return () => clearTimeout(saveTimer);
  }, [messages, sessionLoaded, theme, lang]);

  // Auto-update PersonaMemory after conversation
  const lastUpdateRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (!sessionLoaded) {return;}
    const visibleMsgs = messages.filter(m => m.role !== "system");
    if (visibleMsgs.length < 2) {return;}

    const now = Date.now();
    if (now - lastUpdateRef.current < 30000) {return;}

    const lastMsg = visibleMsgs[visibleMsgs.length - 1];
    if (lastMsg?.role !== "assistant" || !lastMsg.content || lastMsg.content.length < 50) {return;}

    lastUpdateRef.current = now;

    fetch("/api/persona-memory/update-from-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        theme: theme || "chat",
        locale: lang || "ko",
        messages: visibleMsgs,
        saju: saju || undefined,
        astro: astro || undefined,
      }),
    })
      .then(res => {
        if (res.ok) {
          logger.debug("[Chat] PersonaMemory auto-updated");
        }
      })
      .catch(e => {
        logger.warn("[Chat] Failed to update PersonaMemory:", e);
      });
  }, [messages, sessionLoaded, theme, lang, saju, astro]);

  // Load session history
  const loadSessionHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/counselor/session/list?theme=${theme || "chat"}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(data.sessions || []);
      }
    } catch (e) {
      logger.warn("[Chat] Failed to load history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [theme]);

  // Load a specific session
  const loadSession = React.useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/counselor/session/load?theme=${theme || "chat"}&sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          sessionIdRef.current = data.sessionId || sessionId;
        }
      }
    } catch (e) {
      logger.warn("[Chat] Failed to load session:", e);
    }
  }, [theme]);

  // Delete a session
  const deleteSession = React.useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/counselor/session/list?sessionId=${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessionHistory(prev => prev.filter(s => s.id !== sessionId));
        setDeleteConfirmId(null);
      }
    } catch (e) {
      logger.warn("[Chat] Failed to delete session:", e);
    }
  }, []);

  // Start new chat
  const startNewChat = React.useCallback(() => {
    setMessages(initialContext ? [{ role: "system", content: initialContext }] : []);
    sessionIdRef.current = generateSessionId();
  }, [initialContext]);

  return {
    sessionIdRef,
    messages,
    setMessages,
    sessionLoaded,
    sessionHistory,
    historyLoading,
    deleteConfirmId,
    setDeleteConfirmId,
    loadSessionHistory,
    loadSession,
    deleteSession,
    startNewChat,
  };
}
