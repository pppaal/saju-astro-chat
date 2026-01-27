"use client";

import { useSession, signOut } from "next-auth/react";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./myjourney.module.css";
import { logger } from "@/lib/logger";
import { useI18n } from "@/i18n/I18nProvider";
import { buildSignInUrl } from "@/lib/auth/signInUrl";


type Profile = {
  birthDate?: string | null;
  birthTime?: string | null;
  birthCity?: string | null;
  tzId?: string | null;
  gender?: string | null;
};

type FortuneAlert = {
  type: "warning" | "positive" | "info";
  msg: string;
  icon?: string;
};

type Fortune = {
  overall: number;
  love: number;
  career: number;
  wealth: number;
  health: number;
  luckyColor: string;
  luckyNumber: number;
  alerts?: FortuneAlert[];
  source?: string;
};

type ServiceRecord = {
  id: string;
  date: string;
  service: string;
  theme?: string;
  summary?: string;
  type: string;
};

type DailyHistory = {
  date: string;
  records: ServiceRecord[];
};

const SERVICE_ICONS: Record<string, string> = {
  // kebab-case versions
  "destiny-map": "🗺️",
  "destiny-calendar": "📅",
  "daily-fortune": "🌟",
  "destiny-pal": "🤝",
  "destiny-matrix": "🔷",
  "personality-icp": "🎭",
  "personality-compatibility": "💕",
  "life-prediction": "📈",
  "life-prediction-timing": "⏰",
  // camelCase versions (for backward compatibility)
  "destinyMap": "🗺️",
  "destinyCalendar": "📅",
  "dailyFortune": "🌟",
  "destinyPal": "🤝",
  "destinyMatrix": "🔷",
  // single word services
  tarot: "🃏",
  saju: "🔮",
  astrology: "⭐",
  dream: "💭",
  iching: "☯️",
  numerology: "🔢",
  aura: "🌈",
  personality: "🧠",
  compatibility: "💕",
  icp: "🎭",
};

const SERVICE_NAME_KEYS: Record<string, string> = {
  // kebab-case versions
  "destiny-map": "myjourney.services.destinyMap",
  "destiny-calendar": "myjourney.services.destinyCalendar",
  "daily-fortune": "myjourney.services.dailyFortune",
  "destiny-pal": "myjourney.services.destinyPal",
  "destiny-matrix": "myjourney.services.destinyMatrix",
  "personality-icp": "myjourney.services.icp",
  "personality-compatibility": "myjourney.services.personalityCompatibility",
  "life-prediction": "myjourney.services.lifePrediction",
  "life-prediction-timing": "myjourney.services.lifePredictionTiming",
  // camelCase versions (for backward compatibility)
  "destinyMap": "myjourney.services.destinyMap",
  "destinyCalendar": "myjourney.services.destinyCalendar",
  "dailyFortune": "myjourney.services.dailyFortune",
  "destinyPal": "myjourney.services.destinyPal",
  "destinyMatrix": "myjourney.services.destinyMatrix",
  // single word services
  tarot: "myjourney.services.tarot",
  saju: "myjourney.services.saju",
  astrology: "myjourney.services.astrology",
  dream: "myjourney.services.dream",
  iching: "myjourney.services.iching",
  numerology: "myjourney.services.numerology",
  aura: "myjourney.services.aura",
  personality: "myjourney.services.personality",
  compatibility: "myjourney.services.compatibility",
  icp: "myjourney.services.icp",
};

