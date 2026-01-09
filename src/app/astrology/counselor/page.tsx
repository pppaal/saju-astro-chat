"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AstrologyChat from "@/components/astrology/AstrologyChat";
import { useI18n } from "@/i18n/I18nProvider";
import CreditBadge from "@/components/ui/CreditBadge";
import AuthGate from "@/components/auth/AuthGate";
import styles from "./counselor.module.css";
import { astroLogger } from '@/lib/logger';
import { buildSignInUrl } from "@/lib/auth/signInUrl";

type SearchParams = Record<string, string | string[] | undefined>;

// User context type for returning users
type UserContext = {
  persona?: {
    sessionCount?: number;
    lastTopics?: string[];
    emotionalTone?: string;
    recurringIssues?: string[];
  };
  recentSessions?: Array<{
    id: string;
    summary?: string;
    keyTopics?: string[];
    lastMessageAt?: string;
  }>;
};

type Lang = "ko" | "en";

type PrefetchResponse = {
  status?: string;
  session_id?: string;
  astro?: Record<string, unknown>;
  prefetch_time_ms?: number;
  data_summary?: { graph_nodes?: number };
};

type CounselorSession = {
  id: string;
  summary?: string;
  keyTopics?: string[];
  lastMessageAt?: string;
  theme?: string;
};

type CounselorPersona = {
  sessionCount?: number;
  lastTopics?: string[];
  emotionalTone?: string;
  recurringIssues?: string[];
};

type CounselorContextResponse = {
  success?: boolean;
  persona?: CounselorPersona;
  sessions?: CounselorSession[];
  isReturningUser?: boolean;
};

