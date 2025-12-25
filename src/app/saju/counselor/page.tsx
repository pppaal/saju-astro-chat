"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import SajuChat from "@/components/saju/SajuChat";
import { useI18n } from "@/i18n/I18nProvider";
import { calculateSajuData } from "@/lib/Saju/saju";
import CreditBadge from "@/components/ui/CreditBadge";
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

type Lang = "ko" | "en";
type SajuData = Record<string, unknown>;

type PrefetchResponse = {
  status?: string;
  session_id?: string;
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

export default function SajuCounselorPage({
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
  const [sajuData, setSajuData] = useState<SajuData | null>(null);
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

  const loadingMessages = [
    t("saju.counselor.loading1", "사주 상담사와 연결 중..."),
    t("saju.counselor.loading2", "사주 명식을 분석하는 중..."),
    t("saju.counselor.loading3", "대운과 세운을 읽는 중..."),
    t("saju.counselor.loading4", "맞춤 상담을 준비하는 중..."),
  ];

  // Load pre-computed saju data from sessionStorage OR compute fresh
  useEffect(() => {
    if (!isAuthed) return;
    if (!birthDate || !birthTime) return;

    let saju: SajuData | null = null;

    try {
      const stored = sessionStorage.getItem("sajuCounselorData");
      if (stored) {
        const data = JSON.parse(stored);
        // Only use if data is fresh (within 1 hour)
        if (data.timestamp && Date.now() - data.timestamp < 3600000) {
          saju = data.saju;
        }
      }
    } catch (e: unknown) {
      console.warn("[SajuCounselorPage] Failed to load saju data:", e);
    }

    // If no cached saju data, compute fresh from birth info
    if (!saju || !saju.dayMaster) {
      try {
        console.warn("[SajuCounselorPage] Computing fresh saju data...");
        const genderVal = (gender === "Male" || gender === "male") ? "male" : "female";
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
        const computed = calculateSajuData(birthDate, birthTime, genderVal, "solar", userTz);
        saju = computed as SajuData;
        // Save to sessionStorage for future use
        sessionStorage.setItem("sajuCounselorData", JSON.stringify({
          saju: computed,
          timestamp: Date.now(),
        }));
        console.warn("[SajuCounselorPage] Fresh saju computed:", {
          dayMaster: computed.dayMaster?.heavenlyStem,
          yearPillar: computed.yearPillar?.heavenlyStem,
        });
      } catch (e: unknown) {
        console.warn("[SajuCounselorPage] Failed to compute saju:", e);
      }
    }

    setSajuData(saju);

    // Prefetch RAG data in background (saju-only)
    if (saju) {
      const prefetchRAG = async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";
          const res = await fetch(`${backendUrl}/saju/counselor/init`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ saju, theme }),
          });
          if (res.ok) {
            const data = (await res.json()) as PrefetchResponse;
            if (data.status === "success") {
              if (data.session_id) {
                setSessionId(data.session_id);
              }
              setPrefetchStatus({
                done: true,
                timeMs: typeof data.prefetch_time_ms === "number" ? data.prefetch_time_ms : undefined,
                graphNodes: data.data_summary?.graph_nodes,
              });
              console.warn(`[SajuCounselor] RAG prefetch done: ${data.prefetch_time_ms ?? 0}ms`);
            }
          }
        } catch (e: unknown) {
          console.warn("[SajuCounselorPage] RAG prefetch failed:", e);
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
        const res = await fetch(`/api/counselor/chat-history?theme=${theme}&type=saju&limit=3`);
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
            console.warn("[SajuCounselor] User context loaded:", {
              isReturningUser: data.isReturningUser,
              sessionCount: context.persona?.sessionCount,
              recentSessions: context.recentSessions?.length || 0,
            });
          }
        }
      } catch (e: unknown) {
        console.warn("[SajuCounselor] No user context available (guest user)");
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
            type: "saju",
            locale: lang,
            userMessage,
            assistantMessage,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && !chatSessionId) {
            setChatSessionId(data.session.id);
            console.warn("[SajuCounselor] New chat session created:", data.session.id);
          }
        }
      } catch (e: unknown) {
        console.warn("[SajuCounselor] Failed to save message:", e);
      }
    },
    [chatSessionId, theme, lang]
  );

  // Loading animation
  useEffect(() => {
    if (!isAuthed) return;

    if (!birthDate || !birthTime) {
      router.push("/saju");
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
  }, [birthDate, birthTime, router, loadingMessages.length, prefetchStatus.done, isAuthed]);

  const handleLogin = useCallback(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    signIn(undefined, { callbackUrl: `/saju/counselor${search}` });
  }, []);

  if (isCheckingAuth) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>
            <h2 className={styles.counselorTitle}>
              {t("saju.counselor.title", "사주 상담사")}
            </h2>
            <p className={styles.loadingMessage}>
              {t("saju.counselor.authChecking", "로그인 상태를 확인하는 중입니다...")}
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
            <div className={styles.authIcon}>&#9776;</div>
            <h1 className={styles.authTitle}>
              {t("saju.counselor.loginRequiredTitle", "사주 상담은 로그인 후 이용할 수 있어요")}
            </h1>
            <p className={styles.authDesc}>
              {t("saju.counselor.loginRequiredDesc", "맞춤형 사주 상담과 이전 대화 기록을 불러오려면 로그인해주세요.")}
            </p>
            <button type="button" className={styles.loginButton} onClick={handleLogin}>
              {t("saju.counselor.loginCta", "로그인하고 시작하기")}
            </button>
            <p className={styles.loginHint}>
              {t("saju.counselor.loginHint", "계정이 없으면 로그인 과정에서 바로 회원가입할 수 있습니다.")}
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
              <span className={styles.avatarEmoji}>&#9776;</span>
            </div>
            <div className={styles.orbits}>
              <div className={styles.orbit1}>
                <span>&#x6728;</span>
              </div>
              <div className={styles.orbit2}>
                <span>&#x706B;</span>
              </div>
              <div className={styles.orbit3}>
                <span>&#x6C34;</span>
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className={styles.loadingText}>
            <h2 className={styles.counselorTitle}>
              {t("saju.counselor.title", "사주 상담사")}
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
                    ? `${prefetchStatus.graphNodes || 0}개 사주 지식 노드 준비 완료`
                    : `${prefetchStatus.graphNodes || 0} saju knowledge nodes ready`}
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
            <span className={styles.counselorAvatar}>&#9776;</span>
            <div>
              <h1 className={styles.headerTitle}>
                {t("saju.counselor.title", "사주 상담사")}
              </h1>
              <span className={styles.onlineStatus}>
                <span className={styles.onlineDot} />
                {t("saju.counselor.online", "Online")}
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
        <SajuChat
          profile={{
            name,
            birthDate,
            birthTime,
            city,
            gender,
          }}
          lang={lang}
          theme={theme}
          initialContext={initialQuestion ? `User's initial question: ${initialQuestion}` : ""}
          seedEvent="saju-counselor:seed"
          saju={sajuData}
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
  );
}

// Component to auto-send initial question
function InitialQuestionSender({ question }: { question: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("saju-counselor:seed", { detail: question }));
    }, 500);
    return () => clearTimeout(timer);
  }, [question]);

  return null;
}
