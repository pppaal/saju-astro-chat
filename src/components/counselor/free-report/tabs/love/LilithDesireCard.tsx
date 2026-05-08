interface LilithDesireCardProps {
  lilithDesire: string
  isKo: boolean
}

export default function LilithDesireCard({ lilithDesire, isKo }: LilithDesireCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🌒</span>
        <h3 className="text-lg font-bold text-gray-300">
          {isKo ? '숨겨진 마음 (Lilith)' : 'Hidden Desires (Lilith)'}
        </h3>
      </div>
      <p className="text-gray-400 text-sm leading-relaxed">{lilithDesire}</p>
      <p className="text-gray-500 text-xs mt-3">
        {isKo
          ? '* 이 욕구를 인정하면 더 건강한 관계를 맺을 수 있어요.'
          : '* Acknowledging this can lead to healthier relationships.'}
      </p>
    </div>
  )
}
