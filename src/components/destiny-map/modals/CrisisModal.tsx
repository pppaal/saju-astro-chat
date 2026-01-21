"use client";

import React, { useEffect, useRef } from "react";

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  tr: {
    crisisTitle: string;
    crisisMessage: string;
    crisisHotline: string;
    crisisHotlineNumber: string;
    groundingTip: string;
    crisisClose: string;
  };
  styles: Record<string, string>;
}

/**
 * Crisis support modal with hotline information
 * WCAG 2.1 AA compliant with proper ARIA attributes and focus management
 */
export default function CrisisModal({ isOpen, onClose, tr, styles: s }: CrisisModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when modal opens
    closeButtonRef.current?.focus();

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={s.crisisModalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-modal-title"
      aria-describedby="crisis-modal-description"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={s.crisisModal}>
        <div className={s.crisisIcon} aria-hidden="true">💜</div>
        <h3 id="crisis-modal-title" className={s.crisisTitle}>{tr.crisisTitle}</h3>
        <p id="crisis-modal-description" className={s.crisisMessage}>{tr.crisisMessage}</p>
        <div className={s.crisisHotline}>
          <span className={s.crisisHotlineLabel}>{tr.crisisHotline}:</span>
          <a href={`tel:${tr.crisisHotlineNumber.split(" ")[0]}`} className={s.crisisHotlineNumber}>
            {tr.crisisHotlineNumber}
          </a>
        </div>
        <p className={s.groundingTip}>{tr.groundingTip}</p>
        <button
          ref={closeButtonRef}
          type="button"
          className={s.crisisCloseBtn}
          onClick={onClose}
          aria-label={tr.crisisClose}
        >
          {tr.crisisClose}
        </button>
      </div>
    </div>
  );
}
