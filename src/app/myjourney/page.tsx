"use client";

import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./myjourney.module.css";

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
  "destiny-map": "🗺️",
  tarot: "🃏",
  saju: "🔮",
  astrology: "⭐",
  dream: "💭",
  iching: "☯️",
  numerology: "🔢",
  aura: "🌈",
  "daily-fortune": "🌟",
  personality: "🧠",
  compatibility: "💕",
  "destiny-pal": "🤝",
  "destiny-matrix": "🔷",
};

const SERVICE_NAMES: Record<string, string> = {
  "destiny-map": "Destiny Map",
  tarot: "Tarot",
  saju: "Saju",
  astrology: "Astrology",
  dream: "Dream",
  iching: "I Ching",
  numerology: "Numerology",
  aura: "Aura",
  "daily-fortune": "Daily Fortune",
  personality: "Personality",
  compatibility: "Compatibility",
  "destiny-pal": "Destiny Pal",
  "destiny-matrix": "Destiny Matrix",
};

const SERVICE_URLS: Record<string, string> = {
  "destiny-map": "/destiny-map",
  tarot: "/tarot",
  saju: "/saju",
  astrology: "/astrology",
  dream: "/dream",
  iching: "/iching",
  numerology: "/numerology",
  personality: "/personality",
  compatibility: "/compatibility",
  "destiny-pal": "/destiny-pal",
  "destiny-matrix": "/destiny-matrix",
  "daily-fortune": "/myjourney",
  aura: "/aura",
};

