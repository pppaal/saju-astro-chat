'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type PeriodOption = {
  period: string;
  label: string;
  credits: number;
  emoji: string;
};

type ThemeOption = {
  theme: string;
  label: string;
  credits: number;
  emoji: string;
};

type ReportOption = PeriodOption | ThemeOption;

function getOptionKey(option: ReportOption): string {
  return 'period' in option ? option.period : option.theme;
}

type ReportType = {
  id: 'timing' | 'themed' | 'comprehensive';
  title: string;
  titleEn: string;
  emoji: string;
  description: string;
  descriptionEn: string;
  color: string;
  options?: ReportOption[];
  credits?: number;
};

const REPORT_TYPES: ReportType[] = [
  {
    id: 'timing',
    title: '타이밍 리포트',
    titleEn: 'Timing Reports',
    emoji: '⏰',
    description: '일별/월별/년별 운세 분석',
    descriptionEn: 'Daily/Monthly/Yearly fortune analysis',
    color: 'from-blue-500 to-cyan-500',
    options: [
      { period: 'daily', label: '오늘 운세', credits: 1, emoji: '☀️' },
      { period: 'monthly', label: '이번달 운세', credits: 2, emoji: '📅' },
      { period: 'yearly', label: '올해 운세', credits: 3, emoji: '🗓️' },
    ],
  },
  {
    id: 'themed',
    title: '테마별 리포트',
    titleEn: 'Themed Reports',
    emoji: '🎯',
    description: '사랑, 커리어, 재물 등 심층 분석',
    descriptionEn: 'Deep analysis on love, career, wealth, etc.',
    color: 'from-purple-500 to-pink-500',
    options: [
      { theme: 'love', label: '사랑 & 연애', credits: 2, emoji: '💕' },
      { theme: 'career', label: '커리어 & 직업', credits: 2, emoji: '💼' },
      { theme: 'wealth', label: '재물 & 금전', credits: 2, emoji: '💰' },
      { theme: 'health', label: '건강 & 웰빙', credits: 2, emoji: '💪' },
      { theme: 'family', label: '가족 & 관계', credits: 2, emoji: '👨‍👩‍👧‍👦' },
    ],
  },
  {
    id: 'comprehensive',
    title: '종합 리포트',
    titleEn: 'Comprehensive Report',
    emoji: '📜',
    description: '전체 운명 분석 + 인생 가이드',
    descriptionEn: 'Full destiny analysis + life guide',
    color: 'from-amber-500 to-orange-500',
    credits: 3,
  },
];

export default function PremiumReportsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleSelectReport = (typeId: string, option?: { period?: string; theme?: string }) => {
    if (status !== 'authenticated') {
      router.push('/auth/signin?callbackUrl=/premium-reports');
      return;
    }

    if (typeId === 'comprehensive') {
      router.push('/premium-reports/result?type=comprehensive');
    } else if (option?.period) {
      router.push(`/premium-reports/timing?period=${option.period}`);
    } else if (option?.theme) {
      router.push(`/premium-reports/themed?theme=${option.theme}`);
    }
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="relative py-12 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10" />
        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            ✨ AI 프리미엄 리포트
          </h1>
          <p className="text-gray-400 text-lg">
            동양+서양 융합 분석으로 만드는 당신만의 운세 리포트
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-20">
        {/* Report Type Cards */}
        <div className="space-y-6">
          {REPORT_TYPES.map((type) => (
            <div
              key={type.id}
              className={`relative rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur overflow-hidden transition-all duration-300 ${
                selectedType === type.id ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {/* Card Header */}
              <button
                onClick={() => setSelectedType(selectedType === type.id ? null : type.id)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-700/30 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{type.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">{type.title}</h2>
                    <p className="text-gray-400 text-sm">{type.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {type.id === 'comprehensive' && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium">
                      ✦ {type.credits} 크레딧
                    </span>
                  )}
                  <span className={`text-gray-400 transition-transform duration-300 ${
                    selectedType === type.id ? 'rotate-180' : ''
                  }`}>
                    ▼
                  </span>
                </div>
              </button>

              {/* Expanded Options */}
              {selectedType === type.id && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-700/50">
                  {type.id === 'comprehensive' ? (
                    <button
                      onClick={() => handleSelectReport('comprehensive')}
                      className={`w-full p-4 rounded-xl bg-gradient-to-r ${type.color} text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`}
                    >
                      <span>종합 리포트 생성하기</span>
                      <span className="text-sm opacity-80">✦ 3 크레딧</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {type.options?.map((option) => (
                        <button
                          key={getOptionKey(option)}
                          onClick={() => handleSelectReport(type.id, option)}
                          className="p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-all group focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{option.emoji}</span>
                            <span className="text-white font-medium">{option.label}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">AI 심층 분석</span>
                            <span className="text-purple-300 font-medium">
                              ✦ {option.credits} 크레딧
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>ℹ️</span>
            <span>프리미엄 리포트란?</span>
          </h3>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Destiny Fusion Matrix™의 10개 레이어 데이터를 AI가 심층 분석</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>동양 사주와 서양 점성술을 교차 융합한 독자적 분석</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>구체적인 실천 가이드와 타이밍 조언 포함</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>PDF 다운로드 지원 (종합 리포트)</span>
            </li>
          </ul>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/destiny-map"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← 운세 분석으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
