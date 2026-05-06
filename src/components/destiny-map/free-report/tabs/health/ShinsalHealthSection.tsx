import type { HealthMatrixResult } from '../../analyzers/matrixAnalyzer'
import { ensureMinSentenceText } from '../shared/textDepth'

interface ShinsalHealthSectionProps {
  shinsalHealth: HealthMatrixResult['shinsalHealth']
  isKo: boolean
}

export default function ShinsalHealthSection({ shinsalHealth, isKo }: ShinsalHealthSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🔮</span>
        <h3 className="text-lg font-bold text-amber-300">
          {isKo ? '신살 × 행성 건강 분석' : 'Shinsal × Planet Health Analysis'}
        </h3>
      </div>

      <div className="space-y-3">
        {shinsalHealth.map((item, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{item.fusion.icon}</span>
              <span className="font-bold text-amber-300">{item.shinsal}</span>
              <span className="text-gray-400">×</span>
              <span className="text-gray-300">{item.planet}</span>
              <span
                className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  item.fusion.score >= 7
                    ? 'bg-green-500/30 text-green-300'
                    : item.fusion.score >= 4
                      ? 'bg-yellow-500/30 text-yellow-300'
                      : 'bg-red-500/30 text-red-300'
                }`}
              >
                {item.fusion.level}
              </span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {ensureMinSentenceText(
                isKo ? item.healthWarning.ko : item.healthWarning.en,
                isKo,
                'warning'
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
