import type { HiddenSelfAnalysis } from './types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface LilithShadowCardProps {
  lilithShadow: NonNullable<HiddenSelfAnalysis['lilithShadow']>;
  isKo: boolean;
}

export default function LilithShadowCard({ lilithShadow, isKo }: LilithShadowCardProps) {
  const enrich = (text?: string, topic: 'hidden' | 'healing' = 'hidden', min = 4) =>
    ensureMinSentenceText(text || '', isKo, topic, min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{lilithShadow.icon}</span>
        <div>
          <h3 className="text-lg font-bold text-purple-300">{isKo ? '억압된 욕구 (Lilith)' : 'Suppressed Desires (Lilith)'}</h3>
          <p className="text-gray-500 text-xs">{isKo ? '무의식 속 숨겨진 본능과 욕망' : 'Hidden instincts and desires in the unconscious'}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 ml-auto">L10</span>
      </div>

      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{lilithShadow.fusion?.icon}</span>
          <span className="text-white font-medium">Lilith × {lilithShadow.element}</span>
          {lilithShadow.sibsin && (
            <span className="text-gray-400 text-sm">× {lilithShadow.sibsin}</span>
          )}
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          {enrich(isKo ? lilithShadow.description?.ko : lilithShadow.description?.en, 'hidden', 4)}
        </p>
        <div className="p-3 rounded-lg bg-purple-500/15 border border-purple-500/25">
          <p className="text-purple-300 text-xs font-bold mb-1">{isKo ? '💜 통합 방법' : '💜 Integration'}</p>
          <p className="text-gray-300 text-xs">
            {enrich(isKo ? lilithShadow.integration?.ko : lilithShadow.integration?.en, 'healing', 4)}
          </p>
        </div>
      </div>

      <p className="text-gray-500 text-xs">
        {enrich(
          isKo
          ? '* 릴리스는 억압된 본능적 욕구를 나타냅니다. 이를 인정하면 더 완전한 자아를 실현할 수 있어요.'
          : '* Lilith represents suppressed instinctual desires. Acknowledging them helps realize a more complete self.',
          'hidden',
          4
        )}
      </p>
    </div>
  );
}
