import type { HiddenSelfAnalysis } from './types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface VertexFateCardProps {
  vertex: NonNullable<HiddenSelfAnalysis['vertex']>;
  isKo: boolean;
}

export default function VertexFateCard({ vertex, isKo }: VertexFateCardProps) {
  const enrich = (text?: string, min = 4) =>
    ensureMinSentenceText(text || '', isKo, 'hidden', min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{vertex.icon}</span>
        <div>
          <h3 className="text-lg font-bold text-fuchsia-300">{isKo ? '운명의 만남 (Vertex)' : 'Fated Meetings (Vertex)'}</h3>
          <p className="text-gray-500 text-xs">{isKo ? '운명적 만남과 인생 전환점' : 'Fated encounters and life turning points'}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 ml-auto">L10</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🤝</span>
            <p className="text-fuchsia-300 font-bold text-sm">{isKo ? '운명적 만남 패턴' : 'Fated Meeting Pattern'}</p>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {enrich(isKo ? vertex.fatePattern.ko : vertex.fatePattern.en, 4)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔄</span>
            <p className="text-purple-300 font-bold text-sm">{isKo ? '인생 전환점' : 'Life Turning Points'}</p>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {enrich(isKo ? vertex.turningPoints.ko : vertex.turningPoints.en, 4)}
          </p>
        </div>
      </div>
    </div>
  );
}
