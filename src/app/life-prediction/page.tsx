'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import { buildSignInUrl } from '@/lib/auth/signInUrl';

import { PredictionChat } from '@/components/life-prediction/PredictionChat';
import { TimingCard, TimingPeriod } from '@/components/life-prediction/ResultCards/TimingCard';
import { AnalyzingLoader } from '@/components/life-prediction/ResultCards/AnalyzingLoader';
import { BirthInfoForm } from '@/components/life-prediction/BirthInfoForm';
import { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector';
import { cardContainerVariants, pageTransitionVariants } from '@/components/life-prediction/animations/cardAnimations';

import BackButton from '@/components/ui/BackButton';
import CreditBadge from '@/components/ui/CreditBadge';
import styles from './life-prediction.module.css';

const AdvisorChat = dynamic(
  () => import('@/components/life-prediction/AdvisorChat').then((mod) => mod.default),
  { ssr: false }
);

const ResultShare = dynamic(
  () => import('@/components/life-prediction/ResultShare').then((mod) => mod.default),
  { ssr: false }
);

type Phase = 'birth-input' | 'input' | 'analyzing' | 'result';

interface UserProfile {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  gender?: 'M' | 'F';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface GuestBirthInfo {
  birthDate: string;
  birthTime: string;
  gender: 'M' | 'F';
  birthCity?: string;
}

// ========== 사주 용어 → 사용자 친화적 설명 변환 ==========
const REASON_TRANSLATIONS: Record<string, Record<string, string>> = {
  // 십신 관련
  investment: {
    '정재운': '💰 재물운이 안정되어 재테크하기 좋은 시기',
    '편재운': '💸 뜻밖의 재물운, 투자 수익 기대',
    '식신운': '🌱 꾸준한 수입 증가 흐름',
    '상관운': '💡 창의적 아이디어로 수익 창출 가능',
    '정관운': '📊 체계적인 자산 관리에 유리',
    '편관운': '⚡ 과감한 투자 결정에 좋은 시기',
    '정인운': '📚 재테크 학습과 정보 수집 최적기',
    '편인운': '🔮 직감적인 투자 판단력 상승',
    '비견운': '🤝 동업이나 공동 투자에 유리',
    '겁재운': '⚠️ 경쟁이 있지만 기회도 있는 시기',
  },
  marriage: {
    '정재운': '💕 안정적인 만남의 기회',
    '편재운': '💘 뜻밖의 인연 발생 가능',
    '정관운': '💍 정식 교제나 결혼에 매우 유리',
    '편관운': '❤️‍🔥 강렬한 만남의 시기',
    '정인운': '🏠 가정적인 분위기, 결혼 결심에 좋음',
    '식신운': '😊 편안한 만남, 자연스러운 인연',
  },
  career: {
    '정관운': '👔 승진이나 직장 내 인정받기 좋은 시기',
    '편관운': '⚡ 도전적인 이직이나 새로운 기회',
    '식신운': '🌱 실력 발휘와 성과 인정 시기',
    '상관운': '💡 창의적인 업무에서 두각',
    '정재운': '💰 급여 상승이나 보너스 기대',
    '정인운': '📚 자기계발과 역량 향상 최적기',
    '편인운': '🔮 전문성 강화에 좋은 시기',
  },
  study: {
    '정인운': '📖 학습 능력 최고조, 합격운 상승',
    '편인운': '🧠 직관력과 암기력 향상',
    '식신운': '✍️ 꾸준한 노력이 결실로',
    '상관운': '💡 창의적 사고력 발휘',
    '정관운': '📋 체계적인 학습에 유리',
  },
  move: {
    '역마': '🚗 이동과 변화에 최적의 시기',
    '정재운': '🏠 좋은 집을 찾기 유리한 시기',
    '정인운': '🏡 안정적인 정착에 좋은 시기',
  },
  health: {
    '식신운': '💪 체력 회복과 건강 관리에 최적',
    '정인운': '🧘 심신 안정과 치유의 시기',
    '비견운': '🏃 운동 효과가 좋은 시기',
  },
  relationship: {
    '정재운': '💕 안정적인 연애 시작에 좋음',
    '편재운': '💘 새로운 만남의 기회',
    '식신운': '😊 자연스러운 인연 발전',
    '상관운': '💬 적극적인 표현이 효과적',
  },
};

// 공통 변환
const COMMON_TRANSLATIONS: Record<string, string> = {
  // 12운성
  '건록 - 에너지 상승기': '🔥 에너지가 충만한 시기, 적극적 행동 권장',
  '제왕 - 에너지 상승기': '👑 운세 최고조! 무엇이든 시작하기 좋은 때',
  '관대 - 에너지 상승기': '✨ 성장과 발전의 기운이 강한 시기',
  '장생 - 에너지 상승기': '🌱 새로운 시작에 좋은 기운',
  '목욕 - 에너지 상승기': '🌊 변화와 정화의 시기',

  // 오행 조화
  '화 기운 - 조화': '🔥 열정과 추진력이 높아지는 시기',
  '수 기운 - 조화': '💧 지혜와 통찰력이 빛나는 시기',
  '목 기운 - 조화': '🌳 성장과 발전의 에너지',
  '금 기운 - 조화': '⚔️ 결단력과 실행력 상승',
  '토 기운 - 조화': '🏔️ 안정과 신뢰의 기운',

  // 용신
  '용신 월': '⭐ 당신에게 가장 유리한 기운의 달',
  '용신일': '⭐ 당신에게 가장 유리한 기운의 날',

  // 귀인
  '천을귀인': '🌟 귀인의 도움을 받을 수 있는 날',

  // 특수 관계
  '대운 건록 - 장기적 지원': '📈 장기적인 운세 상승 흐름',
  '대운 제왕 - 장기적 지원': '👑 10년 대운 중 최고의 시기',
};

/**
 * 사주 용어를 사용자 친화적 설명으로 변환
 */
function translateReasons(reasons: string[], eventType: string): string[] {
  const eventTranslations = REASON_TRANSLATIONS[eventType] || {};

  return reasons.map(reason => {
    // 이벤트 타입별 변환 먼저 확인
    for (const [key, translation] of Object.entries(eventTranslations)) {
      if (reason.includes(key)) {
        return translation;
      }
    }

    // 공통 변환 확인
    if (COMMON_TRANSLATIONS[reason]) {
      return COMMON_TRANSLATIONS[reason];
    }

    // 부분 매치 시도
    for (const [key, translation] of Object.entries(COMMON_TRANSLATIONS)) {
      if (reason.includes(key.split(' - ')[0])) {
        return translation;
      }
    }

    // 합/충 관계는 간략화
    if (reason.includes('육합') || reason.includes('삼합')) {
      const match = reason.match(/([가-힣]+) 기운/);
      if (match) {
        const element = match[1];
        const elementDescriptions: Record<string, string> = {
          '화': '🔥 열정의 기운 결합',
          '수': '💧 지혜의 기운 결합',
          '목': '🌳 성장의 기운 결합',
          '금': '⚔️ 결단의 기운 결합',
          '토': '🏔️ 안정의 기운 결합',
        };
        return elementDescriptions[element] || `✨ ${element} 기운 활성화`;
      }
      return '✨ 긍정적인 기운 결합';
    }

    // 절기는 간략화
    if (reason.includes('절기')) {
      return '🌸 계절 에너지와 조화';
    }

    // 변환 불가시 원본 유지 (앞에 ✦ 제거하고 이모지 추가)
    return `✨ ${reason.replace(/^✦\s*/, '')}`;
  });
}

export default function LifePredictionPage() {
  return <LifePredictionContent />;
}

function LifePredictionContent() {
  const { locale } = useI18n();
  const { status } = useSession();
  const signInUrl = buildSignInUrl();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const [phase, setPhase] = useState<Phase>('birth-input');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentEventType, setCurrentEventType] = useState<EventType | null>(null);
  const [results, setResults] = useState<TimingPeriod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [guestBirthInfo, setGuestBirthInfo] = useState<GuestBirthInfo | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [generalAdvice, setGeneralAdvice] = useState<string>('');

  // 사용자 프로필 로드
  useEffect(() => {
    const loadProfile = async () => {
      if (status === 'loading') return;

      if (status !== 'authenticated') {
        setProfileLoading(false);
        setPhase('birth-input');
        return;
      }

      setProfileLoading(true);
      try {
        const res = await fetch('/api/me/profile', { cache: 'no-store' });
        if (res.ok) {
          const { user } = await res.json();
          if (user?.birthDate) {
            setUserProfile({
              name: user.name,
              birthDate: user.birthDate,
              birthTime: user.birthTime,
              birthCity: user.birthCity,
              gender: user.gender,
              latitude: user.latitude,
              longitude: user.longitude,
              timezone: user.tzId,
            });
            // 프로필이 있으면 바로 input 페이즈로
            setPhase('input');
          } else {
            // 프로필 없으면 생년월일 입력 필요
            setPhase('birth-input');
          }
        } else {
          setPhase('birth-input');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setPhase('birth-input');
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [status]);

  // 생년월일 입력 핸들러 (로그인 사용자는 프로필에 저장)
  const handleBirthInfoSubmit = useCallback(async (birthInfo: GuestBirthInfo) => {
    // 로그인한 사용자면 프로필에 저장
    if (status === 'authenticated') {
      try {
        const res = await fetch('/api/user/update-birth-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birthDate: birthInfo.birthDate,
            birthTime: birthInfo.birthTime,
            gender: birthInfo.gender,
            birthCity: birthInfo.birthCity,
          }),
        });

        if (res.ok) {
          // 프로필 상태 업데이트
          setUserProfile({
            birthDate: birthInfo.birthDate,
            birthTime: birthInfo.birthTime,
            gender: birthInfo.gender,
            birthCity: birthInfo.birthCity,
          });
        }
      } catch (err) {
        console.error('Failed to save birth info:', err);
      }
    } else {
      // 비로그인 사용자는 로컬 상태에만 저장
      setGuestBirthInfo(birthInfo);
    }

    setPhase('input');
  }, [status]);

  // 배경 애니메이션
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationId: number | null = null;
    let time = 0;
    let isRunning = false;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      const starCount = width < 640 ? 30 : width < 1024 ? 40 : 50;
      const orbCount = width < 640 ? 3 : 5;

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(10, 15, 30, 1)');
      gradient.addColorStop(0.5, 'rgba(20, 25, 50, 1)');
      gradient.addColorStop(1, 'rgba(15, 20, 40, 1)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // ?3, ?s"?3?
      for (let i = 0; i < starCount; i++) {
        const x = (Math.sin(time * 0.5 + i * 1.3) * 0.5 + 0.5) * width;
        const y = (Math.cos(time * 0.3 + i * 0.7) * 0.5 + 0.5) * height;
        const opacity = 0.1 + Math.sin(time * 2 + i) * 0.05;

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${opacity})`;
        ctx.fill();
      }

      // ??? ?,???o?s? ?>?
      for (let i = 0; i < orbCount; i++) {
        const x = (Math.sin(time + i * 1.2) * 0.3 + 0.5) * width;
        const y = (Math.cos(time * 0.7 + i * 0.8) * 0.3 + 0.5) * height;
        const radius = 100 + Math.sin(time + i) * 50;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${0.02 + Math.sin(time + i) * 0.01})`;
        ctx.fill();
      }
    };

    const animate = (timestamp = 0) => {
      if (!isRunning) return;
      if (timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp;
        time += 0.003;
        drawFrame();
      }
      animationId = requestAnimationFrame(animate);
    };

    const stop = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      isRunning = false;
    };

    const start = () => {
      if (isRunning) return;
      if (mediaQuery.matches || document.hidden) {
        drawFrame();
        return;
      }
      isRunning = true;
      lastFrame = 0;
      animate();
    };

    const handleVisibility = () => {
      if (mediaQuery.matches || document.hidden) {
        stop();
        drawFrame();
        return;
      }
      start();
    };

    const handleResize = () => {
      resizeCanvas();
      if (!isRunning) {
        drawFrame();
      }
    };

    resizeCanvas();
    handleVisibility();

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    mediaQuery.addEventListener('change', handleVisibility);

    return () => {
      stop();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      mediaQuery.removeEventListener('change', handleVisibility);
    };
  }, []);

  // API 호출 - 백엔드 RAG 기반 예측 시스템 사용
  const handleSubmit = useCallback(async (question: string, eventType: EventType | null) => {
    // 생년월일 정보 확인 (로그인 사용자 프로필 또는 게스트 입력)
    const birthInfo = userProfile?.birthDate
      ? {
          birthDate: userProfile.birthDate,
          birthTime: userProfile.birthTime || '12:00',
          gender: userProfile.gender || 'M',
        }
      : guestBirthInfo;

    if (!birthInfo?.birthDate) {
      setError(locale === 'ko'
        ? '먼저 생년월일 정보가 필요합니다.'
        : 'Please enter your birth information first.');
      setPhase('birth-input');
      return;
    }

    setCurrentQuestion(question);
    setCurrentEventType(eventType);
    setPhase('analyzing');
    setError(null);
    setGeneralAdvice('');

    try {
      // 생년월일 파싱
      const [birthYear, birthMonth, birthDay] = birthInfo.birthDate.split('-').map(Number);
      const [birthHour] = (birthInfo.birthTime || '12:00').split(':').map(Number);
      const gender = birthInfo.gender === 'M' ? 'male' : 'female';

      // 백엔드 RAG 기반 예측 API 호출
      const response = await fetch('/api/life-prediction/backend-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          birthYear,
          birthMonth,
          birthDay,
          birthHour,
          gender,
          type: 'timing',
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // 백엔드 서버 연결 실패 시 폴백 처리
        console.warn('Backend unavailable or error, using fallback. Error:', data.error);
        await handleFallbackPrediction(question, eventType, birthInfo);
        return;
      }

      // 백엔드 응답 처리
      if (data.data?.optimalPeriods) {
        const periods: TimingPeriod[] = data.data.optimalPeriods.map((p: {
          startDate: string;
          endDate: string;
          score: number;
          grade: string;
          reasons: string[];
          specificDays?: string[];
          rank?: number;
        }) => ({
          startDate: p.startDate,
          endDate: p.endDate,
          score: p.score,
          grade: p.grade as 'S' | 'A+' | 'A' | 'B' | 'C' | 'D',
          reasons: p.reasons || ['✨ 좋은 시기입니다'],
          specificDays: p.specificDays?.map((dateStr: string) => ({
            date: dateStr,
            quality: (p.score >= 85 ? 'excellent' : p.score >= 70 ? 'good' : 'neutral') as 'excellent' | 'good' | 'neutral',
          })),
        }));

        setResults(periods);
        setGeneralAdvice(data.data.generalAdvice || data.data.naturalAnswer || '');
      }

      setPhase('result');
    } catch (err) {
      console.error('Prediction failed:', err);
      setError(locale === 'ko'
        ? '예측 분석 중 오류가 발생했습니다. 다시 시도해주세요.'
        : 'An error occurred during analysis. Please try again.');
      setPhase('input');
    }
  }, [userProfile, guestBirthInfo, locale]);

  // 폴백: 백엔드 연결 실패 시 프론트엔드 API 사용
  const handleFallbackPrediction = useCallback(async (
    question: string,
    eventType: EventType | null,
    birthInfo: { birthDate: string; birthTime: string; gender: 'M' | 'F' }
  ) => {
    try {
      // AI 질문 분석
      let analyzedEventType = eventType;
      let eventLabel = '';
      try {
        const analyzeRes = await fetch('/api/life-prediction/analyze-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, locale }),
        });
        const analyzeData = await analyzeRes.json();
        if (analyzeData.success && analyzeData.data) {
          analyzedEventType = analyzeData.data.eventType as EventType;
          eventLabel = analyzeData.data.eventLabel;
          setCurrentEventType(analyzedEventType);
        }
      } catch (e) {
        console.warn('AI question analysis failed:', e);
        analyzedEventType = eventType || 'career';
      }

      // 생년월일 파싱
      const [birthYear, birthMonth, birthDay] = birthInfo.birthDate.split('-').map(Number);
      const gender = birthInfo.gender === 'M' ? 'male' : 'female';
      const currentYear = new Date().getFullYear();

      // 사주+점성 데이터 계산 (precompute-chart API 사용 - 크레딧 소모 없음)
      let chartData: {
        saju?: Record<string, unknown>;
        astro?: Record<string, unknown>;
        advancedAstro?: Record<string, unknown>;
      } | null = null;
      try {
        // 기본 위도/경도 (서울)
        const defaultLat = 37.5665;
        const defaultLon = 126.9780;

        const chartRes = await fetch('/api/precompute-chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birthDate: birthInfo.birthDate,
            birthTime: birthInfo.birthTime || '12:00',
            gender: birthInfo.gender,
            latitude: defaultLat,
            longitude: defaultLon,
            timezone: 'Asia/Seoul',
          }),
        });
        const chartResult = await chartRes.json();
        if (chartResult.saju) {
          chartData = {
            saju: chartResult.saju,
            astro: chartResult.astro,
            advancedAstro: chartResult.advancedAstro,
          };
        }
      } catch (e) {
        console.warn('Chart calculation failed:', e);
      }

      // 사주 데이터 추출
      const sajuData = chartData?.saju as Record<string, unknown> | null;

      // 사주 정보가 없으면 간단한 결과 반환
      if (!sajuData) {
        // 사주 계산 실패 시 간단한 기본 결과 제공
        const periods: TimingPeriod[] = [{
          startDate: `${currentYear + 1}-03-01`,
          endDate: `${currentYear + 1}-05-31`,
          score: 75,
          grade: 'B' as const,
          reasons: ['✨ 전반적으로 좋은 시기입니다', '🌱 새로운 시작에 적합한 에너지'],
        }];
        setResults(periods);
        setPhase('result');
        return;
      }

      // precompute-chart 응답 구조에서 사주 정보 추출
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pillars = (sajuData as any).pillars || {};
      const yearPillar = pillars.year || {};
      const monthPillar = pillars.month || {};
      const dayPillar = pillars.day || {};
      const timePillar = pillars.time || {};

      // 천간/지지 이름 추출
      const dayStem = dayPillar.heavenlyStem?.name || dayPillar.stem?.name || '';
      const dayBranch = dayPillar.earthlyBranch?.name || dayPillar.branch?.name || '';
      const monthBranch = monthPillar.earthlyBranch?.name || monthPillar.branch?.name || '';
      const yearBranch = yearPillar.earthlyBranch?.name || yearPillar.branch?.name || '';

      // 모든 천간/지지 수집
      const allStems = [
        yearPillar.heavenlyStem?.name || yearPillar.stem?.name,
        monthPillar.heavenlyStem?.name || monthPillar.stem?.name,
        dayPillar.heavenlyStem?.name || dayPillar.stem?.name,
        timePillar.heavenlyStem?.name || timePillar.stem?.name,
      ].filter(Boolean);

      const allBranches = [
        yearPillar.earthlyBranch?.name || yearPillar.branch?.name,
        monthPillar.earthlyBranch?.name || monthPillar.branch?.name,
        dayPillar.earthlyBranch?.name || dayPillar.branch?.name,
        timePillar.earthlyBranch?.name || timePillar.branch?.name,
      ].filter(Boolean);

      // 필수 데이터 확인
      if (!dayStem || !dayBranch) {
        console.warn('Missing required saju data:', { dayStem, dayBranch });
        const periods: TimingPeriod[] = [{
          startDate: `${currentYear + 1}-03-01`,
          endDate: `${currentYear + 1}-05-31`,
          score: 75,
          grade: 'B' as const,
          reasons: ['✨ 전반적으로 좋은 시기입니다', '🌱 새로운 시작에 적합한 에너지'],
        }];
        setResults(periods);
        setPhase('result');
        return;
      }

      // 점성 데이터 추출 (precompute-chart 응답에서)
      const astroData = chartData?.astro as Record<string, unknown> | null;
      const advancedAstroData = chartData?.advancedAstro as Record<string, unknown> | null;

      // 기존 프론트엔드 API 호출 (사주 + 점성 정보 포함)
      const response = await fetch('/api/life-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event-timing',
          birthYear,
          birthMonth,
          birthDay,
          gender,
          dayStem,
          dayBranch,
          monthBranch,
          yearBranch,
          allStems,
          allBranches,
          eventType: analyzedEventType || 'career',
          startYear: currentYear,
          endYear: currentYear + 3,
          locale,
          // 점성 데이터 전달
          astroChart: astroData,
          advancedAstro: advancedAstroData,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.optimalPeriods) {
        // AI로 결과 설명 생성 시도
        let aiExplainedPeriods = null;
        try {
          const explainRes = await fetch('/api/life-prediction/explain-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question,
              eventType: analyzedEventType || 'career',
              eventLabel: eventLabel || (analyzedEventType || 'career'),
              optimalPeriods: data.data.optimalPeriods,
              locale,
            }),
          });
          const explainData = await explainRes.json();
          if (explainData.success && explainData.data?.periods) {
            aiExplainedPeriods = explainData.data.periods;
          }
        } catch {
          console.warn('AI explanation failed, using raw results');
        }

        const periods: TimingPeriod[] = data.data.optimalPeriods.map((p: {
          startDate: string;
          endDate: string;
          score: number;
          grade: string;
          reasons: string[];
          specificDays?: string[];
        }, index: number) => ({
          startDate: p.startDate,
          endDate: p.endDate,
          score: p.score,
          grade: p.grade as 'S' | 'A+' | 'A' | 'B' | 'C' | 'D',
          reasons: aiExplainedPeriods?.[index]?.reasons || p.reasons || ['✨ 좋은 시기입니다'],
          specificDays: p.specificDays?.map((dateStr: string) => ({
            date: dateStr,
            quality: (p.score >= 85 ? 'excellent' : p.score >= 70 ? 'good' : 'neutral') as 'excellent' | 'good' | 'neutral',
          })),
        }));

        setResults(periods);
        setPhase('result');
      } else {
        throw new Error(data.error || 'Fallback API failed');
      }
    } catch (err) {
      console.error('Fallback prediction failed:', err);
      setError(locale === 'ko'
        ? '예측 분석 중 오류가 발생했습니다. 다시 시도해주세요.'
        : 'An error occurred during analysis. Please try again.');
      setPhase('input');
    }
  }, [locale]);

  // 새 질문하기
  const handleAskAgain = useCallback(() => {
    setPhase('input');
    setResults([]);
    setCurrentQuestion('');
    setCurrentEventType(null);
    setGeneralAdvice('');
  }, []);

  // 생년월일 다시 입력하기
  const handleChangeBirthInfo = useCallback(() => {
    setGuestBirthInfo(null);
    setUserProfile(null);
    setPhase('birth-input');
  }, []);

  // 로딩 중
  if (profileLoading) {
    return (
      <div className={styles.container}>
        <canvas ref={canvasRef} className={styles.backgroundCanvas} />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>{locale === 'ko' ? '로딩 중...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.backgroundCanvas} />
      <BackButton />

      <main className={styles.main}>
        {/* 크레딧 배지 */}
        <div className={styles.creditBadgeWrapper}>
          <CreditBadge variant="compact" />
        </div>

        <AnimatePresence mode="wait">
          {/* 생년월일 입력 페이즈 */}
          {phase === 'birth-input' && (
            <motion.div
              key="birth-input"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.phaseContainer}
            >
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>
                  🔮 {locale === 'ko' ? '인생 예측' : 'Life Prediction'}
                </h1>
                <p className={styles.pageSubtitle}>
                  {locale === 'ko'
                    ? '과거와 미래의 최적 시기를 알려드립니다'
                    : 'Find the optimal timing for your life events'}
                </p>
              </div>

              <BirthInfoForm
                onSubmit={handleBirthInfoSubmit}
                locale={locale as 'ko' | 'en'}
              />

              {status === 'unauthenticated' && (
                <div className={styles.loginHint}>
                  <p>
                    {locale === 'ko'
                      ? '로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요'
                      : 'Log in to save your info for a better experience'}
                  </p>
                  <a href={signInUrl} className={styles.loginLink}>
                    {locale === 'ko' ? '로그인하기' : 'Log in'}
                  </a>
                </div>
              )}
            </motion.div>
          )}

          {/* 입력 페이즈 */}
          {phase === 'input' && (
            <motion.div
              key="input"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.phaseContainer}
            >
              {/* 현재 생년월일 표시 */}
              {(userProfile?.birthDate || guestBirthInfo?.birthDate) && (
                <div className={styles.birthInfoDisplay}>
                  <span className={styles.birthInfoIcon}>🎂</span>
                  <span className={styles.birthInfoText}>
                    {userProfile?.birthDate || guestBirthInfo?.birthDate}
                    {(userProfile?.gender || guestBirthInfo?.gender) === 'M' ? ' 👨' : ' 👩'}
                  </span>
                  <button
                    className={styles.changeBirthBtn}
                    onClick={handleChangeBirthInfo}
                  >
                    {locale === 'ko' ? '변경' : 'Change'}
                  </button>
                </div>
              )}

              {/* 에러 표시 */}
              {error && (
                <div className={styles.errorNotice}>
                  <span className={styles.noticeIcon}>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              {/* 검색창 */}
              <PredictionChat
                onSubmit={handleSubmit}
                isLoading={false}
                compact={false}
              />
            </motion.div>
          )}

          {/* 분석 중 페이즈 */}
          {phase === 'analyzing' && (
            <motion.div
              key="analyzing"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.phaseContainer}
            >
              <AnalyzingLoader eventType={currentEventType || undefined} />
            </motion.div>
          )}

          {/* 결과 페이즈 */}
          {phase === 'result' && (
            <motion.div
              key="result"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.phaseContainer}
            >
              {/* 현재 생년월일 표시 */}
              {(userProfile?.birthDate || guestBirthInfo?.birthDate) && (
                <div className={styles.birthInfoDisplay}>
                  <span className={styles.birthInfoIcon}>🎂</span>
                  <span className={styles.birthInfoText}>
                    {userProfile?.birthDate || guestBirthInfo?.birthDate}
                    {(userProfile?.gender || guestBirthInfo?.gender) === 'M' ? ' 👨' : ' 👩'}
                  </span>
                  <button
                    className={styles.changeBirthBtn}
                    onClick={handleChangeBirthInfo}
                  >
                    {locale === 'ko' ? '변경' : 'Change'}
                  </button>
                </div>
              )}

              {/* 상단 검색창 (컴팩트) */}
              <PredictionChat
                onSubmit={handleSubmit}
                isLoading={false}
                compact={true}
              />

              {/* 질문 표시 */}
              <div className={styles.questionDisplay}>
                <span className={styles.questionIcon}>💬</span>
                <span className={styles.questionText}>{currentQuestion}</span>
              </div>

              {/* 결과 카드 */}
              <motion.div
                className={styles.resultsContainer}
                variants={cardContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.resultsHeader}>
                  <h2 className={styles.resultsTitle}>
                    {locale === 'ko' ? '최적 시기 분석 결과' : 'Optimal Timing Analysis'}
                  </h2>
                  <p className={styles.resultsSubtitle}>
                    {locale === 'ko'
                      ? `총 ${results.length}개의 추천 기간을 찾았습니다`
                      : `Found ${results.length} recommended periods`}
                  </p>
                </div>

                {results.map((period, index) => (
                  <TimingCard
                    key={index}
                    period={period}
                    rank={index}
                  />
                ))}
              </motion.div>

              {/* 결과 공유 */}
              {results.length > 0 && (
                <ResultShare
                  result={{
                    question: currentQuestion,
                    eventType: currentEventType || 'general',
                    topResult: {
                      startDate: results[0].startDate,
                      endDate: results[0].endDate,
                      score: results[0].score,
                      grade: results[0].grade,
                    },
                    allResults: results.map(r => ({
                      startDate: r.startDate,
                      endDate: r.endDate,
                      score: r.score,
                      grade: r.grade,
                      reasons: r.reasons,
                    })),
                    totalCount: results.length,
                    birthDate: userProfile?.birthDate || guestBirthInfo?.birthDate || '',
                    gender: (userProfile?.gender || guestBirthInfo?.gender || 'M') as 'M' | 'F',
                  }}
                  locale={locale as 'ko' | 'en'}
                  isLoggedIn={status === 'authenticated'}
                />
              )}

              {/* AI 상담사 채팅 */}
              <AdvisorChat
                predictionContext={{
                  question: currentQuestion,
                  eventType: currentEventType || 'general',
                  results: results.map(r => ({
                    startDate: String(r.startDate),
                    endDate: String(r.endDate),
                    score: r.score,
                    grade: r.grade,
                    reasons: r.reasons,
                  })),
                  birthDate: userProfile?.birthDate || guestBirthInfo?.birthDate || '',
                  gender: (userProfile?.gender || guestBirthInfo?.gender || 'M') as 'M' | 'F',
                }}
                locale={locale as 'ko' | 'en'}
              />

              {/* 다시 질문하기 버튼 */}
              <button className={styles.askAgainBtn} onClick={handleAskAgain}>
                <span>🔮</span>
                <span>{locale === 'ko' ? '다른 질문하기' : 'Ask Another Question'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