export default function AstrologyCounselorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { t } = useI18n();
  const sp = React.use(searchParams);
  const router = useRouter();
  const { status: authStatus } = useSession();
  const isAuthed = authStatus === "authenticated";
  const isCheckingAuth = authStatus === "loading";

  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [astroData, setAstroData] = useState<Record<string, unknown> | null>(null);
  const [prefetchStatus, setPrefetchStatus] = useState<{
    done: boolean;
    timeMs?: number;
    graphNodes?: number;
  }>({ done: false });
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Premium: User context and chat session for returning users
  const [userContext, setUserContext] = useState<UserContext | undefined>(undefined);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined);

  // Parse search params
  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? "";
  const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? "";
  const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? "";
  const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? "";
  const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? "";
  const theme = (Array.isArray(sp.theme) ? sp.theme[0] : sp.theme) ?? "life";
  const langParam = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? "ko";
  const lang: Lang = langParam === "en" ? "en" : "ko";
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
    t("astrology.counselor.loading1", "점성술 상담사와 연결 중..."),
    t("astrology.counselor.loading2", "별자리 차트를 분석하는 중..."),
    t("astrology.counselor.loading3", "행성 트랜짓을 읽는 중..."),
    t("astrology.counselor.loading4", "맞춤 상담을 준비하는 중..."),
  ];

  // Load pre-computed astro data from sessionStorage
  useEffect(() => {
    if (!isAuthed) return;
    if (!birthDate || !birthTime) return;

    let astro: Record<string, unknown> | null = null;

    try {
      const stored = sessionStorage.getItem("astrologyCounselorData");
      if (stored) {
        const data = JSON.parse(stored);
        // Only use if data is fresh (within 1 hour)
        if (data.timestamp && Date.now() - data.timestamp < 3600000) {
          astro = data.astro;
        }
      }
    } catch (e) {
      astroLogger.warn("[AstrologyCounselorPage] Failed to load astro data:", e instanceof Error ? e : undefined);
    }

    // If no cached astro data, we'll let the backend compute it
    // (Astrology calculation is typically done server-side)
    if (!astro && birthDate && birthTime && !isNaN(latitude) && !isNaN(longitude)) {
      // Store basic birth info for backend to compute
      astro = {
        birthDate,
        birthTime,
        latitude,
        longitude,
        needsComputation: true,
      };
    }

    setAstroData(astro);

    // Prefetch RAG data in background (astrology-only)
    const prefetchRAG = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";
        const res = await fetch(`${backendUrl}/astrology/counselor/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            astro,
            theme,
            birth: { date: birthDate, time: birthTime, lat: latitude, lon: longitude },
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as PrefetchResponse;
          if (data.status === "success") {
            if (data.session_id) {
              setSessionId(data.session_id);
            }
            // Update astro data if computed by backend
            if (data.astro) {
              setAstroData(data.astro);
              sessionStorage.setItem("astrologyCounselorData", JSON.stringify({
                astro: data.astro,
                timestamp: Date.now(),
              }));
            }
            setPrefetchStatus({
              done: true,
              timeMs: typeof data.prefetch_time_ms === "number" ? data.prefetch_time_ms : undefined,
              graphNodes: data.data_summary?.graph_nodes,
            });
            astroLogger.warn(`[AstrologyCounselor] RAG prefetch done: ${data.prefetch_time_ms ?? 0}ms`);
          }
        }
      } catch (e) {
        astroLogger.warn("[AstrologyCounselorPage] RAG prefetch failed", e instanceof Error ? e : undefined);
        setPrefetchStatus({ done: true }); // Continue anyway
      }
    };
    prefetchRAG();
  }, [theme, isAuthed, birthDate, birthTime, latitude, longitude]);

  // Premium: Load user context (persona + recent sessions) for returning users
  useEffect(() => {
    if (!isAuthed) return;

    const loadUserContext = async () => {
      try {
        const res = await fetch(`/api/counselor/chat-history?theme=${theme}&type=astrology&limit=3`);
        if (res.ok) {
          const data = (await res.json()) as CounselorContextResponse;
          if (data.success) {
            const context: UserContext = {};

            if (data.persona) {
              context.persona = {
                sessionCount: data.persona.sessionCount,
                lastTopics: data.persona.lastTopics,
                emotionalTone: data.persona.emotionalTone,
                recurringIssues: data.persona.recurringIssues,
              };
            }

            const sessions = Array.isArray(data.sessions) ? data.sessions : [];
            if (sessions.length > 0) {
              context.recentSessions = sessions.map((s) => ({
                id: s.id,
                summary: s.summary,
                keyTopics: s.keyTopics,
                lastMessageAt: s.lastMessageAt,
              }));

              const recentThemeSession = sessions.find((s) => s.theme === theme);
              if (recentThemeSession) {
                setChatSessionId(recentThemeSession.id);
              }
            }

            setUserContext(context);
            astroLogger.warn("[AstrologyCounselor] User context loaded:", {
              isReturningUser: data.isReturningUser,
              sessionCount: context.persona?.sessionCount,
              recentSessions: context.recentSessions?.length || 0,
            });
          }
        }
      } catch (e: unknown) {
        astroLogger.warn("[AstrologyCounselor] No user context available (guest user)");
      }
    };

    loadUserContext();
  }, [theme, isAuthed]);

  // Premium: Save message callback
  const handleSaveMessage = useCallback(
    async (userMessage: string, assistantMessage: string) => {
      try {
        const res = await fetch("/api/counselor/chat-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: chatSessionId,
            theme,
            type: "astrology",
            locale: lang,
            userMessage,
            assistantMessage,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && !chatSessionId) {
            setChatSessionId(data.session.id);
            astroLogger.warn("[AstrologyCounselor] New chat session created:", data.session.id);
          }
        }
      } catch (e) {
        astroLogger.warn("[AstrologyCounselor] Failed to save message", e instanceof Error ? e : undefined);
      }
    },
    [chatSessionId, theme, lang]
  );

  // Loading animation
  useEffect(() => {
    if (!isAuthed) return;

    if (!birthDate || !birthTime || isNaN(latitude) || isNaN(longitude)) {
      router.push("/astrology");
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

    const minLoadTime = 2000;
    const startTime = Date.now();

    const checkReady = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= minLoadTime && (prefetchStatus.done || elapsed >= 5000)) {
        setIsLoading(false);
        setTimeout(() => setShowChat(true), 300);
        clearInterval(checkReady);
      }
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(checkReady);
    };
  }, [birthDate, birthTime, latitude, longitude, router, loadingMessages.length, prefetchStatus.done, isAuthed]);

  const handleLogin = useCallback(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.push(buildSignInUrl(`/astrology/counselor${search}`));
  }, [router]);

  if (isCheckingAuth) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>
            <h2 className={styles.counselorTitle}>
              {t("astrology.counselor.title", "점성술 상담사")}
            </h2>
            <p className={styles.loadingMessage}>
              {t("astrology.counselor.authChecking", "로그인 상태를 확인하는 중입니다...")}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const loginFallback = (
      <main className={styles.page}>
        <div className={styles.authGate}>
          <div className={styles.authCard}>
            <div className={styles.authIcon}>&#x2728;</div>
            <h1 className={styles.authTitle}>
              {t("astrology.counselor.loginRequiredTitle", "점성술 상담은 로그인 후 이용할 수 있어요")}
            </h1>
            <p className={styles.authDesc}>
              {t("astrology.counselor.loginRequiredDesc", "맞춤형 점성술 상담과 이전 대화 기록을 불러오려면 로그인해주세요.")}
            </p>
            <button type="button" className={styles.loginButton} onClick={handleLogin}>
              {t("astrology.counselor.loginCta", "로그인하고 시작하기")}
            </button>
            <p className={styles.loginHint}>
              {t("astrology.counselor.loginHint", "계정이 없으면 로그인 과정에서 바로 회원가입할 수 있습니다.")}
            </p>
          </div>
        </div>
      </main>
  );

  // Loading screen
  if (isLoading && isAuthed) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          {/* Animated Avatar */}
          <div className={styles.avatarWrapper}>
            <div className={styles.avatarGlow} />
            <div className={styles.avatar}>
              <span className={styles.avatarEmoji}>&#x2728;</span>
            </div>
            <div className={styles.orbits}>
              <div className={styles.orbit1}>
                <span>&#x2600;</span>
              </div>
              <div className={styles.orbit2}>
                <span>&#x1F319;</span>
              </div>
              <div className={styles.orbit3}>
                <span>&#x2B50;</span>
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className={styles.loadingText}>
            <h2 className={styles.counselorTitle}>
              {t("astrology.counselor.title", "점성술 상담사")}
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

            {/* Prefetch Status */}
            {prefetchStatus.done && (
              <div className={styles.prefetchStatus}>
                <span className={styles.prefetchCheck}>&#x2713;</span>
                <span>
                  {lang === "ko"
                    ? `${prefetchStatus.graphNodes || 0}개 점성술 지식 노드 준비 완료`
                    : `${prefetchStatus.graphNodes || 0} astrology knowledge nodes ready`}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Chat screen
  return (
    <AuthGate statusOverride={authStatus} callbackUrl={typeof window !== "undefined" ? `/astrology/counselor${window.location.search}` : '/astrology/counselor'} fallback={loginFallback}>
    <main className={`${styles.page} ${showChat ? styles.fadeIn : ""}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.counselorBadge}>
            <span className={styles.counselorAvatar}>&#x2728;</span>
            <div>
              <h1 className={styles.headerTitle}>
                {t("astrology.counselor.title", "점성술 상담사")}
              </h1>
              <span className={styles.onlineStatus}>
                <span className={styles.onlineDot} />
                {t("astrology.counselor.online", "Online")}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <CreditBadge variant="compact" />
          <Link href="/" className={styles.homeButton} aria-label="Home">
            <span className={styles.homeIcon}>🏠</span>
            <span className={styles.homeLabel}>홈</span>
          </Link>
        </div>
      </header>

      {/* Chat Area */}
      <div className={styles.chatWrapper}>
        <AstrologyChat
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
          seedEvent="astrology-counselor:seed"
          astro={astroData}
          userContext={userContext}
          chatSessionId={chatSessionId}
          onSaveMessage={handleSaveMessage}
          autoScroll={false}
          ragSessionId={sessionId || undefined}
          autoSendSeed
        />
      </div>

      {/* Initial Question Auto-send */}
      {initialQuestion && (
        <InitialQuestionSender question={initialQuestion} />
      )}
    </main>
    </AuthGate>
  );
}

// Component to auto-send initial question
function InitialQuestionSender({ question }: { question: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("astrology-counselor:seed", { detail: question }));
    }, 500);
    return () => clearTimeout(timer);
  }, [question]);

  return null;
}
