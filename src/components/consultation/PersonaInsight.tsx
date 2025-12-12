"use client";

import { usePersonaMemory } from "@/hooks/usePersonaMemory";
import { useI18n } from "@/i18n/I18nProvider";

const themeLabels: Record<string, { ko: string; en: string }> = {
  love: { ko: "연애", en: "Love" },
  career: { ko: "경력", en: "Career" },
  life_path: { ko: "인생", en: "Life" },
  health: { ko: "건강", en: "Health" },
  wealth: { ko: "재물", en: "Wealth" },
  family: { ko: "가족", en: "Family" },
  life: { ko: "종합", en: "Overall" },
};

interface Props {
  className?: string;
}

export default function PersonaInsight({ className = "" }: Props) {
  const { locale } = useI18n();
  const isKo = locale === "ko";
  const { memory, isNewUser, loading, error, fetchMemory: _fetchMemory } = usePersonaMemory(true);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-800/50 rounded-xl p-4 ${className}`}>
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-700 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
      </div>
    );
  }

  if (error) {
    return null; // 에러 시 조용히 숨김
  }

  if (isNewUser || !memory) {
    return (
      <div className={`bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
          <h3 className="text-white font-medium">
            {isKo ? "첫 상담을 시작해보세요" : "Start Your First Consultation"}
          </h3>
        </div>
        <p className="text-gray-400 text-sm">
          {isKo
            ? "운세 상담을 받으면 AI가 당신의 성향과 관심사를 학습하여 더 맞춤화된 조언을 드립니다."
            : "As you receive readings, our AI learns your patterns and interests to provide more personalized guidance."}
        </p>
      </div>
    );
  }

  const dominantThemes = (memory.dominantThemes as string[]) || [];
  const _lastTopics = (memory.lastTopics as string[]) || [];
  const keyInsights = (memory.keyInsights as string[]) || [];
  const growthAreas = (memory.growthAreas as string[]) || [];

  return (
    <div className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          <h3 className="text-white font-medium">
            {isKo ? "나의 여정" : "My Journey"}
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          {isKo ? `${memory.sessionCount}회 상담` : `${memory.sessionCount} sessions`}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Dominant Themes */}
        {dominantThemes.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">
              {isKo ? "관심 주제" : "Interests"}
            </p>
            <div className="flex flex-wrap gap-1">
              {dominantThemes.slice(0, 3).map((theme) => {
                const label = themeLabels[theme] || { ko: theme, en: theme };
                return (
                  <span
                    key={theme}
                    className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full"
                  >
                    {isKo ? label.ko : label.en}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Emotional Tone */}
        {memory.emotionalTone && (
          <div>
            <p className="text-xs text-gray-500 mb-1">
              {isKo ? "현재 에너지" : "Current Energy"}
            </p>
            <span className="text-sm text-purple-300">{memory.emotionalTone}</span>
          </div>
        )}
      </div>

      {/* Key Insights */}
      {keyInsights.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">
            {isKo ? "핵심 통찰" : "Key Insights"}
          </p>
          <ul className="text-sm text-gray-300 space-y-1">
            {keyInsights.slice(0, 2).map((insight, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-purple-400 mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Growth Areas */}
      {growthAreas.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">
            {isKo ? "성장 영역" : "Growth Areas"}
          </p>
          <div className="flex flex-wrap gap-1">
            {growthAreas.slice(0, 3).map((area, idx) => (
              <span
                key={idx}
                className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
