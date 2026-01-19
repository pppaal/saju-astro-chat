"use client";

import type { TabProps } from './types';
import { getLoveMatrixAnalysis, type LoveMatrixResult } from '../analyzers';
import { getLoveTimingAnalysis } from '../analyzers/matrixAnalyzer';
import type { LoveTimingResult } from '../analyzers/matrixAnalyzer';
import { PremiumReportCTA } from '../components';

interface LoveAnalysis {
  style: string;
  attract: string;
  ideal: string;
  danger: string;
  advice: string;
  compatibility: string[];
  lovePattern?: string;
  emotionalNeeds?: string;
  venusStyle?: string;
  sibsinLove?: string;
  venusHouse?: string;
  marsStyle?: string;
  moonVenusAspect?: string;
  // 새로 추가된 필드들
  junoPartner?: string;
  vertexMeeting?: string;
  lilithDesire?: string;
  romanceTiming?: string;
  charmScore?: number;
  attachmentStyle?: string;
  loveLanguage?: string;
  conflictStyle?: string;
}

export default function LoveTab({ isKo, data, destinyNarrative, saju, astro, lang }: TabProps) {
  // TabData.loveAnalysis is Record<string, unknown> | null, cast to local interface
  const loveAnalysis = data.loveAnalysis as LoveAnalysis | null;
  const loveMatrix = getLoveMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang) as LoveMatrixResult | null;
  const loveTiming = getLoveTimingAnalysis(saju ?? undefined, astro ?? undefined, isKo ? 'ko' : 'en') as LoveTimingResult | null;

  return (
    <div className="space-y-6">
      {/* 관계 스타일 */}
      {destinyNarrative?.relationshipStyle && (
        <div className="rounded-2xl bg-gradient-to-br from-rose-900/30 to-pink-900/30 border border-rose-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💝</span>
            <h3 className="text-lg font-bold text-rose-300">{isKo ? '사랑에서 나는 이런 사람이에요' : 'Who I Am in Love'}</h3>
          </div>
          <p className="text-gray-200 text-base leading-relaxed mb-3">
            {isKo ? destinyNarrative.relationshipStyle.ko : destinyNarrative.relationshipStyle.en}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            {isKo ? destinyNarrative.relationshipStyle.koDetail : destinyNarrative.relationshipStyle.enDetail}
          </p>
        </div>
      )}

      {/* 사랑 분석 */}
      {loveAnalysis && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💕</span>
            <h3 className="text-lg font-bold text-pink-300">{isKo ? "나는 사랑에서 어떤 사람인가" : "How I Love"}</h3>
          </div>

          <div className="space-y-4">
            {/* 연애 스타일 */}
            <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <p className="text-pink-300 font-bold mb-2 text-sm">💗 {isKo ? "당신의 사랑 스타일" : "Your Love Style"}</p>
              <p className="text-gray-200 text-sm leading-relaxed">{loveAnalysis.style}</p>
            </div>

            {/* 끌리는 타입 & 이상적인 파트너 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-300 font-bold mb-2 text-sm">✨ {isKo ? "끌리는 사람" : "Who Attracts You"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.attract}</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-300 font-bold mb-2 text-sm">💜 {isKo ? "이상적인 파트너" : "Ideal Partner"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.ideal}</p>
              </div>
            </div>

            {/* 연애 주의사항 */}
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-orange-300 font-bold mb-2 text-sm">⚡ {isKo ? "연애 위험 신호" : "Love Danger Signs"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.danger}</p>
            </div>

            {/* 궁합 좋은 타입 */}
            {loveAnalysis.compatibility.length > 0 && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-indigo-300 font-bold mb-2 text-sm">💫 {isKo ? "궁합 좋은 오행" : "Compatible Elements"}</p>
                <div className="flex flex-wrap gap-2">
                  {loveAnalysis.compatibility.map((el, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm">{el}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 7하우스 기반 파트너 패턴 & 십신 연애 에너지 */}
            {(loveAnalysis.lovePattern || loveAnalysis.sibsinLove) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loveAnalysis.lovePattern && (
                  <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                    <p className="text-fuchsia-300 font-bold text-sm mb-2">🏠 {isKo ? "파트너 패턴" : "Partner Pattern"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.lovePattern}</p>
                  </div>
                )}
                {loveAnalysis.sibsinLove && (
                  <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-violet-300 font-bold text-sm mb-2">🔮 {isKo ? "연애 에너지" : "Love Energy"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.sibsinLove}</p>
                  </div>
                )}
              </div>
            )}

            {/* 금성 하우스 & 화성 스타일 */}
            {(loveAnalysis.venusHouse || loveAnalysis.marsStyle) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loveAnalysis.venusHouse && (
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-cyan-300 font-bold text-sm mb-2">📍 {isKo ? "인연 만나는 곳" : "Where to Meet Love"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.venusHouse}</p>
                  </div>
                )}
                {loveAnalysis.marsStyle && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-300 font-bold text-sm mb-2">🔥 {isKo ? "표현 스타일" : "Expression Style"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.marsStyle}</p>
                  </div>
                )}
              </div>
            )}

            {/* 감정적 니즈 & 금성 스타일 */}
            {(loveAnalysis.emotionalNeeds || loveAnalysis.venusStyle) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loveAnalysis.emotionalNeeds && (
                  <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                    <p className="text-pink-300 font-bold text-sm mb-2">💞 {isKo ? "감정적 니즈" : "Emotional Needs"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.emotionalNeeds}</p>
                  </div>
                )}
                {loveAnalysis.venusStyle && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <p className="text-rose-300 font-bold text-sm mb-2">💎 {isKo ? "사랑 표현법" : "Love Expression"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.venusStyle}</p>
                  </div>
                )}
              </div>
            )}

            {/* 애착 스타일 & 사랑의 언어 */}
            {(loveAnalysis.attachmentStyle || loveAnalysis.loveLanguage) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loveAnalysis.attachmentStyle && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-purple-300 font-bold text-sm mb-2">🔗 {isKo ? "애착 스타일" : "Attachment Style"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.attachmentStyle}</p>
                  </div>
                )}
                {loveAnalysis.loveLanguage && (
                  <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-violet-300 font-bold text-sm mb-2">💬 {isKo ? "사랑의 언어" : "Love Language"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.loveLanguage}</p>
                  </div>
                )}
              </div>
            )}

            {/* 갈등 해결 스타일 */}
            {loveAnalysis.conflictStyle && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-300 font-bold text-sm mb-2">⚡ {isKo ? "갈등 해결 스타일" : "Conflict Resolution Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.conflictStyle}</p>
              </div>
            )}

            {/* 연애 조언 */}
            {loveAnalysis.advice && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20">
                <p className="text-sm flex items-start gap-3">
                  <span className="text-xl">💌</span>
                  <span className="text-pink-200 leading-relaxed">{loveAnalysis.advice}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 연애 매력도 & 타이밍 */}
      {loveAnalysis && (loveAnalysis.charmScore || loveAnalysis.romanceTiming) && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-rose-900/20 border border-rose-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💘</span>
            <h3 className="text-lg font-bold text-rose-300">{isKo ? "연애 매력 & 타이밍" : "Love Charm & Timing"}</h3>
          </div>

          <div className="space-y-4">
            {/* 매력도 점수 */}
            {loveAnalysis.charmScore && (
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-pink-300 font-bold text-sm">✨ {isKo ? "연애 매력도" : "Love Charm Score"}</p>
                  <span className="text-2xl font-bold text-pink-400">{loveAnalysis.charmScore}점</span>
                </div>
                <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-700"
                    style={{ width: `${loveAnalysis.charmScore}%` }}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  {isKo
                    ? loveAnalysis.charmScore >= 80 ? "이성에게 매우 매력적으로 보여요!"
                      : loveAnalysis.charmScore >= 60 ? "자연스러운 매력이 있어요."
                      : "내면의 매력을 더 표현해보세요."
                    : loveAnalysis.charmScore >= 80 ? "You're very attractive to others!"
                      : loveAnalysis.charmScore >= 60 ? "You have natural charm."
                      : "Try expressing your inner charm more."}
                </p>
              </div>
            )}

            {/* 연애 타이밍 */}
            {loveAnalysis.romanceTiming && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-300 font-bold text-sm mb-2">⏰ {isKo ? "연애 타이밍" : "Love Timing"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.romanceTiming}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 결혼 & 운명적 만남 */}
      {loveAnalysis && (loveAnalysis.junoPartner || loveAnalysis.vertexMeeting) && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💍</span>
            <h3 className="text-lg font-bold text-purple-300">{isKo ? "결혼 & 운명적 만남" : "Marriage & Fated Meetings"}</h3>
          </div>

          <div className="space-y-4">
            {/* Juno - 결혼 이상형 */}
            {loveAnalysis.junoPartner && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-300 font-bold text-sm mb-2">👰 {isKo ? "결혼 이상형 (Juno)" : "Marriage Ideal (Juno)"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.junoPartner}</p>
              </div>
            )}

            {/* Vertex - 운명적 만남 장소 */}
            {loveAnalysis.vertexMeeting && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-indigo-300 font-bold text-sm mb-2">🌟 {isKo ? "운명적 만남이 오는 곳" : "Where Fate Awaits"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.vertexMeeting}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 숨겨진 욕망 (Lilith) */}
      {loveAnalysis?.lilithDesire && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌒</span>
            <h3 className="text-lg font-bold text-gray-300">{isKo ? "숨겨진 마음 (Lilith)" : "Hidden Desires (Lilith)"}</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{loveAnalysis.lilithDesire}</p>
          <p className="text-gray-500 text-xs mt-3">
            {isKo ? "* 이 욕구를 인정하면 더 건강한 관계를 맺을 수 있어요." : "* Acknowledging this can lead to healthier relationships."}
          </p>
        </div>
      )}

      {/* 동서양 사랑 매트릭스 (Shinsal-Planet & Asteroid-House) */}
      {loveMatrix && (loveMatrix.shinsalLove.length > 0 || loveMatrix.asteroidLove.length > 0) && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔮</span>
            <h3 className="text-lg font-bold text-fuchsia-300">{isKo ? "동서양 사랑 매트릭스" : "East-West Love Matrix"}</h3>
          </div>

          {/* 사랑 점수 & 메시지 */}
          <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-fuchsia-300 font-bold text-sm">{isKo ? "사랑 에너지 점수" : "Love Energy Score"}</p>
              <span className="text-2xl font-bold text-fuchsia-400">{loveMatrix.loveScore}점</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-400 transition-all duration-700"
                style={{ width: `${loveMatrix.loveScore}%` }}
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {isKo ? loveMatrix.loveMessage.ko : loveMatrix.loveMessage.en}
            </p>
          </div>

          {/* 신살-행성 분석 (도화살, 홍염살 etc) */}
          {loveMatrix.shinsalLove.length > 0 && (
            <div className="space-y-3 mb-4">
              <p className="text-pink-300 font-bold text-sm flex items-center gap-2">
                <span>✧</span>
                {isKo ? "사랑 운명의 별" : "Stars of Love Destiny"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loveMatrix.shinsalLove.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border ${
                      item.fusion.level === 'extreme'
                        ? 'bg-pink-500/15 border-pink-500/30'
                        : item.fusion.level === 'amplify'
                        ? 'bg-rose-500/15 border-rose-500/30'
                        : item.fusion.level === 'conflict'
                        ? 'bg-orange-500/15 border-orange-500/30'
                        : 'bg-gray-500/15 border-gray-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.fusion.icon}</span>
                      <span className="text-white font-bold text-sm">{item.shinsal}</span>
                      <span className="text-gray-400">×</span>
                      <span className="text-pink-300 text-sm">{item.planet}</span>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed mb-1">
                      {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {isKo ? item.shinsalInfo.effect : item.shinsalInfo.effectEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 소행성-하우스 분석 (Juno, Ceres) */}
          {loveMatrix.asteroidLove.length > 0 && (
            <div className="space-y-3">
              <p className="text-purple-300 font-bold text-sm flex items-center gap-2">
                <span>☄️</span>
                {isKo ? "결혼/헌신 소행성" : "Marriage & Devotion Asteroids"}
              </p>
              <div className="space-y-3">
                {loveMatrix.asteroidLove.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{item.fusion.icon}</span>
                      <span className="text-white font-bold text-sm">
                        {isKo ? item.asteroidInfo.ko : item.asteroidInfo.en}
                      </span>
                      <span className="text-gray-400">×</span>
                      <span className="text-purple-300 text-sm">{item.house}{isKo ? '하우스' : 'H'}</span>
                      <span className="text-gray-500 text-xs">({item.lifeArea})</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-1">
                      {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {isKo ? item.asteroidInfo.theme : item.asteroidInfo.themeEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-gray-500 text-xs mt-4">
            {isKo
              ? "* 동양 신살(도화살 등)과 서양 행성/소행성의 융합 분석입니다."
              : "* Fusion analysis of Eastern Shinsal and Western planets/asteroids."}
          </p>
        </div>
      )}

      {/* 연애 타이밍 매트릭스 분석 (L4, L5, L10) */}
      {loveTiming && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⏰</span>
            <h3 className="text-lg font-bold text-pink-300">{isKo ? '연애 타이밍 매트릭스' : 'Love Timing Matrix'}</h3>
          </div>

          {/* 종합 연애 타이밍 점수 */}
          <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-pink-300 font-bold text-sm">{isKo ? '현재 연애 타이밍 점수' : 'Current Love Timing Score'}</p>
              <span className="text-2xl font-bold text-pink-400">{loveTiming.timingScore}{isKo ? '점' : 'pts'}</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-700"
                style={{ width: `${loveTiming.timingScore}%` }}
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {isKo ? loveTiming.timingMessage.ko : loveTiming.timingMessage.en}
            </p>
          </div>

          <div className="space-y-4">
            {/* 연애 타이밍 분석 (L4) */}
            {loveTiming.romanticTiming && loveTiming.romanticTiming.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💕</span>
                  <p className="text-rose-300 font-bold text-sm">{isKo ? '연애 타이밍 흐름' : 'Romantic Timing Flow'}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">L4</span>
                </div>
                <div className="space-y-3">
                  {loveTiming.romanticTiming.slice(0, 3).map((timing, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-gray-800/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{timing.fusion.icon}</span>
                        <span className="text-white font-medium text-sm">{timing.timing}</span>
                        <span className="text-gray-400">×</span>
                        <span className="text-rose-300 text-sm">{timing.transit}</span>
                      </div>
                      <p className="text-gray-300 text-xs leading-relaxed mb-1">
                        {isKo ? timing.fusion.keyword.ko : timing.fusion.keyword.en}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {isKo ? timing.advice.ko : timing.advice.en}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 관계 패턴 분석 (L5) */}
            {loveTiming.relationshipPattern && loveTiming.relationshipPattern.length > 0 && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔗</span>
                  <p className="text-purple-300 font-bold text-sm">{isKo ? '관계 패턴 매트릭스' : 'Relationship Pattern Matrix'}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">L5</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {loveTiming.relationshipPattern.slice(0, 4).map((pattern, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-gray-800/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{pattern.fusion.icon}</span>
                        <span className="text-white font-medium text-sm">{pattern.relation}</span>
                        <span className="text-gray-400">×</span>
                        <span className="text-purple-300 text-sm">{pattern.aspect}</span>
                      </div>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        {isKo ? pattern.meaning.ko : pattern.meaning.en}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vertex 운명적 만남 (L10) */}
            {loveTiming.destinyMeeting && (
              <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{loveTiming.destinyMeeting.fusion.icon}</span>
                  <p className="text-fuchsia-300 font-bold text-sm">{isKo ? '운명의 만남 포인트' : 'Fated Meeting Point'}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300">L10</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-medium">Vertex × {loveTiming.destinyMeeting.element}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-2">
                  {isKo ? loveTiming.destinyMeeting.fusion.keyword.ko : loveTiming.destinyMeeting.fusion.keyword.en}
                </p>
                <p className="text-fuchsia-400 text-xs">
                  {isKo ? loveTiming.destinyMeeting.prediction.ko : loveTiming.destinyMeeting.prediction.en}
                </p>
              </div>
            )}
          </div>

          <p className="text-gray-500 text-xs mt-4">
            {isKo
              ? "* 역행, 지지관계, 운명점 등 복합 분석입니다."
              : "* Complex analysis of retrogrades, relations, and fate points."}
          </p>
        </div>
      )}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="love"
        matrixData={{ loveMatrix, loveTiming }}
      />
    </div>
  );
}
