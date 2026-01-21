'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/hooks/useUserProfile';
import Link from 'next/link';

const PERIOD_INFO = {
  daily: {
    label: '오늘 운세',
    emoji: '☀️',
    description: '오늘 하루의 에너지 흐름과 행동 가이드',
    credits: 1,
    color: 'from-yellow-500 to-orange-500',
  },
  monthly: {
    label: '이번달 운세',
    emoji: '📅',
    description: '이번달 주요 흐름과 주차별 포인트',
    credits: 2,
    color: 'from-blue-500 to-cyan-500',
  },
  yearly: {
    label: '올해 운세',
    emoji: '🗓️',
    description: '올해 전체 흐름과 월별 예측',
    credits: 3,
    color: 'from-purple-500 to-pink-500',
  },
};

function TimingReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { profile, isLoading: profileLoading } = useUserProfile();

  const period = searchParams.get('period') as 'daily' | 'monthly' | 'yearly' || 'daily';
  const periodInfo = PERIOD_INFO[period];

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/premium-reports/timing?period=' + period);
    }
  }, [status, router, period]);

  const handleGenerate = async () => {
    if (!profile.birthDate) {
      setError('생년월일 정보가 필요합니다. 프로필을 먼저 설정해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          targetDate,
          dayMasterElement: '목', // TODO: 실제 사용자 데이터에서 가져오기
          name: profile.name,
          birthDate: profile.birthDate,
          lang: 'ko',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.error?.code === 'INSUFFICIENT_CREDITS') {
          router.push('/pricing?reason=credits');
          return;
        }
        throw new Error(data.error?.message || '리포트 생성에 실패했습니다.');
      }

      // 성공 - 결과 페이지로 이동
      router.push(`/premium-reports/result/${data.report.id}?type=timing`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (status === 'loading' || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/premium-reports"
            className="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
          >
            ← 리포트 선택으로
          </Link>
          <div className={`mt-4 p-6 rounded-2xl bg-gradient-to-r ${periodInfo.color} bg-opacity-20`}>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{periodInfo.emoji}</span>
              <div>
                <h1 className="text-2xl font-bold text-white">{periodInfo.label}</h1>
                <p className="text-white/80">{periodInfo.description}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-20">
        {/* Date Selector */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">분석 기준일 선택</h2>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-gray-400 text-sm mt-2">
            {period === 'daily' && '선택한 날짜의 운세를 분석합니다.'}
            {period === 'monthly' && '선택한 날짜가 포함된 달의 운세를 분석합니다.'}
            {period === 'yearly' && '선택한 날짜가 포함된 해의 운세를 분석합니다.'}
          </p>
        </div>

        {/* Profile Info */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">분석 대상</h2>
          {profile.birthDate ? (
            <div className="space-y-2 text-gray-300">
              <p><span className="text-gray-500">이름:</span> {profile.name || '미입력'}</p>
              <p><span className="text-gray-500">생년월일:</span> {profile.birthDate}</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-3">프로필 정보가 필요합니다.</p>
              <Link
                href="/destiny-map"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                운세 분석에서 정보 입력하기
              </Link>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !profile.birthDate}
          className={`w-full p-4 rounded-xl font-bold text-white flex items-center justify-center gap-3 transition-all ${
            isGenerating || !profile.birthDate
              ? 'bg-slate-600 cursor-not-allowed'
              : `bg-gradient-to-r ${periodInfo.color} hover:opacity-90`
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>AI가 분석 중...</span>
            </>
          ) : (
            <>
              <span>{periodInfo.label} 생성하기</span>
              <span className="text-sm opacity-80">✦ {periodInfo.credits} 크레딧</span>
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-gray-500 text-sm text-center mt-4">
          생성된 리포트는 마이페이지에서 다시 확인할 수 있습니다.
        </p>
      </main>
    </div>
  );
}

export default function TimingReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    }>
      <TimingReportContent />
    </Suspense>
  );
}
