"use client";

import { useEffect, useState } from "react";
import { useConsultationHistory } from "@/hooks/useConsultationHistory";
import { useI18n } from "@/i18n/I18nProvider";

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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  onSelectConsultation?: (id: string) => void;
  onUpgrade?: () => void;
}

export default function ConsultationHistory({ onSelectConsultation, onUpgrade }: Props) {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const {
    consultations,
    pagination,
    loading,
    error,
    isPremiumRequired,
    fetchHistory,
    deleteConsultation,
  } = useConsultationHistory();

  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory(selectedTheme || undefined);
  }, [fetchHistory, selectedTheme]);

  const handleLoadMore = () => {
    if (pagination?.hasMore) {
      fetchHistory(selectedTheme || undefined, consultations.length);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(isKo ? "이 상담 기록을 삭제하시겠습니까?" : "Delete this consultation record?")) {
      await deleteConsultation(id);
    }
  };

  // Premium paywall
  if (isPremiumRequired) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-xl border-2 border-dashed border-blue-400/50 rounded-xl p-8 text-center">
        <div className="text-yellow-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {isKo ? "프리미엄 전용 기능" : "Premium Feature"}
        </h3>
        <p className="text-gray-300 max-w-md mx-auto mb-6">
          {isKo
            ? "상담 기록 열람은 프리미엄 구독자 전용입니다. 구독하시면 모든 상담 기록을 열람하고 관리할 수 있습니다."
            : "Consultation history is available for premium subscribers only. Subscribe to view and manage all your consultation records."}
        </p>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-8 rounded-full text-lg hover:shadow-xl hover:shadow-purple-500/20 transition-all transform hover:scale-105"
          >
            {isKo ? "프리미엄 구독하기" : "Subscribe to Premium"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-white">
          {isKo ? "상담 기록" : "Consultation History"}
          {pagination && (
            <span className="ml-2 text-sm text-gray-400 font-normal">
              ({pagination.total})
            </span>
          )}
        </h2>

        <select
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value)}
          className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          <option value="">{isKo ? "전체 주제" : "All Themes"}</option>
          {Object.entries(themeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {isKo ? label.ko : label.en}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && consultations.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && consultations.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>{isKo ? "아직 상담 기록이 없습니다." : "No consultation records yet."}</p>
          <p className="text-sm mt-1">
            {isKo ? "운세 분석을 받으시면 자동으로 저장됩니다." : "Your readings will be saved automatically."}
          </p>
        </div>
      )}

      {/* Consultation List */}
      <div className="space-y-3">
        {consultations.map((consultation) => {
          const themeLabel = themeLabels[consultation.theme] || { ko: consultation.theme, en: consultation.theme };
          const isExpanded = expandedId === consultation.id;

          return (
            <div
              key={consultation.id}
              className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Card Header */}
              <div
                className="p-4 cursor-pointer flex items-start justify-between gap-3"
                onClick={() => setExpandedId(isExpanded ? null : consultation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                      {isKo ? themeLabel.ko : themeLabel.en}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(consultation.createdAt, locale)}
                    </span>
                  </div>
                  <p className="text-white font-medium line-clamp-2">
                    {consultation.summary}
                  </p>
                  {consultation.userQuestion && (
                    <p className="text-gray-400 text-sm mt-1 line-clamp-1">
                      Q: {consultation.userQuestion}
                    </p>
                  )}
                </div>

                {/* Expand/Collapse Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>

              {/* Expanded Actions */}
              {isExpanded && (
                <div className="border-t border-gray-700 px-4 py-3 bg-gray-900/30 flex items-center gap-3">
                  {onSelectConsultation && (
                    <button
                      onClick={() => onSelectConsultation(consultation.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      {isKo ? "자세히 보기" : "View Details"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(consultation.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1 ml-auto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {isKo ? "삭제" : "Delete"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {pagination?.hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? (isKo ? "로딩 중..." : "Loading...") : (isKo ? "더 보기" : "Load More")}
          </button>
        </div>
      )}
    </div>
  );
}
