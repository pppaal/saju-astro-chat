interface PersonalizedAdvice {
  emoji: string;
  title: { ko: string; en: string };
  summary: { ko: string; en: string };
  detail: { ko: string; en: string };
  source?: string;
}

interface PersonalizedAdviceSectionProps {
  personalizedAdvices: PersonalizedAdvice[];
  isKo: boolean;
}

export default function PersonalizedAdviceSection({ personalizedAdvices, isKo }: PersonalizedAdviceSectionProps) {
  if (personalizedAdvices.length === 0) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">✨</span>
        <h3 className="text-lg font-bold text-indigo-300">{isKo ? '당신만을 위한 조언' : 'Advice Just For You'}</h3>
      </div>

      <div className="space-y-4">
        {personalizedAdvices.slice(0, 3).map((advice, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-white/5 to-indigo-500/5 border border-indigo-500/20">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-2xl flex-shrink-0">{advice.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-indigo-300 font-bold text-base">
                    {isKo ? advice.title.ko : advice.title.en}
                  </p>
                  {advice.source && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
                      {advice.source === 'sibsin' ? (isKo ? '십신' : 'Sibsin') :
                       advice.source === 'element-excess' ? (isKo ? '오행과다' : 'Element+') :
                       advice.source === 'element-deficient' ? (isKo ? '오행부족' : 'Element-') :
                       advice.source === 'sinsal' ? (isKo ? '신살' : 'Sinsal') :
                       advice.source === 'twelve-stage' ? (isKo ? '12운성' : '12 Stage') : ''}
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  {isKo ? advice.summary.ko : advice.summary.en}
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed pl-11">
              {isKo ? advice.detail.ko : advice.detail.en}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
