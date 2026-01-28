import type { HealthMatrixResult } from '../../analyzers/matrixAnalyzer';
import { getVitalityColor } from './healthHelpers';

interface VitalityScoreCardProps {
  matrixHealth: HealthMatrixResult;
  isKo: boolean;
}

export default function VitalityScoreCard({ matrixHealth, isKo }: VitalityScoreCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/30 border border-emerald-500/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💚</span>
          <h3 className="text-lg font-bold text-emerald-300">
            {isKo ? "종합 생명력 지수" : "Vitality Index"}
          </h3>
        </div>
        <div className="text-3xl font-bold text-emerald-400">
          {matrixHealth.vitalityScore}<span className="text-lg text-emerald-500">/100</span>
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

      <p className="text-gray-300 text-sm">
        {matrixHealth.vitalityScore >= 80
          ? (isKo ? "훌륭한 생명력! 현재 상태를 유지하세요." : "Excellent vitality! Maintain your current state.")
          : matrixHealth.vitalityScore >= 60
          ? (isKo ? "양호한 상태예요. 몇 가지 균형을 맞추면 더 좋아져요." : "Good shape. A few adjustments will improve things.")
          : matrixHealth.vitalityScore >= 40
          ? (isKo ? "관리가 필요해요. 아래 조언을 참고하세요." : "Care is needed. Refer to the advice below.")
          : (isKo ? "집중적인 관리가 필요해요. 건강을 최우선으로 하세요." : "Intensive care is needed. Make health your priority.")}
      </p>
    </div>
  );
}
