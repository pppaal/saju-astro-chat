import type { HealthMatrixResult } from '../../analyzers/matrixAnalyzer'
import { ensureMinSentenceText } from '../shared/textDepth'

interface VulnerableAreasSectionProps {
  vulnerableAreas: HealthMatrixResult['vulnerableAreas']
  isKo: boolean
}

export default function VulnerableAreasSection({
  vulnerableAreas,
  isKo,
}: VulnerableAreasSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-rose-900/20 border border-rose-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <h3 className="text-lg font-bold text-rose-300">
          {isKo ? '건강 취약 포인트' : 'Health Vulnerability Points'}
        </h3>
      </div>

      <div className="space-y-3">
        {vulnerableAreas.map((area, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border ${
              area.risk === 'high'
                ? 'bg-rose-500/10 border-rose-500/30'
                : 'bg-orange-500/10 border-orange-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{area.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-bold ${area.risk === 'high' ? 'text-rose-300' : 'text-orange-300'}`}
                  >
                    {area.organ}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      area.risk === 'high'
                        ? 'bg-rose-500/30 text-rose-300'
                        : 'bg-orange-500/30 text-orange-300'
                    }`}
                  >
                    {area.risk === 'high'
                      ? isKo
                        ? '주의 필요'
                        : 'Attention'
                      : isKo
                        ? '관찰 필요'
                        : 'Monitor'}
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {ensureMinSentenceText(area.advice, isKo, 'warning')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
