"use client";

import React from "react";

interface SessionItem {
  id: string;
  theme: string;
  messageCount: number;
  updatedAt: string;
  summary?: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionItem[];
  loading: boolean;
  deleteConfirmId: string | null;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteConfirm: (sessionId: string | null) => void;
  onNewChat: () => void;
  formatRelativeDate: (dateStr: string) => string;
  tr: {
    previousChats: string;
    noHistory: string;
    confirmDelete: string;
    deleteSession: string;
    cancel: string;
    messages: string;
    newChat: string;
  };
  styles: Record<string, string>;
}

/**
 * Session history modal for viewing and managing past conversations
 */
export default function HistoryModal({
  isOpen,
  onClose,
  sessions,
  loading,
  deleteConfirmId,
  onLoadSession,
  onDeleteSession,
  onDeleteConfirm,
  onNewChat,
  formatRelativeDate,
  tr,
  styles: s
}: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className={s.historyModalOverlay} onClick={onClose}>
      <div className={s.historyModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.historyHeader}>
          <h3 className={s.historyTitle}>{tr.previousChats}</h3>
          <button
            type="button"
            className={s.historyCloseBtn}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={s.historyContent}>
          {loading ? (
            <div className={s.historyLoading}>
              <div className={s.loadingSpinner} />
            </div>
          ) : sessions.length === 0 ? (
            <div className={s.historyEmpty}>{tr.noHistory}</div>
          ) : (
            <div className={s.historyList}>
              {sessions.map((session) => (
                <div key={session.id} className={s.historyItem}>
                  {deleteConfirmId === session.id ? (
                    <div className={s.deleteConfirm}>
                      <span>{tr.confirmDelete}</span>
                      <div className={s.deleteConfirmButtons}>
                        <button
                          type="button"
                          className={s.deleteConfirmYes}
                          onClick={() => onDeleteSession(session.id)}
                        >
                          {tr.deleteSession}
                        </button>
                        <button
                          type="button"
                          className={s.deleteConfirmNo}
                          onClick={() => onDeleteConfirm(null)}
                        >
                          {tr.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={s.historyItemContent} onClick={() => onLoadSession(session.id)}>
                        <div className={s.historyItemDate}>
                          {formatRelativeDate(session.updatedAt)}
                        </div>
                        <div className={s.historyItemMeta}>
                          {session.messageCount} {tr.messages}
                        </div>
                        {session.summary && (
                          <div className={s.historyItemSummary}>
                            {session.summary.slice(0, 80)}...
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={s.historyItemDelete}
                        onClick={() => onDeleteConfirm(session.id)}
                        title={tr.deleteSession}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={s.historyFooter}>
          <button
            type="button"
            className={s.newChatBtn}
            onClick={onNewChat}
          >
            ✨ {tr.newChat}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { SessionItem, HistoryModalProps };
