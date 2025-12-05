"use client";

import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import styles from "./myjourney.module.css";

type Profile = {
  birthDate?: string | null;
  birthTime?: string | null;
  birthCity?: string | null;
  tzId?: string | null;
  gender?: string | null;
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
      <p>Loading your journey...</p>
    </div>
  );
}

async function startCheckout() {
  const res = await fetch("/api/checkout", {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.url) {
    alert(`Checkout error: ${data?.error || res.status}`);
    return;
  }
  window.location.href = data.url;
}

function MyJourneyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const search = useSearchParams();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "U">("U");
  const [city, setCity] = useState("");
  const [tzId, setTzId] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [profile, setProfile] = useState<Profile>({});
  const [showEmailSignup, setShowEmailSignup] = useState(false);

  // Email signup states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignup, setIsSignup] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (status !== "authenticated") return;
      const res = await fetch("/api/me/profile", { cache: "no-store" });
      if (!res.ok) return;
      const { user } = await res.json();
      if (!user) return;
      setProfile(user);
      if (user.birthDate) setBirthDate(user.birthDate);
      if (user.birthTime) setBirthTime(user.birthTime);
      if (user.gender) setGender(user.gender);
      if (user.birthCity) setCity(user.birthCity);
      if (user.tzId) setTzId(user.tzId);
    };
    load();
  }, [status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromQuery = search?.get("from");
    const looksLikeAuthReferrer =
      document.referrer.includes("/api/auth") ||
      document.referrer.includes("accounts.google.com") ||
      document.referrer.includes("appleid.apple.com") ||
      document.referrer.includes("kauth.kakao.com") ||
      document.referrer.includes("open.weixin.qq.com") ||
      document.referrer.includes("facebook.com");
    const cameFromAuth = fromQuery === "oauth" || looksLikeAuthReferrer;
    const state = history.state || {};
    if (!state.__entered) {
      history.replaceState(
        { ...state, __entered: true, __fromAuth: cameFromAuth },
        ""
      );
    }
  }, [search]);

  const prevStatus = useRef(status);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (prevStatus.current !== status && status === "authenticated") {
      const state = history.state || {};
      history.replaceState(
        { ...state, __fromAuth: true, __entered: true },
        ""
      );
    }
    prevStatus.current = status;
  }, [status]);

  const goBackSmart = () => {
    if (typeof window === "undefined") return;
    const state = history.state || {};
    const prev = document.referrer || "";
    const isAuthReferrer =
      prev.includes("/api/auth") ||
      prev.includes("/signin") ||
      prev.includes("accounts.google.com") ||
      prev.includes("appleid.apple.com") ||
      prev.includes("kauth.kakao.com") ||
      prev.includes("open.weixin.qq.com") ||
      prev.includes("facebook.com");
    if (state.__fromAuth || isAuthReferrer || window.history.length <= 1) {
      router.replace("/");
      return;
    }
    const before = location.pathname + location.search + location.hash;
    window.addEventListener(
      "popstate",
      () => {
        const now = location.pathname + location.search + location.hash;
        if (now === before) router.replace("/");
      },
      { once: true }
    );
    router.back();
  };

  const saveBirthInfo = async () => {
    setMsg("");
    if (!session) {
      setMsg("Please sign in first.");
      return;
    }
    if (!birthDate) {
      setMsg("Please select your date of birth.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/user/update-birth-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate,
          birthTime: birthTime || null,
          gender: gender === "U" ? null : gender,
          birthCity: city || null,
          tzId:
            tzId ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Asia/Seoul",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setMsg("✅ Saved successfully!");
      setProfile(data.user);
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error occurred"));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (isSignup) {
      // Sign up
      if (!name || !email || !password || !confirmPassword) {
        setMsg("❌ Please fill in all fields");
        return;
      }
      if (password !== confirmPassword) {
        setMsg("❌ Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setMsg("❌ Password must be at least 6 characters");
        return;
      }

      setBusy(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");

        setMsg("✅ Account created! Signing you in...");
        // Auto sign in after registration
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setMsg("❌ Registration successful, but sign in failed. Please try signing in manually.");
        } else {
          setShowEmailSignup(false);
        }
      } catch (err: any) {
        setMsg("❌ " + (err.message || "Registration failed"));
      } finally {
        setBusy(false);
      }
    } else {
      // Sign in
      if (!email || !password) {
        setMsg("❌ Please enter email and password");
        return;
      }

      setBusy(true);
      try {
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setMsg("❌ Invalid email or password");
        } else {
          setShowEmailSignup(false);
          setMsg("✅ Signed in successfully!");
        }
      } catch (err: any) {
        setMsg("❌ " + (err.message || "Sign in failed"));
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={goBackSmart}
          title="Back"
          aria-label="Go back"
        >
          ←
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>✨ My Journey</h1>
          <p className={styles.subtitle}>
            Track your destiny, save your readings, and unlock personalized insights
          </p>
        </div>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>🔐 Account</h2>
          {status === "authenticated" && session?.user?.image && (
            <Image
              src={session.user.image}
              alt="Profile"
              width={48}
              height={48}
              className={styles.profileImage}
            />
          )}
        </div>

        {status === "loading" ? (
          <div className={styles.loadingState}>
            <div className={styles.smallSpinner}></div>
            <p>Checking session...</p>
          </div>
        ) : session ? (
          <div className={styles.accountInfo}>
            <div className={styles.userInfo}>
              <p className={styles.userName}>
                {session.user?.name ?? session.user?.email}
              </p>
              <span className={styles.badge}>Premium</span>
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.premiumButton} onClick={startCheckout}>
                ⭐ Upgrade to Premium
                <span className={styles.price}>HK$39/mo</span>
              </button>
              <button
                className={styles.outlineButton}
                onClick={() =>
                  signOut({ callbackUrl: "/myjourney?from=oauth" })
                }
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.loginSection}>
            <p className={styles.loginPrompt}>
              Create an account or sign in to save your journey
            </p>

            {!showEmailSignup ? (
              <div className={styles.socialButtons}>
                {/* Google Login */}
                <button
                  className={styles.socialButton}
                  onClick={() =>
                    signIn("google", { callbackUrl: "/myjourney?from=oauth" })
                  }
                >
                  <svg className={styles.socialIcon} viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Kakao Login */}
                <button
                  className={styles.socialButton}
                  onClick={() =>
                    signIn("kakao", { callbackUrl: "/myjourney?from=oauth" })
                  }
                  style={{ background: "#FEE500", color: "#000000" }}
                >
                  <svg className={styles.socialIcon} viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 3C6.5 3 2 6.58 2 11c0 2.88 1.93 5.41 4.82 6.84-.2.74-.76 2.67-.87 3.08-.14.51.18.5.38.37.15-.1 2.44-1.63 3.47-2.32.77.11 1.56.17 2.37.17C17.5 19.14 22 15.56 22 11S17.5 3 12 3z"
                    />
                  </svg>
                  Continue with Kakao
                </button>

                <div className={styles.divider}>
                  <span>or</span>
                </div>

                <button
                  className={styles.emailButton}
                  onClick={() => setShowEmailSignup(true)}
                >
                  📧 Continue with Email
                </button>
              </div>
            ) : (
              <div className={styles.emailForm}>
                <div className={styles.formTabs}>
                  <button
                    className={`${styles.formTab} ${isSignup ? styles.activeTab : ""}`}
                    onClick={() => setIsSignup(true)}
                  >
                    Sign Up
                  </button>
                  <button
                    className={`${styles.formTab} ${!isSignup ? styles.activeTab : ""}`}
                    onClick={() => setIsSignup(false)}
                  >
                    Sign In
                  </button>
                </div>

                <form onSubmit={handleEmailAuth}>
                  {isSignup && (
                    <div className={styles.formGroup}>
                      <label>Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className={styles.input}
                      />
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={styles.input}
                    />
                  </div>

                  {isSignup && (
                    <div className={styles.formGroup}>
                      <label>Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={styles.input}
                      />
                    </div>
                  )}

                  {msg && <p className={styles.message}>{msg}</p>}

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={busy}
                  >
                    {busy ? "Processing..." : isSignup ? "Create Account" : "Sign In"}
                  </button>

                  <button
                    type="button"
                    className={styles.backToSocial}
                    onClick={() => setShowEmailSignup(false)}
                  >
                    ← Back to social login
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      <div className={styles.grid}>
        <DailyFortuneCard session={session} profile={profile} />

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>🎂 Birth Information</h2>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Date of Birth</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Time (optional)</label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Gender (optional)</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "M" | "F" | "U")}
                className={styles.input}
              >
                <option value="U">Unspecified</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>City (optional)</label>
              <input
                type="text"
                placeholder="Seoul, KR"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Time zone (optional)</label>
              <input
                type="text"
                placeholder="Asia/Seoul"
                value={tzId}
                onChange={(e) => setTzId(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.saveSection}>
            <button
              className={styles.saveButton}
              onClick={saveBirthInfo}
              disabled={busy || !birthDate || status !== "authenticated"}
              title={
                status !== "authenticated"
                  ? "Sign in to save"
                  : !birthDate
                  ? "Select your date of birth"
                  : "Save"
              }
            >
              {busy ? "Saving..." : "💾 Save Birth Info"}
            </button>
            {status !== "authenticated" && (
              <span className={styles.hint}>
                Sign in to save your birth data
              </span>
            )}
          </div>

          {msg && <p className={styles.message}>{msg}</p>}
        </section>

        <DestinyPanel profile={profile} />
      </div>
    </main>
  );
}

function useDestiny(profile: Profile, targetDate: string) {
  const result = {
    date: targetDate,
    summary: `Destiny snapshot for ${targetDate}`,
    hints: [
      `Base: ${profile.birthDate ?? "—"} ${profile.birthTime ?? ""} (${
        profile.tzId ?? "local"
      })`,
      `City: ${profile.birthCity ?? "—"}`,
    ],
    score: ((new Date(targetDate).getTime() / 86400000) % 100) | 0,
  };
  return result;
}

function DailyFortuneCard({ session: _session, profile }: { session: any; profile: Profile }) {
  const [loading, setLoading] = useState(false);
  const [fortune, setFortune] = useState<any>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [msg, setMsg] = useState("");

  const getFortune = async () => {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/daily-fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          sendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setFortune(data.fortune);
      setMsg(data.message);
    } catch (error: any) {
      setMsg("❌ " + (error.message || "Failed to get fortune"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>🌟 Today&apos;s Fortune</h2>

      {!fortune ? (
        <div className={styles.fortunePrompt}>
          <p className={styles.fortuneDesc}>
            Get your daily fortune score based on Saju and Astrology (No AI cost!)
          </p>

          <div className={styles.emailCheckbox}>
            <label>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              <span>Send to my email</span>
            </label>
          </div>

          <button
            className={styles.fortuneButton}
            onClick={getFortune}
            disabled={loading || !profile.birthDate}
          >
            {loading ? "Calculating..." : "🔮 Get Today&apos;s Fortune"}
          </button>

          {msg && <p className={styles.message}>{msg}</p>}
        </div>
      ) : (
        <div className={styles.fortuneResult}>
          <div className={styles.overallScore}>
            <div className={styles.scoreNumber}>{fortune.overall}</div>
            <div className={styles.scoreLabel}>Overall Score</div>
          </div>

          <div className={styles.scoreGrid}>
            <div className={styles.scoreItem}>
              <span className={styles.scoreIcon}>❤️</span>
              <span className={styles.scoreName}>Love</span>
              <span className={styles.scoreValue}>{fortune.love}</span>
            </div>
            <div className={styles.scoreItem}>
              <span className={styles.scoreIcon}>💼</span>
              <span className={styles.scoreName}>Career</span>
              <span className={styles.scoreValue}>{fortune.career}</span>
            </div>
            <div className={styles.scoreItem}>
              <span className={styles.scoreIcon}>💰</span>
              <span className={styles.scoreName}>Wealth</span>
              <span className={styles.scoreValue}>{fortune.wealth}</span>
            </div>
            <div className={styles.scoreItem}>
              <span className={styles.scoreIcon}>🏥</span>
              <span className={styles.scoreName}>Health</span>
              <span className={styles.scoreValue}>{fortune.health}</span>
            </div>
          </div>

          <div className={styles.luckyInfo}>
            <div className={styles.luckyItem}>
              🎨 Lucky Color: <strong>{fortune.luckyColor}</strong>
            </div>
            <div className={styles.luckyItem}>
              🔢 Lucky Number: <strong>{fortune.luckyNumber}</strong>
            </div>
          </div>

          <button
            className={styles.refreshButton}
            onClick={() => setFortune(null)}
          >
            🔄 Calculate Again
          </button>

          {msg && <p className={styles.message}>{msg}</p>}
        </div>
      )}
    </section>
  );
}

function DestinyPanel({ profile }: { profile: Profile }) {
  const [targetDate, setTargetDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const destiny = useDestiny(profile, targetDate);

  const saveSnapshot = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/destiny/save-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDate, data: { ...destiny, note } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save snapshot");
      alert("✅ Saved for " + targetDate);
    } catch (e: any) {
      alert("❌ " + (e?.message || "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>🗺️ Destiny Map</h2>

      <div className={styles.destinyContent}>
        <div className={styles.formGroup}>
          <label>Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.destinyCard}>
          <div className={styles.destinyHeader}>{destiny.summary}</div>
          <ul className={styles.destinyList}>
            {destiny.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          <div className={styles.destinyScore}>
            ✨ Fortune score: <strong>{destiny.score}</strong>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={styles.textarea}
            placeholder="Add your note for this date..."
          />
        </div>

        <button
          className={styles.saveButton}
          onClick={saveSnapshot}
          disabled={saving}
        >
          {saving ? "Saving..." : "💾 Save Today&apos;s Destiny Map"}
        </button>
      </div>
    </section>
  );
}
