import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  generateLifeRecommendations,
  type UserProfile,
  type LifeRecommendation,
} from "@/lib/ai/recommendations";
import { logger } from "@/lib/logger";
import { buildSignInUrl } from "@/lib/auth/signInUrl";

type TabKey = "career" | "love" | "fitness" | "health" | "wealth" | "lifestyle";

export function useRecommendations() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<LifeRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("career");

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);

      // Note: This page uses placeholder saju/astrology data.
      // To use real user data, integrate with /api/me/saju and astrology profile APIs.
      const userProfile: UserProfile = {
        name: session?.user?.name || "User",
        birthDate: "1990-01-01", // Should fetch from user data
        saju: {
          year: "庚午",
          month: "戊寅",
          day: "甲子",
          hour: "丙辰",
          elements: {
            wood: 3,
            fire: 4,
            earth: 2,
            metal: 1,
            water: 2,
          },
          heavenlyStem: "甲",
          earthlyBranch: "子",
        },
        astrology: {
          sunSign: "Aries",
          moonSign: "Leo",
          rising: "Sagittarius",
          venus: "Taurus",
          mars: "Aries",
          jupiter: "Pisces",
          saturn: "Capricorn",
          houses: {
            h1: "Sagittarius",
            h2: "Capricorn",
            h6: "Taurus",
            h7: "Gemini",
            h10: "Virgo",
          },
        },
        currentSituation: {
          occupation: "Software Developer",
          income: 5000000,
          relationshipStatus: "single",
        },
      };

      const result = await generateLifeRecommendations(userProfile);
      setRecommendations(result);
    } catch (error) {
      logger.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(buildSignInUrl());
      return;
    }

    if (status === "authenticated") {
      loadRecommendations();
    }
  }, [status, router, loadRecommendations]);

  return {
    loading,
    recommendations,
    loadRecommendations,
    activeTab,
    setActiveTab,
  };
}
