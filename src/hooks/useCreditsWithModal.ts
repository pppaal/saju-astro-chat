"use client";

import { useCallback } from "react";
import { useCreditModal } from "@/contexts/CreditModalContext";
import { useToast } from "@/components/ui/Toast";
import { triggerCreditUpdate } from "@/components/ui/CreditBadge";

interface UseCreditsWithModalOptions {
  lowCreditThreshold?: number;
  showToastOnLow?: boolean;
}

/**
 * Hook that integrates credit modal with API calls
 * Automatically shows modal when credits are depleted or low
 */
export function useCreditsWithModal(options: UseCreditsWithModalOptions = {}) {
  const { lowCreditThreshold = 2, showToastOnLow = true } = options;
  const { showDepleted, showLowCredits, checkAndShowModal } = useCreditModal();
  const toast = useToast();

  /**
   * Handle API response and show credit modal if needed
   * Call this after any API call that consumes credits
   */
  const handleCreditResponse = useCallback(
    async (response: Response) => {
      // Trigger credit badge update
      triggerCreditUpdate();

      // Handle 402 Payment Required
      if (response.status === 402) {
        showDepleted();
        return { success: false, reason: "no_credits" };
      }

      // Try to parse response for remaining credits info
      try {
        const data = await response.clone().json();

        if (data.remainingCredits !== undefined) {
          const remaining = data.remainingCredits;

          if (remaining <= 0) {
            showDepleted();
            return { success: true, remaining: 0 };
          }

          if (remaining <= lowCreditThreshold) {
            if (showToastOnLow) {
              toast.warning(`크레딧이 ${remaining}개 남았습니다. 충전을 권장합니다.`, 5000);
            }
            // Show low credit modal after a short delay (let user see the result first)
            setTimeout(() => {
              showLowCredits(remaining);
            }, 2000);
            return { success: true, remaining };
          }
        }

        return { success: response.ok, remaining: data.remainingCredits };
      } catch {
        return { success: response.ok };
      }
    },
    [showDepleted, showLowCredits, lowCreditThreshold, showToastOnLow, toast]
  );

  /**
   * Wrapper for fetch that handles credit responses automatically
   */
  const fetchWithCreditCheck = useCallback(
    async (url: string, options?: RequestInit) => {
      const response = await fetch(url, options);
      const creditResult = await handleCreditResponse(response);

      return {
        response,
        creditResult,
      };
    },
    [handleCreditResponse]
  );

  /**
   * Check credits before making an API call
   * Returns false if user has no credits (and shows modal)
   */
  const checkCreditsBeforeAction = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/me/credits");
      if (!response.ok) return true; // Allow action if can't check

      const data = await response.json();
      const remaining = data.credits?.remaining ?? 0;

      if (remaining <= 0) {
        showDepleted();
        return false;
      }

      return true;
    } catch {
      return true; // Allow action on error
    }
  }, [showDepleted]);

  return {
    handleCreditResponse,
    fetchWithCreditCheck,
    checkCreditsBeforeAction,
    showDepleted,
    showLowCredits,
    checkAndShowModal,
  };
}