export default function MyJourneyClient() {
  return (
    <SessionProvider>
      <Suspense fallback={<LoadingScreen />}>
        <MyJourneyPage />
      </Suspense>
    </SessionProvider>
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const search = useSearchParams();

  const [profile, setProfile] = useState<Profile>({});
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [fortuneLoading, setFortuneLoading] = useState(false);
  const [recentHistory, setRecentHistory] = useState<DailyHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (status !== "authenticated") return;
      const res = await fetch("/api/me/profile", { cache: "no-store" });
      if (!res.ok) return;
      const { user } = await res.json();
      if (!user) return;
      setProfile(user);
    };
    load();
  }, [status]);

  useEffect(() => {
    const loadHistory = async () => {
      if (status !== "authenticated") return;
      setHistoryLoading(true);
      try {
        const res = await fetch("/api/me/history", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          // Get only recent 3 days of history
          setRecentHistory((data.history || []).slice(0, 3));
        }
      } catch (e) {
        console.error("Failed to load history:", e);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [status]);

  useEffect(() => {
    const loadFortune = async () => {
      if (!profile.birthDate || fortune) return;
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
        console.error("Failed to load fortune:", e);
      } finally {
        setFortuneLoading(false);
      }
    };
    loadFortune();
  }, [profile.birthDate, profile.birthTime, fortune]);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
    if (typeof window === "undefined") return;
    if (prevStatus.current !== status && status === "authenticated") {
      const state = history.state || {};
      history.replaceState({ ...state, __fromAuth: true, __entered: true }, "");
    }
    prevStatus.current = status;
  }, [status]);

  const goBack = () => {
    if (typeof window === "undefined") return;
    const state = history.state || {};
    if (state.__fromAuth || window.history.length <= 1) {
      router.replace("/");
    } else {
      router.back();
    }
  };

  if (status === "loading") {
    return <LoadingScreen />;
  }

  return (
    <main className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={goBack}>←</button>
        <h1 className={styles.logo}>My Journey</h1>
        {session && (
          <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: "/myjourney" })}>
            Logout
          </button>
        )}
      </header>

      {!session ? (
        /* ========== NOT LOGGED IN ========== */
        <div className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.loginIcon}>✨</div>
            <h2>Start Your Journey</h2>
            <p>Sign in to save readings and get personalized insights</p>

            <div className={styles.loginButtons}>
              <button
                className={styles.googleBtn}
                onClick={() => signIn("google", { callbackUrl: "/myjourney?from=oauth" })}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>

              {/* Kakao Login - temporarily disabled */}
              {/* <button
                className={styles.kakaoBtn}
                onClick={() => signIn("kakao", { callbackUrl: "/myjourney?from=oauth" })}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#000" d="M12 3C6.5 3 2 6.58 2 11c0 2.88 1.93 5.41 4.82 6.84-.2.74-.76 2.67-.87 3.08-.14.51.18.5.38.37.15-.1 2.44-1.63 3.47-2.32.77.11 1.56.17 2.37.17C17.5 19.14 22 15.56 22 11S17.5 3 12 3z"/>
                </svg>
                Kakao
              </button> */}
            </div>

            <span className={styles.secureNote}>Secure OAuth - No passwords</span>
          </div>
        </div>
      ) : (
        /* ========== LOGGED IN - DASHBOARD ========== */
        <div className={styles.dashboard}>
          {/* User Profile Card */}
          <div className={styles.profileCard}>
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt=""
                width={56}
                height={56}
                className={styles.profileAvatar}
              />
            )}
            <div className={styles.profileInfo}>
              <h2>{session.user?.name || "User"}</h2>
              <p>{session.user?.email}</p>
            </div>
            {/* Fortune Orb */}
            <div className={styles.fortuneOrb}>
              {fortuneLoading ? (
                <div className={styles.orbLoading}></div>
              ) : fortune ? (
                <>
                  <span className={styles.orbScore}>{fortune.overall}</span>
                  <span className={styles.orbLabel}>Today</span>
                </>
              ) : (
                <span className={styles.orbEmpty}>?</span>
              )}
            </div>
          </div>

          {/* 2-Column Grid */}
          <div className={styles.grid}>
            {/* Left Column - Navigation */}
            <div className={styles.column}>
              <Link href="/myjourney/profile" className={styles.menuCard}>
                <span className={styles.menuIcon}>👤</span>
                <div>
                  <h3>My Profile</h3>
                  <p>Birth info & settings</p>
                </div>
              </Link>

              <Link href="/myjourney/circle" className={styles.menuCard}>
                <span className={styles.menuIcon}>👥</span>
                <div>
                  <h3>My Circle</h3>
                  <p>Family, friends, partners</p>
                </div>
              </Link>

              <Link href="/myjourney/history" className={styles.menuCard}>
                <span className={styles.menuIcon}>📜</span>
                <div>
                  <h3>My Destiny</h3>
                  <p>Past readings & insights</p>
                </div>
              </Link>
            </div>

            {/* Right Column - Fortune Details */}
            <div className={styles.column}>
              <div className={styles.fortuneCard}>
                <h3>Today&apos;s Fortune</h3>
                {fortune ? (
                  <>
                    <div className={styles.fortuneGrid}>
                      <div className={styles.fortuneItem}>
                        <span>❤️</span>
                        <span>{fortune.love}</span>
                        <small>Love</small>
                      </div>
                      <div className={styles.fortuneItem}>
                        <span>💼</span>
                        <span>{fortune.career}</span>
                        <small>Career</small>
                      </div>
                      <div className={styles.fortuneItem}>
                        <span>💰</span>
                        <span>{fortune.wealth}</span>
                        <small>Wealth</small>
                      </div>
                      <div className={styles.fortuneItem}>
                        <span>🏥</span>
                        <span>{fortune.health}</span>
                        <small>Health</small>
                      </div>
                    </div>
                    <div className={styles.luckyItems}>
                      <span>🎨 {fortune.luckyColor}</span>
                      <span>🔢 {fortune.luckyNumber}</span>
                    </div>
                    {/* Fortune Alerts */}
                    {fortune.alerts && fortune.alerts.length > 0 && (
                      <div className={styles.fortuneAlerts}>
                        {fortune.alerts.slice(0, 2).map((alert, idx) => (
                          <div
                            key={idx}
                            className={`${styles.alertItem} ${styles[`alert${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}`]}`}
                          >
                            <span>{alert.icon || (alert.type === "warning" ? "⚠️" : alert.type === "positive" ? "✨" : "ℹ️")}</span>
                            <span>{alert.msg}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : !profile.birthDate ? (
                  <div className={styles.fortuneSetup}>
                    <p>Set your birth date first</p>
                    <Link href="/myjourney/profile">Setup Profile →</Link>
                  </div>
                ) : (
                  <div className={styles.fortuneLoading}>
                    <div className={styles.smallSpinner}></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={styles.services}>
            <div className={styles.servicesHeader}>
              <h3>Recent Activity</h3>
              <Link href="/myjourney/history" className={styles.viewAllLink}>
                View All →
              </Link>
            </div>
            {historyLoading ? (
              <div className={styles.historyLoading}>
                <div className={styles.smallSpinner}></div>
              </div>
            ) : recentHistory.length > 0 ? (
              <div className={styles.recentHistory}>
                {recentHistory.map((day) => (
                  <div key={day.date} className={styles.dayGroup}>
                    <div className={styles.dayDate}>{formatDate(day.date)}</div>
                    <div className={styles.dayRecords}>
                      {day.records.slice(0, 4).map((record) => (
                        <Link
                          key={record.id}
                          href={SERVICE_URLS[record.service] || "/myjourney/history"}
                          className={styles.recordItem}
                        >
                          <span className={styles.recordIcon}>
                            {SERVICE_ICONS[record.service] || "📖"}
                          </span>
                          <div className={styles.recordInfo}>
                            <span className={styles.recordService}>
                              {SERVICE_NAMES[record.service] || record.service}
                            </span>
                            {record.theme && (
                              <span className={styles.recordTheme}>{record.theme}</span>
                            )}
                            {record.summary && (
                              <span className={styles.recordSummary}>{record.summary}</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyHistory}>
                <span className={styles.emptyIcon}>📜</span>
                <p>No activity yet</p>
                <p className={styles.emptyHint}>
                  Start using services to track your journey
                </p>
                <div className={styles.quickLinks}>
                  <Link href="/destiny-map" className={styles.quickLink}>🗺️ Destiny Map</Link>
                  <Link href="/tarot" className={styles.quickLink}>🃏 Tarot</Link>
                  <Link href="/saju" className={styles.quickLink}>🔮 Saju</Link>
                  <Link href="/astrology" className={styles.quickLink}>⭐ Astrology</Link>
                  <Link href="/dream" className={styles.quickLink}>💭 Dream</Link>
                  <Link href="/iching" className={styles.quickLink}>☯️ I Ching</Link>
                  <Link href="/personality" className={styles.quickLink}>🧠 Personality</Link>
                  <Link href="/compatibility" className={styles.quickLink}>💕 Compatibility</Link>
                  <Link href="/numerology" className={styles.quickLink}>🔢 Numerology</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
