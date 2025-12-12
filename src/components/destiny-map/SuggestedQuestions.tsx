"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

interface Props {
  theme: string;
  lang: string;
  _reportSummary?: string;
  saju?: any;
  className?: string;
}

// 테마별 맞춤 질문 템플릿
const questionTemplates: Record<string, { ko: string[]; en: string[] }> = {
  focus_love: {
    ko: [
      "올해 연애운이 좋은 시기는 언제인가요?",
      "제 사주에서 이상형은 어떤 사람인가요?",
      "현재 연인과의 궁합은 어떤가요?",
    ],
    en: [
      "When is the best time for romance this year?",
      "What type of person is my ideal match based on my chart?",
      "How compatible am I with my current partner?",
    ],
  },
  focus_career: {
    ko: [
      "이직하기 좋은 타이밍은 언제인가요?",
      "제 사주에 맞는 직업군은 무엇인가요?",
      "승진 가능성은 어떻게 보이나요?",
    ],
    en: [
      "When is a good time to change jobs?",
      "What career paths suit my birth chart?",
      "What are my chances of promotion?",
    ],
  },
  focus_energy: {
    ko: [
      "올해 건강 관리에서 주의할 점은?",
      "활력을 높이려면 어떤 운동이 좋을까요?",
      "스트레스 관리 방법을 추천해주세요",
    ],
    en: [
      "What should I watch out for health-wise this year?",
      "What exercises would boost my energy?",
      "Can you recommend stress management techniques?",
    ],
  },
  life: {
    ko: [
      "올해 전체적인 운세 흐름은 어떤가요?",
      "제 인생에서 가장 중요한 전환점은 언제인가요?",
      "행운을 높이려면 어떻게 해야 할까요?",
    ],
    en: [
      "What's the overall fortune trend for this year?",
      "When are the major turning points in my life?",
      "How can I increase my luck?",
    ],
  },
};

// 오행 기반 추가 질문
function getElementBasedQuestion(saju: any, lang: string): string | null {
  if (!saju?.fiveElements) return null;

  const elements = saju.fiveElements;
  const sorted = Object.entries(elements).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  );

  if (sorted.length < 2) return null;

  const weakest = sorted[sorted.length - 1][0];
  const elementNames: Record<string, { ko: string; en: string }> = {
    wood: { ko: "목(木)", en: "Wood" },
    fire: { ko: "화(火)", en: "Fire" },
    earth: { ko: "토(土)", en: "Earth" },
    metal: { ko: "금(金)", en: "Metal" },
    water: { ko: "수(水)", en: "Water" },
  };

  const name = elementNames[weakest];
  if (!name) return null;

  return lang === "ko"
    ? `${name.ko} 기운이 부족한데 어떻게 보완하면 좋을까요?`
    : `How can I strengthen my weak ${name.en} element?`;
}

export default function SuggestedQuestions({
  theme,
  lang,
  _reportSummary,
  saju,
  className = "",
}: Props) {
  const router = useRouter();
  const isKo = lang === "ko";

  const questions = useMemo(() => {
    const themeKey = theme.replace("focus_", "") === "love" ? "focus_love"
      : theme.replace("focus_", "") === "career" ? "focus_career"
      : theme.replace("focus_", "") === "energy" ? "focus_energy"
      : theme;

    const templates = questionTemplates[themeKey] || questionTemplates.life;
    const baseQuestions = isKo ? templates.ko : templates.en;

    // 오행 기반 추가 질문
    const elementQuestion = getElementBasedQuestion(saju, lang);
    if (elementQuestion) {
      return [elementQuestion, ...baseQuestions.slice(0, 2)];
    }

    return baseQuestions;
  }, [theme, lang, saju, isKo]);

  const handleQuestionClick = (question: string) => {
    // 질문을 쿼리 파라미터로 전달하여 counselor 페이지로 이동
    const params = new URLSearchParams(window.location.search);
    params.set("q", question);
    router.push(`/destiny-map/counselor?${params.toString()}`);
  };

  const handleCounselorClick = () => {
    const params = new URLSearchParams(window.location.search);
    router.push(`/destiny-map/counselor?${params.toString()}`);
  };

  return (
    <div className={`mt-8 ${className}`}>
      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <span className="text-purple-400 text-sm font-medium">
          {isKo ? "더 궁금한 점이 있으신가요?" : "Want to know more?"}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      {/* Suggested Questions */}
      <div className="space-y-2 mb-6">
        {questions.map((question, idx) => (
          <button
            key={idx}
            onClick={() => handleQuestionClick(question)}
            className="w-full text-left px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-purple-500/50 rounded-xl text-gray-200 text-sm transition-all duration-200 flex items-center gap-3 group"
          >
            <span className="text-purple-400 group-hover:scale-110 transition-transform">💬</span>
            <span className="flex-1">{question}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={handleCounselorClick}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 flex items-center justify-center gap-2 group"
      >
        <span className="text-xl group-hover:animate-bounce">🔮</span>
        <span>{isKo ? "상담사에게 직접 물어보기" : "Ask the Counselor Directly"}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 group-hover:translate-x-1 transition-transform"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <p className="text-center text-xs text-gray-500 mt-3">
        {isKo ? "프리미엄 구독자 전용 기능입니다" : "Premium subscribers only"}
      </p>
    </div>
  );
}