const _SERVICE_URLS: Record<string, string> = {
  // kebab-case versions
  "destiny-map": "/destiny-map",
  "destiny-calendar": "/calendar",
  "daily-fortune": "/myjourney",
  "destiny-pal": "/destiny-pal",
  "destiny-matrix": "/destiny-matrix",
  "personality-icp": "/icp/result",
  "personality-compatibility": "/personality/compatibility",
  "life-prediction": "/life-prediction",
  "life-prediction-timing": "/life-prediction",
  // camelCase versions (for backward compatibility)
  "destinyMap": "/destiny-map",
  "destinyCalendar": "/calendar",
  "dailyFortune": "/myjourney",
  "destinyPal": "/destiny-pal",
  "destinyMatrix": "/destiny-matrix",
  // single word services
  tarot: "/tarot",
  saju: "/saju",
  astrology: "/astrology",
  dream: "/dream",
  iching: "/iching",
  numerology: "/numerology",
  personality: "/personality",
  compatibility: "/compatibility",
  aura: "/aura",
  icp: "/icp",
};

export default function MyJourneyClient() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MyJourneyPage />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.spinner}></div>
    </div>
  );
}

function MyJourneyPage() {
  const { t, locale } = useI18n();
  const { data: session, status } = useSession();
  const router = useRouter();
  const search = useSearchParams();
  const signInUrl = buildSignInUrl("/myjourney?from=oauth");

  const [profile, setProfile] = useState<Profile>({});
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [fortuneLoading, setFortuneLoading] = useState(false);
  const [recentHistory, setRecentHistory] = useState<DailyHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [credits, setCredits] = useState<{ remaining: number; total: number; plan: string } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadInitialData = useCallback(async () => {
    if (status !== "authenticated") {
      setInitialLoading(false);
      return;
    }

    try {
      const [profileRes, creditsRes] = await Promise.all([
        fetch("/api/me/profile", { cache: "no-store" }),
        fetch("/api/me/credits", { cache: "no-store" })
      ]);

      if (profileRes.ok) {
        const { user } = await profileRes.json();
        if (user) {setProfile(user);}
      }

      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits({
          remaining: data.credits?.remaining ?? 0,
          total: data.credits?.monthly ?? 0,
          plan: data.plan || 'free'
        });
      }
    } catch (e) {
      logger.error("Failed to load initial data:", e);
    } finally {
      setInitialLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadHistory = useCallback(async () => {
    if (status !== "authenticated") {return;}
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/me/history", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRecentHistory((data.history || []).slice(0, 2));
      }
    } catch (e) {
      logger.error("Failed to load history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadFortune = useCallback(async () => {
    if (!profile.birthDate || fortune) {return;}
    setFortuneLoading(true);
    try {
      const res = await fetch("/api/daily-fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFortune(data.fortune);
      }
    } catch (e) {
      logger.error("Failed to load fortune:", e);
    } finally {
      setFortuneLoading(false);
    }
  }, [profile.birthDate, profile.birthTime, fortune]);

  useEffect(() => {
    loadFortune();
  }, [loadFortune]);

  useEffect(() => {
    if (typeof window === "undefined") {return;}
    const fromQuery = search?.get("from");
    const looksLikeAuthReferrer =
      document.referrer.includes("/api/auth") ||
      document.referrer.includes("accounts.google.com") ||
      document.referrer.includes("kauth.kakao.com");
    const cameFromAuth = fromQuery === "oauth" || looksLikeAuthReferrer;
    const state = history.state || {};
    if (!state.__entered) {
      history.replaceState({ ...state, __entered: true, __fromAuth: cameFromAuth }, "");
    }
  }, [search]);

  const prevStatus = useRef(status);
  useEffect(() => {
    if (typeof window === "undefined") {return;}
    if (prevStatus.current !== status && status === "authenticated") {
      const state = history.state || {};
      history.replaceState({ ...state, __fromAuth: true, __entered: true }, "");
    }
    prevStatus.current = status;
  }, [status]);

  const goBack = useCallback(() => {
    if (typeof window === "undefined") {return;}
    const state = history.state || {};
    if (state.__fromAuth || window.history.length <= 1) {
      router.replace("/");
    } else {
      router.back();
    }
  }, [router]);

  const handleLogout = useCallback(() => signOut({ callbackUrl: "/myjourney" }), []);

  const handleCreditsClick = useCallback(() => router.push('/pricing'), [router]);

  const toggleDayExpanded = useCallback((date: string) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(signInUrl);
    }
  }, [status, router, signInUrl]);

  if (status === "loading" || status === "unauthenticated" || (status === "authenticated" && initialLoading)) {
    return <LoadingScreen />;
  }

  return (
    <main className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={goBack}>←</button>
        <h1 className={styles.logo}>{t("myjourney.title", "My Journey")}</h1>
        {session && (
          <button className={styles.logoutBtn} onClick={handleLogout}>
            {t("myjourney.logout", "Logout")}
          </button>
        )}
      </header>

        {/* ========== LOGGED IN - DASHBOARD ========== */}
        <div className={styles.dashboard}>
          {/* Unified Profile + Credits + Fortune Header */}
          <div className={styles.profileCard}>
            <div className={styles.profileLeft}>
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={48}
                  height={48}
                  className={styles.profileAvatar}
                />
              ) : (
                <div className={styles.profileAvatarPlaceholder}>
                  {(session?.user?.name || "U")[0].toUpperCase()}
                </div>
              )}
              <div className={styles.profileInfo}>
                <h2>{session?.user?.name || "User"}</h2>
                {credits && (
                  <div className={styles.membershipRow}>
                    <div className={`${styles.planBadge} ${styles[`plan${credits.plan.charAt(0).toUpperCase() + credits.plan.slice(1)}`]}`}>
                      <span className={styles.planIcon}>
                        {credits.plan === 'free' ? '🆓' : credits.plan === 'starter' ? '⭐' : credits.plan === 'pro' ? '💎' : '👑'}
                      </span>
                      <span className={styles.planName}>{t(`myjourney.plan.${credits.plan}`, credits.plan.toUpperCase())}</span>
                    </div>
                    <div
                      className={styles.creditsBadge}
                      onClick={handleCreditsClick}
                    >
                      <span className={styles.creditsCount}>{credits.remaining}</span>
                      <span className={styles.creditsLabel}>{t("myjourney.credits.short", "credits")}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Fortune Orb */}
            <div className={styles.fortuneOrb}>
              {fortuneLoading ? (
                <div className={styles.orbLoading}></div>
              ) : fortune ? (
                <>
                  <span className={styles.orbScore}>{fortune.overall}</span>
                  <span className={styles.orbLabel}>{t("myjourney.fortune.today", "Today")}</span>
                </>
              ) : (
                <span className={styles.orbEmpty}>?</span>
              )}
            </div>
          </div>

          {/* Today's Fortune Card */}
          <div className={styles.fortuneCard}>
            <h3>{t("myjourney.fortune.title", "Today's Fortune")}</h3>
            {fortune ? (
              <div className={styles.fortuneGrid}>
                <div className={styles.fortuneItem}>
                  <span className={styles.fortuneEmoji}>❤️</span>
                  <span className={styles.fortuneScore}>{fortune.love}</span>
                  <small>{t("myjourney.fortune.love", "Love")}</small>
                </div>
                <div className={styles.fortuneItem}>
                  <span className={styles.fortuneEmoji}>💼</span>
                  <span className={styles.fortuneScore}>{fortune.career}</span>
                  <small>{t("myjourney.fortune.career", "Career")}</small>
                </div>
                <div className={styles.fortuneItem}>
                  <span className={styles.fortuneEmoji}>💰</span>
                  <span className={styles.fortuneScore}>{fortune.wealth}</span>
                  <small>{t("myjourney.fortune.wealth", "Wealth")}</small>
                </div>
                <div className={styles.fortuneItem}>
                  <span className={styles.fortuneEmoji}>🏥</span>
                  <span className={styles.fortuneScore}>{fortune.health}</span>
                  <small>{t("myjourney.fortune.health", "Health")}</small>
                </div>
              </div>
            ) : !profile.birthDate ? (
              <div className={styles.fortuneSetup}>
                <p>{t("myjourney.fortune.setup", "Set your birth date first")}</p>
                <Link href="/myjourney/profile">{t("myjourney.fortune.setupLink", "Setup Profile")}</Link>
              </div>
            ) : (
              <div className={styles.fortuneLoading}>
                <div className={styles.smallSpinner}></div>
              </div>
            )}
          </div>

          {/* Quick Menu Grid */}
          <div className={styles.quickMenu}>
            <Link href="/myjourney/profile" className={styles.quickMenuItem}>
              <span className={styles.quickMenuIcon}>👤</span>
              <span>{t("myjourney.menu.profile", "Profile")}</span>
            </Link>
            <Link href="/myjourney/circle" className={styles.quickMenuItem}>
              <span className={styles.quickMenuIcon}>👥</span>
              <span>{t("myjourney.menu.circle", "Circle")}</span>
            </Link>
            <Link href="/myjourney/history" className={styles.quickMenuItem}>
              <span className={styles.quickMenuIcon}>📜</span>
              <span>{t("myjourney.menu.history", "History")}</span>
            </Link>
            <Link href="/pricing" className={styles.quickMenuItem}>
              <span className={styles.quickMenuIcon}>✨</span>
              <span>{t("myjourney.menu.upgrade", "Upgrade")}</span>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className={styles.services}>
            <div className={styles.servicesHeader}>
              <h3>{t("myjourney.activity.title", "Recent Activity")}</h3>
              <Link href="/myjourney/history" className={styles.viewAllLink}>
                {t("myjourney.activity.viewAll", "View All →")}
              </Link>
            </div>
            {historyLoading ? (
              <div className={styles.historyLoading}>
                <div className={styles.smallSpinner}></div>
              </div>
            ) : recentHistory.length > 0 ? (
              <div className={styles.recentHistory}>
                {recentHistory.map((day) => {
                  const isExpanded = expandedDays[day.date];
                  const visibleRecords = isExpanded ? day.records : day.records.slice(0, 3);
                  const hasMore = day.records.length > 3;

                  return (
                    <div key={day.date} className={styles.dayGroup}>
                      <div className={styles.dayDate}>{formatDate(day.date, t, locale)}</div>
                      <div className={styles.dayTags}>
                        {visibleRecords.map((record) => {
                          // Get service name with proper formatting
                          let serviceName: string;
                          const i18nKey = SERVICE_NAME_KEYS[record.service];

                          if (i18nKey) {
                            serviceName = t(i18nKey);
                            // If translation failed and returned the key itself, use fallback
                            if (serviceName === i18nKey || serviceName.includes('.')) {
                              serviceName = record.service
                                .replace(/([A-Z])/g, ' $1')
                                .split(/[-\s]/)
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')
                                .trim();
                            }
                          } else {
                            // Convert camelCase or kebab-case to Title Case
                            serviceName = record.service
                              .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                              .split(/[-\s]/) // Split by dash or space
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                              .join(' ')
                              .trim();
                          }

                          return (
                            <div
                              key={record.id}
                              className={styles.serviceTag}
                              style={{ cursor: 'default' }}
                            >
                              <span className={styles.tagIcon}>{SERVICE_ICONS[record.service] || "📖"}</span>
                              <span className={styles.tagName}>{serviceName}</span>
                            </div>
                          );
                        })}
                      </div>
                      {hasMore && (
                        <button
                          className={styles.showMoreBtn}
                          onClick={() => toggleDayExpanded(day.date)}
                        >
                          {isExpanded ? t("myjourney.activity.showLess", "Show Less") : `${t("myjourney.activity.showMore", "Show More")} (+${day.records.length - 3})`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyHistory}>
                <p className={styles.emptyHint}>{t("myjourney.activity.empty")}</p>
              </div>
            )}
          </div>
        </div>
    </main>
  );
}

function formatDate(dateStr: string, t: (key: string) => string, locale: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return t("myjourney.activity.today");
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return t("myjourney.activity.yesterday");
  }

  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
