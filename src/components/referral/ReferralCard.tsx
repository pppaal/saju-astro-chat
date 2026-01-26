"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./ReferralCard.module.css";
import { logger } from '@/lib/logger';

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  pendingRewards: number;
  completedRewards: number;
  totalCreditsEarned: number;
}

export default function ReferralCard() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchReferralStats();
    }
  }, [session]);

  const fetchReferralStats = async () => {
    try {
      const response = await fetch("/api/referral/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      logger.error("Failed to fetch referral stats:", { error: error });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!stats?.referralCode) {return;}

    const referralLink = `${window.location.origin}?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (!stats?.referralCode) {return;}

    const referralLink = `${window.location.origin}?ref=${stats.referralCode}`;
    const shareText = t("referral.shareText");

    if (navigator.share) {
      try {
        await navigator.share({
          title: "DestinyPal - 무료 운세 보기",
          text: shareText,
          url: referralLink,
        });
      } catch (err) {
        // User cancelled, do nothing
      }
    } else {
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.icon}>🎁</div>
        <div>
          <h3 className={styles.title}>{t("referral.title")}</h3>
          <p className={styles.subtitle}>{t("referral.subtitle")}</p>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{stats.totalReferrals}</div>
          <div className={styles.statLabel}>{t("referral.totalReferrals")}</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <div className={styles.statValue}>{stats.totalCreditsEarned}</div>
          <div className={styles.statLabel}>{t("referral.creditsEarned")}</div>
        </div>
      </div>

      <div className={styles.rewards}>
        <div className={styles.rewardBadge}>
          <span className={styles.rewardEmoji}>✨</span>
          <span>{t("referral.reward")}</span>
        </div>
      </div>

      <div className={styles.linkSection}>
        <div className={styles.linkContainer}>
          <input
            type="text"
            value={`${window.location.origin}?ref=${stats.referralCode}`}
            readOnly
            className={styles.linkInput}
          />
          <button className={styles.copyButton} onClick={copyReferralLink}>
            {copied ? (
              <>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("referral.copied")}
              </>
            ) : (
              <>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
                  <rect
                    x="9"
                    y="9"
                    width="13"
                    height="13"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                {t("referral.copy")}
              </>
            )}
          </button>
        </div>

        <button className={styles.shareButton} onClick={shareReferral}>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
            <path
              d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08259 9.19746C7.54305 8.46034 6.71034 8 5.77778 8C4.24446 8 3 9.34315 3 11C3 12.6569 4.24446 14 5.77778 14C6.71034 14 7.54305 13.5397 8.08259 12.8025L15.0227 16.6294C15.0077 16.7508 15 16.8745 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.0674 14 16.2347 14.4603 15.6951 15.1975L8.75505 11.3706C8.76995 11.2492 8.77778 11.1255 8.77778 11C8.77778 10.8745 8.76995 10.7508 8.75505 10.6294L15.6951 6.80254C16.2347 7.53966 17.0674 8 18 8Z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          {t("referral.share")}
        </button>
      </div>

      <div className={styles.howItWorks}>
        <h4>{t("referral.howItWorks")}</h4>
        <ol className={styles.steps}>
          <li>{t("referral.step1")}</li>
          <li>{t("referral.step2")}</li>
          <li>{t("referral.step3")}</li>
        </ol>
      </div>
    </div>
  );
}
