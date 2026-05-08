// src/components/counselor/free-report/tabs/fortune/components/LifeCycleSection.tsx
"use client";

import { ensureMinSentenceText } from '../../shared/textDepth';

interface LifeCycle {
  stage: string;
  lifeArea: string;
  stageInfo: { ko: string; en: string };
  fusion: {
    keyword: { ko: string; en: string };
    color: string;
    icon: string;
    score: number;
  };
}

interface LifeCycleSectionProps {
  lifeCycles: LifeCycle[];
  isKo: boolean;
}

export default function LifeCycleSection({ lifeCycles, isKo }: LifeCycleSectionProps) {
  if (lifeCycles.length === 0) {return null;}
  const enrich = (text?: string, min = 3) =>
    ensureMinSentenceText(text || '', isKo, 'fortune', min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/20 border border-violet-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🔄</span>
        <h3 className="text-lg font-bold text-violet-300">{isKo ? "생명력 사이클" : "Life Energy Cycle"}</h3>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        {enrich(
          isKo
          ? "12운성과 하우스가 만나 당신의 생명력이 어디에서 어떻게 흐르는지 보여줍니다."
          : "Where your life energy flows based on 12 Life Stages × Houses.",
          4
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {lifeCycles.map((cycle, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${cycle.fusion.color}10`,
              border: `1px solid ${cycle.fusion.color}25`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cycle.fusion.icon}</span>
                <span className="text-sm font-bold" style={{ color: cycle.fusion.color }}>
                  {cycle.stage}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                {cycle.lifeArea}
              </span>
            </div>
            <p className="text-sm text-gray-300 mb-1">
              {enrich(isKo ? cycle.fusion.keyword.ko : cycle.fusion.keyword.en, 3)}
            </p>
            <p className="text-xs text-gray-500">
              {enrich(isKo ? cycle.stageInfo.ko.split(' - ')[1] : cycle.stageInfo.en.split(' - ')[1], 3)}
            </p>
          </div>
        ))}
      </div>

      {/* Cycle Summary */}
      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
        <p className="text-violet-300 font-bold text-sm mb-2">
          {isKo ? "💫 생명력 흐름 요약" : "💫 Life Energy Summary"}
        </p>
        <p className="text-gray-300 text-sm">
          {enrich((() => {
            const highEnergy = lifeCycles.filter(c => c.fusion.score >= 8);
            const lowEnergy = lifeCycles.filter(c => c.fusion.score <= 4);

            if (highEnergy.length >= 2) {
              return isKo
                ? `${highEnergy.map(c => c.lifeArea).join(', ')} 영역에서 강한 에너지가 흐르고 있어요!`
                : `Strong energy flows in ${highEnergy.map(c => c.lifeArea).join(', ')} areas!`;
            } else if (lowEnergy.length >= 2) {
              return isKo
                ? `${lowEnergy.map(c => c.lifeArea).join(', ')} 영역은 충전이 필요해요.`
                : `${lowEnergy.map(c => c.lifeArea).join(', ')} areas need recharging.`;
            }
            return isKo
              ? "전반적으로 균형 잡힌 에너지 흐름을 보이고 있어요."
              : "Overall balanced energy flow.";
          })(), 4)}
        </p>
      </div>
    </div>
  );
}
