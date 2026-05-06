import type { HealthMatrixResult } from '../../analyzers/matrixAnalyzer'
import { ensureMinSentenceText } from '../shared/textDepth'
import { getVitalityColor } from './healthHelpers'

interface VitalityScoreCardProps {
  matrixHealth: HealthMatrixResult
  isKo: boolean
}

export default function VitalityScoreCard({ matrixHealth, isKo }: VitalityScoreCardProps) {
  const summaryText =
    matrixHealth.vitalityScore >= 80
      ? isKo
        ? '훌륭한 생명력입니다. 현재 루틴을 유지하면 회복 탄력이 계속 좋아집니다.'
        : 'Excellent vitality. Keeping your routine will sustain recovery.'
      : matrixHealth.vitalityScore >= 60
        ? isKo
          ? '양호한 상태입니다. 수면과 식사 리듬만 조금 더 정리하면 체감이 빠르게 좋아집니다.'
          : 'Good condition. Better sleep and meal rhythm will improve your condition fast.'
        : matrixHealth.vitalityScore >= 40
          ? isKo
            ? '관리 구간에 들어왔습니다. 무리한 일정 조정보다 기본 회복 루틴부터 고정하는 것이 중요합니다.'
            : 'You are in a care zone. Stabilize basic recovery habits before hard scheduling.'
          : isKo
            ? '집중 관리가 필요한 상태입니다. 당분간은 생산성보다 회복 우선 전략으로 전환하는 것이 안전합니다.'
            : 'Intensive care is needed. Prioritize recovery over productivity for now.'

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/30 border border-emerald-500/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💚</span>
          <h3 className="text-lg font-bold text-emerald-300">
            {isKo ? '종합 생명력 지수' : 'Vitality Index'}
          </h3>
        </div>
        <div className="text-3xl font-bold text-emerald-400">
          {matrixHealth.vitalityScore}
          <span className="text-lg text-emerald-500">/100</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getVitalityColor(matrixHealth.vitalityScore)} transition-all duration-500 rounded-full`}
            style={{ width: `${matrixHealth.vitalityScore}%` }}
          />
        </div>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">
        {ensureMinSentenceText(summaryText, isKo, 'health')}
      </p>
    </div>
  )
}
