"use client";

import { memo } from 'react';
import { findPlanetSign } from '../utils';
import { dayMasterData } from '../data';
import type { AstroData, SajuData, TabData } from '../types';

// ============ 상수 정의 ============
const CHART = {
  CENTER_X: 150,
  CENTER_Y: 150,
  MAX_RADIUS: 110,
  SIDES: 5,
  BACKGROUND_LEVELS: [0.2, 0.4, 0.6, 0.8, 1.0] as const,
} as const;

const SCORE_LIMITS = {
  MAX: 95,
  MIN: 0,
  FULL: 100,
} as const;

const DEFAULT_SCORES = {
  STRENGTH: 75,
  BALANCE: 78,
  POTENTIAL: 76,
  LUCK: 74,
  STABILITY: 70,
  ELEMENT_RATIO: 0.2,
} as const;

const SCORE_LEVELS = {
  EXCELLENT: { threshold: 75, ko: "최상", en: "Excellent", color: "text-green-400", bg: "bg-green-500/20" },
  GOOD: { threshold: 55, ko: "양호", en: "Good", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  AVERAGE: { threshold: 40, ko: "보통", en: "Average", color: "text-orange-400", bg: "bg-orange-500/20" },
  NEEDS_CARE: { threshold: 0, ko: "보완필요", en: "Needs Care", color: "text-red-400", bg: "bg-red-500/20" },
} as const;

// 별자리 → 원소 매핑 (점성학)
const SIGN_TO_ELEMENT: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water"
};

// 사주 오행 → 점성학 원소 매핑
const SAJU_TO_ASTRO_ELEMENT: Record<string, string> = {
  "목": "air", "木": "air",
  "화": "fire", "火": "fire",
  "토": "earth", "土": "earth",
  "금": "air", "金": "air",
  "수": "water", "水": "water",
};

// 원소 시너지 계산용 - 상생 관계
const ELEMENT_SYNERGY_PAIRS: ReadonlyArray<[string, string]> = [
  ["fire", "air"], ["air", "fire"],
  ["earth", "water"], ["water", "earth"],
];

// ============ 유틸리티 함수 ============
const clampScore = (v: unknown): number => {
  if (typeof v === 'number') {return Math.max(SCORE_LIMITS.MIN, Math.min(SCORE_LIMITS.FULL, v));}
  return 0;
};

const capAt95 = (score: number): number => Math.min(SCORE_LIMITS.MAX, Math.round(score));

const getScoreLevel = (score: number) => {
  if (score >= SCORE_LEVELS.EXCELLENT.threshold) {return SCORE_LEVELS.EXCELLENT;}
  if (score >= SCORE_LEVELS.GOOD.threshold) {return SCORE_LEVELS.GOOD;}
  if (score >= SCORE_LEVELS.AVERAGE.threshold) {return SCORE_LEVELS.AVERAGE;}
  return SCORE_LEVELS.NEEDS_CARE;
};

// 원소 시너지 점수 계산
const calculateElementSynergy = (el1: string | null, el2: string | null, sameScore: number, compatibleScore: number, defaultScore: number): number => {
  if (!el1 || !el2) {return 0;}
  if (el1 === el2) {return sameScore;}
  if (ELEMENT_SYNERGY_PAIRS.some(([a, b]) => a === el1 && b === el2)) {return compatibleScore;}
  return defaultScore;
};

// 차트 포인트 계산
const getChartPoint = (index: number, radius: number) => {
  const angleStep = (2 * Math.PI) / CHART.SIDES;
  const startAngle = -Math.PI / 2;
  const angle = startAngle + index * angleStep;
  return {
    x: CHART.CENTER_X + radius * Math.cos(angle),
    y: CHART.CENTER_Y + radius * Math.sin(angle),
  };
};

interface PentagonChartProps {
  saju?: SajuData | null;
  astro?: AstroData | null;
  lang: string;
  isKo: boolean;
  data?: TabData | null;
}

