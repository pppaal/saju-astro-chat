import type { HealthMatrixResult } from '../../analyzers/matrixAnalyzer'
import { ensureMinSentenceText } from '../shared/textDepth'
import { getElementColor, getElementEmoji, getStatusColor, getStatusText } from './healthHelpers'

interface ElementBalanceSectionProps {
  elementBalance: HealthMatrixResult['elementBalance']
  isKo: boolean
}

export default function ElementBalanceSection({
  elementBalance,
  isKo,
}: ElementBalanceSectionProps) {
  const summaryBase = isKo
    ? '오행 점수는 절대평가가 아니라 현재 에너지 편중을 보여주는 지도입니다.'
    : 'Element scores are a map of current imbalance, not an absolute grade.'

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⚖️</span>
        <h3 className="text-lg font-bold text-purple-300">
          {isKo ? '오행 건강 밸런스' : 'Five Element Health Balance'}
        </h3>
      </div>

      <div className="space-y-3">
        {elementBalance.map((el, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span>{getElementEmoji(el.element)}</span>
                <span className="text-gray-300">{el.element}</span>
              </span>
              <span className={`font-medium ${getStatusColor(el.status)}`}>
                {el.score}% · {getStatusText(el.status, isKo)}
              </span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${getElementColor(el.element)} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(el.score * 3, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-300 leading-relaxed">
        {ensureMinSentenceText(summaryBase, isKo, 'health')}
      </p>
      <p className="mt-2 text-xs text-gray-400">
        {isKo
          ? '* 이상적인 균형은 각 오행이 15-25% 범위입니다.'
          : '* Ideal balance is 15-25% for each element.'}
      </p>
    </div>
  )
}
