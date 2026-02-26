import type { HiddenSelfAnalysis } from './types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface SpecialShinsalSectionProps {
  specialShinsal: NonNullable<HiddenSelfAnalysis['specialShinsal']>;
  isKo: boolean;
}

export default function SpecialShinsalSection({ specialShinsal, isKo }: SpecialShinsalSectionProps) {
  const enrich = (text?: string, min = 4) =>
    ensureMinSentenceText(text || '', isKo, 'hidden', min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⚔️</span>
        <div>
          <h3 className="text-lg font-bold text-indigo-300">{isKo ? '특수 신살 × 행성' : 'Special Shinsal × Planets'}</h3>
          <p className="text-gray-500 text-xs">{isKo ? '숨겨진 강점과 잠재력' : 'Hidden strengths and potential'}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 ml-auto">L8</span>
      </div>

      <div className="space-y-3">
        {specialShinsal.map((item, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{item.icon}</span>
              <span className="text-white font-bold text-sm">{item.shinsal}</span>
              <span className="text-gray-400">×</span>
              <span className="text-indigo-300 text-sm">{item.planet}</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              {enrich(isKo ? item.description.ko : item.description.en, 4)}
            </p>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-green-300 text-xs">
                <span className="font-bold">{isKo ? '숨겨진 강점: ' : 'Hidden strength: '}</span>
                {enrich(isKo ? item.hiddenStrength.ko : item.hiddenStrength.en, 3)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
