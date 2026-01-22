"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import styles from "./ShareResultButton.module.css";
import { logger } from "@/lib/logger";

interface ShareResultData {
  [key: string]: unknown;
}

interface ShareResultButtonProps {
  title: string;
  description: string;
  resultData: ShareResultData;
  resultType: "saju" | "tarot" | "astrology" | "dream" | "compatibility";
  shareUrl?: string;
}

export default function ShareResultButton({
  title,
  description,
  resultData,
  resultType,
  shareUrl,
}: ShareResultButtonProps) {
  const { t } = useI18n();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalUrl, setModalUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // ESC 키로 모달 닫기
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && showModal) {
      setShowModal(false);
    }
  }, [showModal]);

  useEffect(() => {
    if (showModal) {
      document.addEventListener("keydown", handleKeyDown);
      // 포커스 트랩 - 모달 열릴 때 첫 번째 버튼에 포커스
      const firstButton = document.querySelector(`.${styles.copyBtn}`) as HTMLButtonElement;
      firstButton?.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal, handleKeyDown]);

  const handleShare = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/share/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          resultData,
          resultType,
        }),
      });

      const { shareId } = await response.json();
      const fullShareUrl = shareUrl || `${window.location.origin}/shared/${shareId}`;

      // Check if Web Share API is available
      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: `${description}\n\n✨ DestinyPal에서 나도 무료로 보기`,
            url: fullShareUrl,
          });
        } catch (_err) {
          // User cancelled or share failed, show fallback
          setModalUrl(fullShareUrl);
          setShowModal(true);
        }
      } else {
        setModalUrl(fullShareUrl);
        setShowModal(true);
      }
    } catch (error) {
      logger.error("Share error:", { error: error });
      showErrorToast(t("share.error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(modalUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      logger.error("Copy link error:", { error });
      showErrorToast(t("share.copyError", "링크 복사에 실패했습니다."));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCopySuccess(false);
  };

  // 모달 바깥 클릭시 닫기
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const handleDownloadImage = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/share/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          resultData,
          resultType,
        }),
      });

      const { imageUrl } = await response.json();

      // Download the image
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${resultType}-result-${Date.now()}.png`;
      link.click();

      showSuccessToast(t("share.downloadSuccess", "이미지가 다운로드되었습니다!"));
    } catch (error) {
      logger.error("Download error:", { error: error });
      showErrorToast(t("share.downloadError"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.shareContainer}>
      <button
        className={styles.shareButton}
        onClick={handleShare}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <span className={styles.spinner} />
            {t("share.generating")}
          </>
        ) : (
          <>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08259 9.19746C7.54305 8.46034 6.71034 8 5.77778 8C4.24446 8 3 9.34315 3 11C3 12.6569 4.24446 14 5.77778 14C6.71034 14 7.54305 13.5397 8.08259 12.8025L15.0227 16.6294C15.0077 16.7508 15 16.8745 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.0674 14 16.2347 14.4603 15.6951 15.1975L8.75505 11.3706C8.76995 11.2492 8.77778 11.1255 8.77778 11C8.77778 10.8745 8.76995 10.7508 8.75505 10.6294L15.6951 6.80254C16.2347 7.53966 17.0674 8 18 8Z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            {t("share.shareButton")}
          </>
        )}
      </button>

      <button
        className={styles.downloadButton}
        onClick={handleDownloadImage}
        disabled={isGenerating}
        title={t("share.downloadImage")}
        aria-label={t("share.downloadImage")}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 10L12 15L17 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 15V3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 공유 모달 - React로 렌더링 (XSS 방지 + 접근성) */}
      {showModal && (
        <div
          className={styles.shareModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          onClick={handleBackdropClick}
        >
          <div className={styles.shareModalContent}>
            <h3 id="share-modal-title">{t("share.shareYourResult")}</h3>
            <div className={styles.shareButtons}>
              <button
                className={styles.copyBtn}
                onClick={handleCopyLink}
                aria-label="링크 복사"
              >
                {copySuccess ? "✅ 복사 완료!" : "📋 링크 복사"}
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(modalUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.shareBtn} ${styles.facebook}`}
              >
                Facebook
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(modalUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.shareBtn} ${styles.twitter}`}
              >
                Twitter
              </a>
              <a
                href={`https://story.kakao.com/share?url=${encodeURIComponent(modalUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.shareBtn} ${styles.kakao}`}
              >
                카카오스토리
              </a>
            </div>
            <button
              className={styles.closeBtn}
              onClick={handleCloseModal}
              aria-label={t("common.close")}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
