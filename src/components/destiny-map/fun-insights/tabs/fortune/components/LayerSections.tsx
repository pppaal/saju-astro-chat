// src/components/destiny-map/fun-insights/tabs/fortune/components/LayerSections.tsx
"use client";

interface TimingOverlay {
  timingInfo: { ko: string; en: string };
  transitInfo: { ko: string; en: string };
  fusion: {
    keyword: { ko: string; en: string };
    description: { ko: string; en: string };
    color: string;
    icon: string;
    score: number;
  };
  advice?: string;
}

interface RelationAspect {
  relationInfo: { ko: string; en: string };
  aspectInfo: { ko: string; en: string };
  fusion: {
    keyword: { ko: string; en: string };
    description: { ko: string; en: string };
    color: string;
    icon: string;
    score: number;
  };
  advice?: string;
}

interface AdvancedAnalysisItem {
  patternInfo: { ko: string; en: string };
  progressionInfo: { ko: string; en: string };
  fusion: {
    keyword: { ko: string; en: string };
    description: { ko: string; en: string };
    color: string;
    icon: string;
    score: number;
  };
  advice?: string;
}

interface ExtraPointItem {
  pointInfo: { ko: string; en: string; theme: string; themeEn: string };
  fusion: {
    keyword: { ko: string; en: string };
    description: { ko: string; en: string };
    color: string;
    icon: string;
    score: number;
  };
  advice?: string;
}

interface TimingOverlaySectionProps {
  timingOverlays: TimingOverlay[];
  isKo: boolean;
}

export function TimingOverlaySection({ timingOverlays, isKo }: TimingOverlaySectionProps) {
  if (!timingOverlays || timingOverlays.length === 0) {return null;}

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⏰</span>
        <h3 className="text-lg font-bold text-cyan-300">
          {isKo ? "타이밍 오버레이" : "Timing Overlay"}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">Layer 4</span>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        {isKo
          ? "대운/세운과 행성 트랜짓이 만나 시간의 결을 보여줍니다."
          : "Where Daeun/Seun meets planetary transits, revealing the texture of time."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {timingOverlays.map((timing, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${timing.fusion.color}10`,
              border: `1px solid ${timing.fusion.color}25`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{timing.fusion.icon}</span>
                <span className="text-sm font-bold" style={{ color: timing.fusion.color }}>
                  {isKo ? timing.fusion.keyword.ko : timing.fusion.keyword.en}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                {timing.fusion.score}/10
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-1">
              {isKo ? timing.timingInfo.ko : timing.timingInfo.en} × {isKo ? timing.transitInfo.ko : timing.transitInfo.en}
            </p>
            <p className="text-sm text-gray-300">
              {isKo ? timing.fusion.description.ko : timing.fusion.description.en}
            </p>
            {timing.advice && (
              <p className="text-xs text-cyan-400 mt-2">💡 {timing.advice}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RelationAspectSectionProps {
  relationAspects: RelationAspect[];
  isKo: boolean;
}

export function RelationAspectSection({ relationAspects, isKo }: RelationAspectSectionProps) {
  if (!relationAspects || relationAspects.length === 0) {return null;}

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🔗</span>
        <h3 className="text-lg font-bold text-pink-300">
          {isKo ? "관계-애스펙트 융합" : "Relation-Aspect Fusion"}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">Layer 5</span>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        {isKo
          ? "지지 관계(삼합, 육합, 충)와 천체 애스펙트가 만나 에너지 흐름을 보여줍니다."
          : "Branch relations meet planetary aspects, showing energy flow."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {relationAspects.map((rel, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${rel.fusion.color}10`,
              border: `1px solid ${rel.fusion.color}25`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{rel.fusion.icon}</span>
                <span className="text-sm font-bold" style={{ color: rel.fusion.color }}>
                  {isKo ? rel.fusion.keyword.ko : rel.fusion.keyword.en}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                {rel.fusion.score}/10
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-1">
              {isKo ? rel.relationInfo.ko : rel.relationInfo.en} × {isKo ? rel.aspectInfo.ko : rel.aspectInfo.en}
            </p>
            <p className="text-sm text-gray-300">
              {isKo ? rel.fusion.description.ko : rel.fusion.description.en}
            </p>
            {rel.advice && (
              <p className="text-xs text-pink-400 mt-2">💡 {rel.advice}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface AdvancedAnalysisSectionProps {
  advancedAnalysis: AdvancedAnalysisItem[];
  isKo: boolean;
}

export function AdvancedAnalysisSection({ advancedAnalysis, isKo }: AdvancedAnalysisSectionProps) {
  if (!advancedAnalysis || advancedAnalysis.length === 0) {return null;}

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-bold text-amber-300">
          {isKo ? "고급 분석" : "Advanced Analysis"}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Layer 7</span>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        {isKo
          ? "격국과 프로그레션이 만나 당신의 인생 패턴을 심층 분석합니다."
          : "Geokguk meets Progressions for deep life pattern analysis."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {advancedAnalysis.map((adv, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${adv.fusion.color}10`,
              border: `1px solid ${adv.fusion.color}25`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{adv.fusion.icon}</span>
                <span className="text-sm font-bold" style={{ color: adv.fusion.color }}>
                  {isKo ? adv.fusion.keyword.ko : adv.fusion.keyword.en}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                {adv.fusion.score}/10
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-1">
              {isKo ? adv.patternInfo.ko : adv.patternInfo.en} × {isKo ? adv.progressionInfo.ko : adv.progressionInfo.en}
            </p>
            <p className="text-sm text-gray-300">
              {isKo ? adv.fusion.description.ko : adv.fusion.description.en}
            </p>
            {adv.advice && (
              <p className="text-xs text-amber-400 mt-2">💡 {adv.advice}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ExtraPointsSectionProps {
  extraPoints: ExtraPointItem[];
  isKo: boolean;
}

export function ExtraPointsSection({ extraPoints, isKo }: ExtraPointsSectionProps) {
  if (!extraPoints || extraPoints.length === 0) {return null;}

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">✨</span>
        <h3 className="text-lg font-bold text-indigo-300">
          {isKo ? "숨겨진 포인트" : "Hidden Points"}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">Layer 10</span>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        {isKo
          ? "카이론, 릴리스 등 특별한 천체와 오행/십신이 만나 숨겨진 잠재력을 드러냅니다."
          : "Chiron, Lilith, and other special points meet elements, revealing hidden potential."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {extraPoints.map((point, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${point.fusion.color}10`,
              border: `1px solid ${point.fusion.color}25`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{point.fusion.icon}</span>
                <span className="text-sm font-bold" style={{ color: point.fusion.color }}>
                  {isKo ? point.pointInfo.ko : point.pointInfo.en}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                {point.fusion.score}/10
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-1">
              {isKo ? point.pointInfo.theme : point.pointInfo.themeEn}
            </p>
            <p className="text-sm text-gray-300 mb-1">
              {isKo ? point.fusion.keyword.ko : point.fusion.keyword.en}
            </p>
            <p className="text-xs text-gray-400">
              {isKo ? point.fusion.description.ko : point.fusion.description.en}
            </p>
            {point.advice && (
              <p className="text-xs text-indigo-400 mt-2">💡 {point.advice}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
