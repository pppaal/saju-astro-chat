"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import CreditDepletedModal from "@/components/ui/CreditDepletedModal";

interface CreditModalContextType {
  showDepleted: () => void;
  showLowCredits: (remaining: number) => void;
  checkAndShowModal: (remaining: number, threshold?: number) => boolean;
}

const CreditModalContext = createContext<CreditModalContextType | null>(null);

export function CreditModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<"depleted" | "low">("depleted");
  const [remainingCredits, setRemainingCredits] = useState(0);

  const showDepleted = useCallback(() => {
    setModalType("depleted");
    setRemainingCredits(0);
    setIsOpen(true);
  }, []);

  const showLowCredits = useCallback((remaining: number) => {
    setModalType("low");
    setRemainingCredits(remaining);
    setIsOpen(true);
  }, []);

  // Utility: check remaining credits and show appropriate modal
  // Returns true if modal was shown
  const checkAndShowModal = useCallback((remaining: number, threshold: number = 2): boolean => {
    if (remaining <= 0) {
      showDepleted();
      return true;
    }
    if (remaining <= threshold) {
      showLowCredits(remaining);
      return true;
    }
    return false;
  }, [showDepleted, showLowCredits]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <CreditModalContext.Provider value={{ showDepleted, showLowCredits, checkAndShowModal }}>
      {children}
      <CreditDepletedModal
        isOpen={isOpen}
        onClose={close}
        type={modalType}
        remainingCredits={remainingCredits}
      />
    </CreditModalContext.Provider>
  );
}

export function useCreditModal() {
  const context = useContext(CreditModalContext);
  if (!context) {
    throw new Error("useCreditModal must be used within CreditModalProvider");
  }
  return context;
}

// Helper for API responses - can be used without React context
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function shouldShowCreditModal(
  response: Response,
  data: unknown
): { show: boolean; type: "depleted" | "low"; remaining: number } {
  // Check for 402 Payment Required
  if (response.status === 402) {
    return { show: true, type: "depleted", remaining: 0 };
  }

  // Check for low credits in response data
  const remainingCredits = isRecord(data) ? data.remainingCredits : undefined;
  if (typeof remainingCredits === "number") {
    if (remainingCredits <= 0) {
      return { show: true, type: "depleted", remaining: 0 };
    }
    if (remainingCredits <= 2) {
      return { show: true, type: "low", remaining: remainingCredits };
    }
  }

  return { show: false, type: "depleted", remaining: 0 };
}
