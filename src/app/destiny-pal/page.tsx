"use client";

import { SessionProvider, useSession, signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./destiny-pal.module.css";
import { useI18n } from "@/i18n/I18nProvider";

type ReferralStats = {
  referralCode: string;
  referralUrl: string;
  stats: {
    total: number;
    completed: number;
    pending: number;
    creditsEarned: number;
  };
  referrals: Array<{
    id: string;
    name: string;
    joinedAt: string;
    hasAnalysis: boolean;
  }>;
};

export default function DestinyPalPage() {
  return (
    <SessionProvider>
      <Suspense fallback={<LoadingScreen />}>
        <DestinyPalContent />
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

function DestinyPalContent() {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const refCode = searchParams?.get("ref") ?? null;

  // Check if referred user (show welcome message)
  useEffect(() => {
    if (refCode) {
      fetch(`/api/referral/validate?code=${refCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setReferrerName(data.referrerName);
            // Store ref code for registration
            sessionStorage.setItem("referralCode", refCode);
          }
        })
        .catch(console.error);
    }
  }, [refCode]);

  // Load referral data for logged-in users & link referrer if needed
  useEffect(() => {
    if (status === "authenticated") {
      // Check if there's a stored referral code to link
      const storedRefCode = sessionStorage.getItem("referralCode");
      if (storedRefCode) {
        fetch("/api/referral/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode: storedRefCode }),
        })
          .then((res) => res.json())
          .then((result) => {
            if (result.linked) {
              sessionStorage.removeItem("referralCode");
            }
          })
          .catch(console.error);
      }

      // Load user's referral stats
      fetch("/api/referral/me")
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareMessage = t(
    "destinyPal.shareMessage",
    "Check out DestinyPal - AI Fortune Reading! Use my link for bonus credits:"
  );

  const shareKakao = () => {
    if (!data) return;
    const kakaoLink = `https://story.kakao.com/share?url=${encodeURIComponent(data.referralUrl)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(kakaoLink, "_blank", "width=600,height=400");
  };

  const shareWhatsApp = () => {
    if (!data) return;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareMessage + " " + data.referralUrl)}`;
    window.open(whatsappLink, "_blank");
  };

  const shareTwitter = () => {
    if (!data) return;
    const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(data.referralUrl)}`;
    window.open(twitterLink, "_blank", "width=600,height=400");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/">
          <button className={styles.backBtn} aria-label="Back">
            <span>←</span>
          </button>
        </Link>
        <h1 className={styles.logo}>Destiny Pal</h1>
      </header>

      <main className={styles.main}>
        {/* Welcome banner for referred users */}
        {referrerName && status === "unauthenticated" && (
          <div className={styles.welcomeBanner}>
            <p className={styles.welcomeText}>
              {t("destinyPal.welcomeFrom", "Welcome! {{name}} invited you to DestinyPal").replace("{{name}}", referrerName)}
            </p>
            <span className={styles.welcomeBonus}>
              +5 {t("destinyPal.bonusCredits", "bonus credits on first analysis")}
            </span>
          </div>
        )}

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroIcon}>🤝</div>
          <h2 className={styles.heroTitle}>
            {t("destinyPal.title", "Invite Friends, Earn Credits")}
          </h2>
          <p className={styles.heroSubtitle}>
            {t("destinyPal.subtitle", "Get 5 credits for each friend who completes their first analysis")}
          </p>
        </section>

        {status === "loading" || loading ? (
          <LoadingScreen />
        ) : status === "authenticated" && data ? (
          <>
            {/* Referral Code Card */}
            <div className={styles.codeCard}>
              <div className={styles.codeLabel}>
                <span>🎟️</span>
                {t("destinyPal.yourCode", "Your Referral Code")}
              </div>
              <div className={styles.codeDisplay}>
                <span className={styles.code}>{data.referralCode}</span>
                <button
                  className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
                  onClick={() => copyToClipboard(data.referralCode)}
                >
                  {copied ? "✓" : "📋"} {copied ? t("destinyPal.copied", "Copied!") : t("destinyPal.copy", "Copy")}
                </button>
              </div>
              <div className={styles.urlDisplay}>
                <span className={styles.urlText}>{data.referralUrl}</span>
                <button
                  className={styles.copyBtn}
                  onClick={() => copyToClipboard(data.referralUrl)}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.75rem" }}
                >
                  📋
                </button>
              </div>

              {/* Share Buttons */}
              <div className={styles.shareSection}>
                <div className={styles.shareLabel}>
                  {t("destinyPal.shareVia", "Share via")}
                </div>
                <div className={styles.shareButtons}>
                  <button className={`${styles.shareBtn} ${styles.kakao}`} onClick={shareKakao}>
                    <span className={styles.shareIcon}>💬</span>
                    KakaoTalk
                  </button>
                  <button className={`${styles.shareBtn} ${styles.whatsapp}`} onClick={shareWhatsApp}>
                    <span className={styles.shareIcon}>📱</span>
                    WhatsApp
                  </button>
                  <button className={`${styles.shareBtn} ${styles.twitter}`} onClick={shareTwitter}>
                    <span className={styles.shareIcon}>🐦</span>
                    Twitter
                  </button>
                  <button
                    className={`${styles.shareBtn} ${styles.link}`}
                    onClick={() => copyToClipboard(data.referralUrl)}
                  >
                    <span className={styles.shareIcon}>🔗</span>
                    {t("destinyPal.copyLink", "Copy Link")}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <section className={styles.statsSection}>
              <h3 className={styles.sectionTitle}>
                <span>📊</span> {t("destinyPal.yourStats", "Your Stats")}
              </h3>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{data.stats.total}</div>
                  <div className={styles.statLabel}>{t("destinyPal.totalInvites", "Total Invites")}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{data.stats.completed}</div>
                  <div className={styles.statLabel}>{t("destinyPal.completed", "Completed")}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{data.stats.pending}</div>
                  <div className={styles.statLabel}>{t("destinyPal.pending", "Pending")}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{data.stats.creditsEarned}</div>
                  <div className={styles.statLabel}>{t("destinyPal.creditsEarned", "Credits Earned")}</div>
                </div>
              </div>
            </section>

            {/* Referrals List */}
            <section className={styles.referralsSection}>
              <h3 className={styles.sectionTitle}>
                <span>👥</span> {t("destinyPal.invitedFriends", "Invited Friends")}
              </h3>
              {data.referrals.length > 0 ? (
                <div className={styles.referralsList}>
                  {data.referrals.map((referral) => (
                    <div key={referral.id} className={styles.referralItem}>
                      <div className={styles.referralAvatar}>
                        {referral.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.referralInfo}>
                        <div className={styles.referralName}>{referral.name}</div>
                        <div className={styles.referralDate}>{formatDate(referral.joinedAt)}</div>
                      </div>
                      <span
                        className={`${styles.referralStatus} ${
                          referral.hasAnalysis ? styles.completed : styles.pending
                        }`}
                      >
                        {referral.hasAnalysis
                          ? t("destinyPal.statusCompleted", "+5 Credits")
                          : t("destinyPal.statusPending", "Pending")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>👋</div>
                  <p>{t("destinyPal.noInvitesYet", "No invites yet. Share your link to start earning!")}</p>
                </div>
              )}
            </section>
          </>
        ) : (
          /* Login Prompt */
          <div className={styles.loginPrompt}>
            <div className={styles.loginIcon}>🔮</div>
            <h3 className={styles.loginTitle}>
              {t("destinyPal.loginTitle", "Join the Program")}
            </h3>
            <p className={styles.loginSubtitle}>
              {t("destinyPal.loginSubtitle", "Sign in to get your unique referral code and start earning credits")}
            </p>
            <button className={styles.loginBtn} onClick={() => signIn()}>
              {t("destinyPal.signIn", "Sign In")}
            </button>
          </div>
        )}

        {/* How It Works */}
        <section className={styles.howItWorks}>
          <h3 className={styles.sectionTitle}>
            <span>💡</span> {t("destinyPal.howItWorks", "How It Works")}
          </h3>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h4>{t("destinyPal.step1Title", "Share Your Link")}</h4>
                <p>{t("destinyPal.step1Desc", "Copy your unique referral link and share it with friends")}</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h4>{t("destinyPal.step2Title", "Friend Signs Up")}</h4>
                <p>{t("destinyPal.step2Desc", "Your friend creates an account using your link")}</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h4>{t("destinyPal.step3Title", "Complete First Analysis")}</h4>
                <p>{t("destinyPal.step3Desc", "When they finish their first destiny reading, you both win!")}</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h4>{t("destinyPal.step4Title", "Earn Credits")}</h4>
                <p>{t("destinyPal.step4Desc", "You get 5 bonus credits instantly added to your account")}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
