"use client";

import { useEffect, useState } from "react";
import { useConsultationHistory } from "@/hooks/useConsultationHistory";
import { useI18n } from "@/i18n/I18nProvider";

interface Props {
  consultationId: string;
  onClose: () => void;
}

type JungQuote = {
  kr?: string;
  en?: string;
  source?: string;
};

type ConsultationDetail = {
  theme: string;
  createdAt: string;
  userQuestion?: string;
  fullReport?: string;
  jungQuotes?: JungQuote[];
};

const themeLabels: Record<string, { ko: string; en: string }> = {
  love: { ko: "연애/관계", en: "Love/Relationships" },
  career: { ko: "직업/경력", en: "Career" },
  life_path: { ko: "인생의 방향", en: "Life Path" },
  health: { ko: "건강", en: "Health" },
  wealth: { ko: "재물", en: "Wealth" },
  family: { ko: "가족", en: "Family" },
  life: { ko: "종합운", en: "Overall" },
};

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConsultationDetailModal({ consultationId, onClose }: Props) {
  const { locale } = useI18n();
  const isKo = locale === "ko";
  const { fetchDetail, isPremiumRequired } = useConsultationHistory();
  const [detail, setDetail] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchDetail(consultationId);
        if (data) {
          setDetail(data as Record<string, unknown>);
        } else if (!isPremiumRequired) {
          setError(isKo ? "상담 기록을 불러올 수 없습니다." : "Failed to load consultation.");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [consultationId, fetchDetail, isKo, isPremiumRequired]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const themeLabel = detail ? (themeLabels[detail.theme] || { ko: detail.theme, en: detail.theme }) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/50">
          <h2 className="text-lg font-bold text-white">
            {isKo ? "상담 상세 기록" : "Consultation Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-73px)]">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-center">
              {error}
            </div>
          )}

          {isPremiumRequired && (
            <div className="text-center py-8">
              <div className="text-yellow-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-300">
                {isKo
                  ? "상담 기록 열람은 프리미엄 구독자 전용입니다."
                  : "Consultation details are for premium subscribers only."}
              </p>
            </div>
          )}

          {detail && (
            <div className="space-y-6">
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                  {isKo ? themeLabel?.ko : themeLabel?.en}
                </span>
                <span className="text-gray-400 text-sm">
                  {formatDate(detail.createdAt, locale)}
                </span>
              </div>

              {/* User Question */}
              {detail.userQuestion && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    {isKo ? "질문" : "Question"}
                  </h3>
                  <p className="text-white">{detail.userQuestion}</p>
                </div>
              )}

              {/* Full Report */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  {isKo ? "상담 내용" : "Consultation Report"}
                </h3>
                <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {detail.fullReport}
                </div>
              </div>

              {/* Jung Quotes (if any) */}
              {detail.jungQuotes && Array.isArray(detail.jungQuotes) && detail.jungQuotes.length > 0 && (
                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">
                    {isKo ? "인용된 Jung 명언" : "Referenced Jung Quotes"}
                  </h3>
                  <div className="space-y-3">
                    {detail.jungQuotes.map((quote: JungQuote, idx: number) => (
                      <blockquote key={idx} className="border-l-2 border-purple-500 pl-4 italic text-gray-300">
                        &ldquo;{isKo ? quote.kr : quote.en}&rdquo;
                        <footer className="text-xs text-gray-500 mt-1 not-italic">
                          — {quote.source}
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
