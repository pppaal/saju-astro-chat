import type { DestinyNarrative } from '../../types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface CareerDestinyCardProps {
  destinyNarrative: DestinyNarrative | null | undefined;
  isKo: boolean;
}

export default function CareerDestinyCard({ destinyNarrative, isKo }: CareerDestinyCardProps) {
  if (!destinyNarrative?.careerDestiny) return null;
  const core = ensureMinSentenceText(
    (isKo ? destinyNarrative.careerDestiny.ko : destinyNarrative.careerDestiny.en) || '',
    isKo,
    'career',
    4
  );
  const detail = ensureMinSentenceText(
    (isKo ? destinyNarrative.careerDestiny.koDetail : destinyNarrative.careerDestiny.enDetail) || '',
    isKo,
    'career',
    5
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">💼</span>
        <h3 className="text-lg font-bold text-emerald-300">{isKo ? '커리어에서 나는 이런 사람이에요' : 'Who I Am at Work'}</h3>
      </div>
      <p className="text-gray-200 text-base leading-relaxed mb-3">
        {core}
      </p>
      <p className="text-gray-400 text-sm leading-relaxed">
        {detail}
      </p>
    </div>
  );
}