const PentagonChart = memo(function PentagonChart({ saju, astro, lang, isKo, data }: PentagonChartProps) {
  const sc = saju?.advancedAnalysis?.score ?? {};
  const strength = saju?.advancedAnalysis?.extended?.strength ?? {};
  const geokguk = saju?.advancedAnalysis?.extended?.geokguk ?? {};
  const yongsinData = saju?.advancedAnalysis?.extended?.yongsin ?? {};
  const tonggeun = saju?.advancedAnalysis?.tonggeun ?? {};

  // ============ 사주 점수 계산 (95점 상한 알고리즘) ============
  const strengthTotal = clampScore(strength.total) || clampScore(strength.score) || DEFAULT_SCORES.STRENGTH;
  const sajuEnergy = capAt95(strengthTotal * 1.1);

  const elementScores = saju?.advancedAnalysis?.elementScores ?? [];
  let sajuBalance: number = DEFAULT_SCORES.BALANCE;
  if (elementScores.length > 0) {
    const ratios = elementScores.map((e) => e.ratio ?? DEFAULT_SCORES.ELEMENT_RATIO);
    const maxRatio = Math.max(...ratios);
    const minRatio = Math.min(...ratios);
    const diff = maxRatio - minRatio;
    sajuBalance = capAt95(Math.max(55, 105 - (diff * 120)));
  } else {
    sajuBalance = capAt95(clampScore(sc.balance) || clampScore(sc.elementBalance) || DEFAULT_SCORES.BALANCE);
  }

  const sajuPotential = capAt95(clampScore(geokguk.purity) || clampScore(sc.structure) || clampScore(sc.geokguk) || DEFAULT_SCORES.POTENTIAL);
  const sajuLuck = capAt95(clampScore(yongsinData.fitScore) || clampScore(sc.yongsin) || clampScore(sc.usefulGod) || DEFAULT_SCORES.LUCK);
  const sajuStability = capAt95(clampScore(tonggeun.score) || clampScore(tonggeun.totalScore) || DEFAULT_SCORES.STABILITY);

  // ============ 점성학 점수 계산 ============
  const sunSign = findPlanetSign(astro, "sun");
  const moonSign = findPlanetSign(astro, "moon");
  const ascSign = astro?.ascendant?.sign?.toLowerCase() ?? null;
  const dm = data?.dayMasterName ?? "";

  const dmInfo = dayMasterData[dm];
  const dmElement = dmInfo?.element || "";
  const dmAstroElement = SAJU_TO_ASTRO_ELEMENT[dmElement] || null;

  const sunElement = sunSign ? SIGN_TO_ELEMENT[sunSign.toLowerCase()] : null;
  const moonElement = moonSign ? SIGN_TO_ELEMENT[moonSign.toLowerCase()] : null;
  const ascElement = ascSign ? SIGN_TO_ELEMENT[ascSign.toLowerCase()] : null;

  // ============ 사주-점성학 시너지 계산 (중복 로직 함수화) ============
  const sunMoonHarmony = calculateElementSynergy(sunElement, moonElement, 15, 10, 5);
  const dmSunSynergy = calculateElementSynergy(dmAstroElement, sunElement, 15, 10, 3);
  const dmMoonSynergy = calculateElementSynergy(dmAstroElement, moonElement, 12, 8, 3);
  const ascBonus = ascElement ? (dmAstroElement === ascElement ? 12 : 6) : 0;

  // ============ 통합 5축 점수 ============
  const innerPower = Math.min(100, Math.round(
    sajuEnergy * 0.65 + (sunSign ? (25 + dmSunSynergy * 1.0) : sajuEnergy * 0.35)
  ));

  const harmony = Math.min(100, Math.round(
    sajuBalance * 0.55 + sunMoonHarmony * 1.2 + (dmSunSynergy + dmMoonSynergy) * 0.6
  ));

  const potential = Math.min(100, Math.round(
    sajuPotential * 0.65 + ascBonus * 1.2 + (ascSign ? 15 : sajuPotential * 0.25)
  ));

  const totalSynergy = dmSunSynergy + dmMoonSynergy + sunMoonHarmony;
  const fortune = Math.min(100, Math.round(
    sajuLuck * 0.55 + Math.min(30, totalSynergy * 1.0) + (sunSign && moonSign ? 15 : 8)
  ));

  const stability = Math.min(100, Math.round(
    sajuStability * 0.65 + dmMoonSynergy * 1.2 + (moonSign ? 18 : sajuStability * 0.25)
  ));

  const scores = [
    { label: isKo ? "내면의 힘" : "Inner Power", value: innerPower, color: "#f472b6", emoji: "💪", desc: isKo ? "자신감과 추진력" : "Confidence & Drive" },
    { label: isKo ? "조화" : "Harmony", value: harmony, color: "#60a5fa", emoji: "☯️", desc: isKo ? "균형과 어울림" : "Balance & Compatibility" },
    { label: isKo ? "잠재력" : "Potential", value: potential, color: "#34d399", emoji: "🌟", desc: isKo ? "숨겨진 가능성" : "Hidden Possibilities" },
    { label: isKo ? "행운력" : "Fortune", value: fortune, color: "#a78bfa", emoji: "🍀", desc: isKo ? "운이 따르는 정도" : "How luck follows you" },
    { label: isKo ? "안정감" : "Stability", value: stability, color: "#fbbf24", emoji: "🏠", desc: isKo ? "기반과 든든함" : "Foundation & Security" },
  ];

  const totalScore = Math.round(
    innerPower * 0.25 + harmony * 0.20 + potential * 0.20 + fortune * 0.20 + stability * 0.15
  );

  const level = getScoreLevel(totalScore);

  // 오각형 차트 계산 (상수 사용)
  const dataPoints = scores.map((s, i) => getChartPoint(i, (s.value / SCORE_LIMITS.FULL) * CHART.MAX_RADIUS));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-yellow-900/20 border border-yellow-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-bold text-yellow-300">{isKo ? "종합 운세 점수" : "Overall Fortune Score"}</h3>
        <span className={`ml-auto px-2 py-1 rounded-full text-xs font-bold ${level.color} ${level.bg}`}>
          {isKo ? level.ko : level.en}
        </span>
      </div>

      {/* 동양+서양 운세 시스템 통합 배지 */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="flex justify-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">
            ☯️ {isKo ? "동양 운세 (65%)" : "Eastern Fortune (65%)"}
          </span>
          <span className="text-gray-500">+</span>
          <span className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
            ⭐ {isKo ? "서양 운세 (35%)" : "Western Fortune (35%)"}
          </span>
        </div>
        <p className="text-xs text-gray-400 text-center">
          {isKo ? "사주팔자 + 점성술 융합 분석" : "Combined Four Pillars + Astrology analysis"}
        </p>
      </div>

      {/* 오각형 레이더 차트 */}
      <div className="flex flex-col items-center mb-6">
        <svg viewBox="0 0 300 300" className="w-72 h-72 md:w-80 md:h-80">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* 배경 오각형들 */}
          {CHART.BACKGROUND_LEVELS.map((lvl, idx) => {
            const points = Array.from({ length: CHART.SIDES }, (_, i) => {
              const p = getChartPoint(i, CHART.MAX_RADIUS * lvl);
              return `${p.x},${p.y}`;
            }).join(' ');
            const isOuterRing = idx === CHART.BACKGROUND_LEVELS.length - 1;
            return (
              <polygon
                key={idx}
                points={points}
                fill="none"
                stroke={isOuterRing ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}
                strokeWidth={isOuterRing ? "1.5" : "1"}
              />
            );
          })}

          {/* 축 선 */}
          {scores.map((_, i) => {
            const p = getChartPoint(i, CHART.MAX_RADIUS);
            return (
              <line
                key={i}
                x1={CHART.CENTER_X}
                y1={CHART.CENTER_Y}
                x2={p.x}
                y2={p.y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            );
          })}

          {/* 데이터 영역 */}
          <path
            d={dataPath}
            fill="url(#chartGradient)"
            stroke="#eab308"
            strokeWidth="2.5"
            filter="url(#glow)"
          />

          {/* 데이터 포인트 */}
          {dataPoints.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="8"
                fill={scores[i].color}
                stroke="white"
                strokeWidth="2"
                filter="url(#glow)"
              />
              <text
                x={p.x}
                y={p.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[8px] font-bold fill-white"
              >
                {scores[i].value}
              </text>
            </g>
          ))}

          {/* 레이블 */}
          {scores.map((s, i) => {
            const labelPoint = getChartPoint(i, CHART.MAX_RADIUS + 30);
            return (
              <g key={i}>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-sm"
                >
                  {s.emoji}
                </text>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[11px] fill-gray-300 font-medium"
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          {/* 중앙 총점 */}
          <circle cx={CHART.CENTER_X} cy={CHART.CENTER_Y} r="32" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <text
            x={CHART.CENTER_X}
            y={CHART.CENTER_Y - 4}
            textAnchor="middle"
            className="text-2xl font-bold fill-white"
          >
            {totalScore}
          </text>
          <text
            x={CHART.CENTER_X}
            y={CHART.CENTER_Y + 14}
            textAnchor="middle"
            className="text-[10px] fill-gray-400"
          >
            {isKo ? "종합점수" : "Total"}
          </text>
        </svg>
      </div>

      {/* 세부 점수 카드 */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {scores.map((s, i) => (
          <div key={i} className="p-2 rounded-xl bg-white/5 text-center border border-white/5 hover:border-white/20 transition-all">
            <div className="text-lg mb-1">{s.emoji}</div>
            <div className="text-[10px] text-gray-400 mb-1">{s.label}</div>
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 강점/약점 요약 */}
      <div className="space-y-3">
        {scores.filter(s => s.value >= 70).length > 0 && (
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💪</span>
              <span className="text-green-400 font-bold text-sm">{isKo ? "강점" : "Strengths"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {scores.filter(s => s.value >= 70).map((s, i) => (
                <span key={i} className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">
                  {s.emoji} {s.label} {s.value}점
                </span>
              ))}
            </div>
          </div>
        )}

        {scores.filter(s => s.value < 60).length > 0 && (
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <span className="text-orange-400 font-bold text-sm">{isKo ? "보완 필요" : "Needs Improvement"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {scores.filter(s => s.value < 60).map((s, i) => (
                <span key={i} className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">
                  {s.emoji} {s.label} {s.value}점
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default PentagonChart;
