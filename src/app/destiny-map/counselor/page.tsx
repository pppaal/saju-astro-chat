"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Chat from "@/components/destiny-map/Chat";
import { useI18n } from "@/i18n/I18nProvider";
import { calculateSajuData } from "@/lib/Saju/saju";
import styles from "./counselor.module.css";

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

export default function CounselorPage({
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
  const [chartData, setChartData] = useState<{ saju?: any; astro?: any } | null>(null);
  const [prefetchStatus, setPrefetchStatus] = useState<{
    done: boolean;
    timeMs?: number;
    graphNodes?: number;
    corpusQuotes?: number;
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

  // Load pre-computed chart data from sessionStorage OR compute fresh
  useEffect(() => {
    if (!isAuthed) return;
    if (!birthDate || !birthTime) return;

    let saju: any = null;
    let astro: any = null;

    try {
      const stored = sessionStorage.getItem("destinyChartData");
      if (stored) {
        const data = JSON.parse(stored);
        // Only use if data is fresh (within 1 hour)
        if (data.timestamp && Date.now() - data.timestamp < 3600000) {
          saju = data.saju;
          astro = data.astro;
        }
      }
    } catch (e) {
      console.warn("[CounselorPage] Failed to load chart data:", e);
    }

    // If no cached saju data, compute fresh from birth info
    if (!saju || !saju.dayMaster) {
      try {
        console.log("[CounselorPage] Computing fresh saju data...");
        // calculateSajuData(birthDate, birthTime, gender, calendarType, timezone, lunarLeap?)
        const genderVal = (gender === "Male" || gender === "male") ? "male" : "female";
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
        const computed = calculateSajuData(birthDate, birthTime, genderVal, "solar", userTz);
        saju = computed;
        // Save to sessionStorage for future use
        sessionStorage.setItem("destinyChartData", JSON.stringify({
          saju: computed,
          astro: astro || {},
          timestamp: Date.now(),
        }));
        console.log("[CounselorPage] Fresh saju computed:", {
          dayMaster: computed.dayMaster?.heavenlyStem,
          yearPillar: computed.yearPillar?.heavenlyStem,
        });
      } catch (e) {
        console.warn("[CounselorPage] Failed to compute saju:", e);
      }
    }

    setChartData({ saju, astro });

    // Prefetch RAG data in background
    if (saju || astro) {
      const prefetchRAG = async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";
          const res = await fetch(`${backendUrl}/counselor/init`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ saju, astro, theme }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
              setSessionId(data.session_id);
              setPrefetchStatus({
                done: true,
                timeMs: data.prefetch_time_ms,
                graphNodes: data.data_summary?.graph_nodes,
                corpusQuotes: data.data_summary?.corpus_quotes,
              });
              console.log(`[Counselor] RAG prefetch done: ${data.prefetch_time_ms}ms`);
            }
          }
        } catch (e) {
          console.warn("[CounselorPage] RAG prefetch failed:", e);
          setPrefetchStatus({ done: true }); // Continue anyway
        }
      };
      prefetchRAG();
    }
  }, [theme, isAuthed, birthDate, birthTime, gender]);

  // Premium: Load user context (persona + recent sessions) for returning users
  useEffect(() => {
    if (!isAuthed) return;

    const loadUserContext = async () => {
      try {
        const res = await fetch(`/api/counselor/chat-history?theme=${theme}&limit=3`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Build user context
            const context: UserContext = {};

            // Add persona memory if available
            if (data.persona) {
              context.persona = {
                sessionCount: data.persona.sessionCount,
                lastTopics: data.persona.lastTopics,
                emotionalTone: data.persona.emotionalTone,
                recurringIssues: data.persona.recurringIssues,
              };
            }

            // Add recent session summaries
            if (data.sessions && data.sessions.length > 0) {
              context.recentSessions = data.sessions.map((s: any) => ({
                id: s.id,
                summary: s.summary,
                keyTopics: s.keyTopics,
                lastMessageAt: s.lastMessageAt,
              }));

              // If continuing the same theme, use the most recent session
              const recentThemeSession = data.sessions.find((s: any) => s.theme === theme);
              if (recentThemeSession) {
                setChatSessionId(recentThemeSession.id);
              }
            }

            setUserContext(context);
            console.log("[Counselor] User context loaded:", {
              isReturningUser: data.isReturningUser,
              sessionCount: context.persona?.sessionCount,
              recentSessions: context.recentSessions?.length || 0,
            });
          }
        }
      } catch (e) {
        // Not logged in or error - continue without user context
        console.log("[Counselor] No user context available (guest user)");
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
            sessionId: chatSessionId, // Will create new if undefined
            theme,
            locale: lang,
            userMessage,
            assistantMessage,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && !chatSessionId) {
            // Set session ID for subsequent messages
            setChatSessionId(data.session.id);
            console.log("[Counselor] New chat session created:", data.session.id);
          }
        }
      } catch (e) {
        console.warn("[Counselor] Failed to save message:", e);
      }
    },
    [chatSessionId, theme, lang]
  );

  // Loading animation
  useEffect(() => {
    if (!isAuthed) return;

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

    // Wait for either: 3.2s OR prefetch complete (whichever is later, min 2s)
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
    signIn(undefined, { callbackUrl: `/destiny-map/counselor${search}` });
  }, []);

  if (isCheckingAuth) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>
            <h2 className={styles.counselorTitle}>
              {t("destinyMap.counselor.title", "DestinyPal Counselor")}
            </h2>
            <p className={styles.loadingMessage}>
              {t("destinyMap.counselor.authChecking", "로그인 상태를 확인하는 중입니다...")}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main className={styles.page}>
        <div className={styles.authGate}>
          <div className={styles.authCard}>
            <div className={styles.authIcon}>🔒</div>
            <h1 className={styles.authTitle}>
              {t("destinyMap.counselor.loginRequiredTitle", "상담사 채팅은 로그인 후 이용할 수 있어요")}
            </h1>
            <p className={styles.authDesc}>
              {t("destinyMap.counselor.loginRequiredDesc", "맞춤형 상담과 이전 대화 기록을 불러오려면 로그인해주세요.")}
            </p>
            <button type="button" className={styles.loginButton} onClick={handleLogin}>
              {t("destinyMap.counselor.loginCta", "로그인하고 시작하기")}
            </button>
            <p className={styles.loginHint}>
              {t("destinyMap.counselor.loginHint", "계정이 없으면 로그인 과정에서 바로 회원가입할 수 있습니다.")}
            </p>
          </div>
        </div>
      </main>
    );
  }

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

            {/* Prefetch Status */}
            {prefetchStatus.done && (
              <div className={styles.prefetchStatus}>
                <span className={styles.prefetchCheck}>✓</span>
                <span>
                  {lang === "ko"
                    ? `${prefetchStatus.graphNodes || 0}개 지식 노드 준비 완료`
                    : `${prefetchStatus.graphNodes || 0} knowledge nodes ready`}
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
    <main className={`${styles.page} ${showChat ? styles.fadeIn : ""}`}>
      {/* Header */}
      <header className={styles.header}>
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

        {/* Header actions - voice is in Chat component */}
        <div className={styles.headerActions} />
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
          // Premium features for returning users
          userContext={userContext}
          chatSessionId={chatSessionId}
          onSaveMessage={handleSaveMessage}
          autoScroll={false}
          // RAG session from /counselor/init prefetch (Jung, graph, corpus)
          ragSessionId={sessionId || undefined}
          autoSendSeed
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
