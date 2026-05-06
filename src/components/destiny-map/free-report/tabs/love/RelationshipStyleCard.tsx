import type { DestinyNarrative } from '../../types';

interface RelationshipStyleCardProps {
  destinyNarrative: DestinyNarrative;
  isKo: boolean;
}

export default function RelationshipStyleCard({ destinyNarrative, isKo }: RelationshipStyleCardProps) {
  if (!destinyNarrative.relationshipStyle) return null;

  return (
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
  );
}
