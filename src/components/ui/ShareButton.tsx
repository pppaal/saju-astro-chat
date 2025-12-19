"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./ShareButton.module.css";

interface ShareButtonProps {
  variant?: "full" | "compact";
  className?: string;
}

export default function ShareButton({ variant = "full", className }: ShareButtonProps) {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [referralUrl, setReferralUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get or create referral code
    if (session?.user?.id) {
      fetch("/api/referral/create-code", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data.referralUrl) {
            setReferralUrl(data.referralUrl);
          }
        })
        .catch(console.error);
    } else {
      // For non-logged-in users, use base URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      setReferralUrl(`${baseUrl}/destiny-pal`);
    }
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shareMessage = t(
    "share.message",
    "I just got my destiny reading on DestinyPal! Try it yourself:"
  );

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareKakao = () => {
    const kakaoLink = `https://story.kakao.com/share?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(kakaoLink, "_blank", "width=600,height=400");
    setIsOpen(false);
  };

  const shareWhatsApp = () => {
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareMessage + " " + referralUrl)}`;
    window.open(whatsappLink, "_blank");
    setIsOpen(false);
  };

  const shareTwitter = () => {
    const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(referralUrl)}`;
    window.open(twitterLink, "_blank", "width=600,height=400");
    setIsOpen(false);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "DestinyPal - AI Fortune Reading",
          text: shareMessage,
          url: referralUrl,
        });
        setIsOpen(false);
      } catch (err) {
        console.error("Share failed:", err);
      }
    }
  };

  return (
    <div className={`${styles.container} ${className || ""}`} ref={dropdownRef}>
      <button
        className={`${styles.shareBtn} ${variant === "compact" ? styles.compact : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("share.button", "Share with friends")}
      >
        <span className={styles.icon}>🔗</span>
        {variant === "full" && (
          <span className={styles.text}>{t("share.button", "Share with friends")}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>{t("share.title", "Share & Earn Credits")}</span>
            {session && (
              <span className={styles.bonus}>+5 {t("share.credits", "credits")}</span>
            )}
          </div>

          <div className={styles.shareOptions}>
            <button className={`${styles.option} ${styles.kakao}`} onClick={shareKakao}>
              <span className={styles.optionIcon}>💬</span>
              <span>KakaoTalk</span>
            </button>
            <button className={`${styles.option} ${styles.whatsapp}`} onClick={shareWhatsApp}>
              <span className={styles.optionIcon}>📱</span>
              <span>WhatsApp</span>
            </button>
            <button className={`${styles.option} ${styles.twitter}`} onClick={shareTwitter}>
              <span className={styles.optionIcon}>🐦</span>
              <span>Twitter</span>
            </button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button className={`${styles.option} ${styles.native}`} onClick={shareNative}>
                <span className={styles.optionIcon}>📤</span>
                <span>{t("share.more", "More")}</span>
              </button>
            )}
          </div>

          <div className={styles.linkSection}>
            <div className={styles.linkDisplay}>
              <span className={styles.linkText}>
                {referralUrl.replace(/^https?:\/\//, "").slice(0, 30)}...
              </span>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
                onClick={copyToClipboard}
              >
                {copied ? "✓" : "📋"}
              </button>
            </div>
          </div>

          {!session && (
            <div className={styles.loginHint}>
              <a href="/api/auth/signin">{t("share.loginHint", "Sign in to earn referral credits!")}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
