"use client";

import React from "react";

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
 */
export default function CrisisModal({ isOpen, onClose, tr, styles: s }: CrisisModalProps) {
  if (!isOpen) return null;

  return (
    <div className={s.crisisModalOverlay}>
      <div className={s.crisisModal}>
        <div className={s.crisisIcon}>💜</div>
        <h3 className={s.crisisTitle}>{tr.crisisTitle}</h3>
        <p className={s.crisisMessage}>{tr.crisisMessage}</p>
        <div className={s.crisisHotline}>
          <span className={s.crisisHotlineLabel}>{tr.crisisHotline}:</span>
          <a href={`tel:${tr.crisisHotlineNumber.split(" ")[0]}`} className={s.crisisHotlineNumber}>
            {tr.crisisHotlineNumber}
          </a>
        </div>
        <p className={s.groundingTip}>{tr.groundingTip}</p>
        <button
          type="button"
          className={s.crisisCloseBtn}
          onClick={onClose}
        >
          {tr.crisisClose}
        </button>
      </div>
    </div>
  );
}
