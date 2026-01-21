'use client';

import { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  '사주 데이터 분석 중...',
  '오행 에너지 계산 중...',
  '운세 흐름 파악 중...',
  'AI가 리포트 작성 중...',
  '최종 검토 중...',
];

interface ReportLoadingProps {
  reportType?: string;
}

export function ReportLoading({ reportType = '운세' }: ReportLoadingProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 15, 95));
    }, 1000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
      <div className="text-center max-w-md px-6">
        {/* Animated Icon */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
          {/* Inner glow */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 animate-pulse" />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl animate-bounce">✦</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2">
          {reportType} 리포트 생성 중
        </h2>

        {/* Loading Message */}
        <p className="text-gray-400 mb-6 h-6 transition-all duration-300">
          {LOADING_MESSAGES[messageIndex]}
        </p>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-500 text-sm">{Math.round(progress)}%</p>

        {/* Info */}
        <p className="text-gray-600 text-xs mt-8">
          AI가 당신만의 맞춤형 리포트를 작성하고 있습니다.
          <br />
          잠시만 기다려주세요.
        </p>
      </div>
    </div>
  );
}
