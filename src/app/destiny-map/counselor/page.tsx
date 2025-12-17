"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import Chat from "@/components/destiny-map/Chat";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./counselor.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

export default function CounselorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { t } = useI18n();
  const sp = React.use(searchParams);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [chartData, setChartData] = useState<{ saju?: any; astro?: any } | null>(null);

  // Parse search params
  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? "";
  const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? "";
  const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? "";
  const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? "";
  const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? "";
  const theme = (Array.isArray(sp.theme) ? sp.theme[0] : sp.theme) ?? "life";
  const lang = ((Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? "ko") as any;
  const initialQuestion = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";

  const latStr =
    (Array.isArray(sp.lat) ? sp.lat[0] : sp.lat) ??
    (Array.isArray(sp.latitude) ? sp.latitude[0] : sp.latitude);
  const lonStr =
    (Array.isArray(sp.lon) ? sp.lon[0] : sp.lon) ??
    (Array.isArray(sp.longitude) ? sp.longitude[0] : sp.longitude);

  const latitude = latStr ? Number(latStr) : NaN;
  const longitude = lonStr ? Number(lonStr) : NaN;

  const loadingMessages = [
    t("destinyMap.counselor.loading1", "Connecting with your counselor..."),
    t("destinyMap.counselor.loading2", "Analyzing your birth chart..."),
    t("destinyMap.counselor.loading3", "Reading celestial energies..."),
    t("destinyMap.counselor.loading4", "Preparing personalized guidance..."),
  ];

  // Load pre-computed chart data from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("destinyChartData");
      if (stored) {
        const data = JSON.parse(stored);
        // Only use if data is fresh (within 1 hour)
        if (data.timestamp && Date.now() - data.timestamp < 3600000) {
          setChartData({ saju: data.saju, astro: data.astro });
        }
      }
    } catch (e) {
      console.warn("[CounselorPage] Failed to load chart data:", e);
    }
  }, []);

  // Loading animation
  useEffect(() => {
    if (!birthDate || !birthTime || isNaN(latitude) || isNaN(longitude)) {
      router.push("/destiny-map");
      return;
    }

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setShowChat(true), 300);
    }, 3200);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(loadingTimer);
    };
  }, [birthDate, birthTime, latitude, longitude, router, loadingMessages.length]);

  // Loading screen
  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          {/* Animated Avatar */}
          <div className={styles.avatarWrapper}>
            <div className={styles.avatarGlow} />
            <div className={styles.avatar}>
              <span className={styles.avatarEmoji}>🔮</span>
            </div>
            <div className={styles.orbits}>
              <div className={styles.orbit1}>
                <span>✨</span>
              </div>
              <div className={styles.orbit2}>
                <span>🌙</span>
              </div>
              <div className={styles.orbit3}>
                <span>⭐</span>
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className={styles.loadingText}>
            <h2 className={styles.counselorTitle}>
              {t("destinyMap.counselor.title", "DestinyPal Counselor")}
            </h2>
            <p className={styles.loadingMessage}>{loadingMessages[loadingStep]}</p>

            {/* Progress Dots */}
            <div className={styles.progressDots}>
              {loadingMessages.map((_, idx) => (
                <div
                  key={idx}
                  className={`${styles.dot} ${idx <= loadingStep ? styles.dotActive : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Chat screen
  return (
    <main className={`${styles.page} ${showChat ? styles.fadeIn : ""}`}>
      {/* Header */}
      <header className={styles.header}>
        <BackButton onClick={() => router.back()} className={styles.headerBackButton} />

        <div className={styles.headerInfo}>
          <div className={styles.counselorBadge}>
            <span className={styles.counselorAvatar}>🔮</span>
            <div>
              <h1 className={styles.headerTitle}>
                {t("destinyMap.counselor.title", "DestinyPal Counselor")}
              </h1>
              <span className={styles.onlineStatus}>
                <span className={styles.onlineDot} />
                {t("destinyMap.counselor.online", "Online")}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {/* Future: Voice button placeholder */}
          <button className={styles.iconButton} disabled title={t("destinyMap.counselor.voiceComingSoon", "Voice (Coming Soon)")}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className={styles.chatWrapper}>
        <Chat
          profile={{
            name,
            birthDate,
            birthTime,
            city,
            gender,
            latitude,
            longitude,
          }}
          lang={lang}
          theme={theme}
          initialContext={initialQuestion ? `User's initial question: ${initialQuestion}` : ""}
          seedEvent="counselor:seed"
          saju={chartData?.saju}
          astro={chartData?.astro}
        />
      </div>

      {/* Initial Question Auto-send */}
      {initialQuestion && (
        <InitialQuestionSender question={initialQuestion} />
      )}
    </main>
  );
}

// Component to auto-send initial question
function InitialQuestionSender({ question }: { question: string }) {
  useEffect(() => {
    // Delay to let chat mount first
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("counselor:seed", { detail: question }));
    }, 500);
    return () => clearTimeout(timer);
  }, [question]);

  return null;
}
