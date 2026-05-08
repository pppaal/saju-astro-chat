import type { HealthMatrixResult } from '../../analyzers/matrixAnalyzer'
import { ensureMinSentenceText } from '../shared/textDepth'
import type { ChironInsight } from './types'

interface ChironDeepAnalysisProps {
  chironHealing: HealthMatrixResult['chironHealing']
  chironInsight: ChironInsight | null
  isKo: boolean
}

export default function ChironDeepAnalysis({
  chironHealing,
  chironInsight,
  isKo,
}: ChironDeepAnalysisProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-indigo-900/30 border border-pink-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{chironHealing?.icon || chironInsight?.emoji || '💫'}</span>
        <h3 className="text-lg font-bold text-pink-300">
          {isKo ? 'Chiron 치유 심층 분석' : 'Chiron Deep Healing Analysis'}
        </h3>
      </div>

      {chironHealing ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <p className="text-pink-300 font-bold mb-2 text-sm">
              💔 {isKo ? '상처 영역' : 'Wound Area'}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {ensureMinSentenceText(
                isKo ? chironHealing.woundArea.ko : chironHealing.woundArea.en,
                isKo,
                'healing'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-300 font-bold mb-2 text-sm">
              🌈 {isKo ? '치유 경로' : 'Healing Path'}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {ensureMinSentenceText(
                isKo ? chironHealing.healingPath.ko : chironHealing.healingPath.en,
                isKo,
                'healing'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-300 font-bold mb-2 text-sm">
              ✨ {isKo ? '치유자 잠재력' : 'Healer Potential'}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {ensureMinSentenceText(
                isKo ? chironHealing.healerPotential.ko : chironHealing.healerPotential.en,
                isKo,
                'healing'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-sm text-gray-400">{isKo ? '치유력' : 'Healing Power'}</span>
            <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                style={{ width: `${chironHealing.score * 10}%` }}
              />
            </div>
            <span className="text-pink-400 font-bold">{chironHealing.score}/10</span>
          </div>
        </div>
      ) : (
        chironInsight && (
          <>
            <p className="text-gray-200 leading-relaxed text-sm mb-4">
              {ensureMinSentenceText(chironInsight.message, isKo, 'healing')}
            </p>
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <p className="text-sm text-pink-200 leading-relaxed">
                {ensureMinSentenceText(
                  isKo
                    ? '치유는 약점을 인정하는 것에서 시작됩니다. 당신의 상처는 결국 다른 사람을 돕는 강점으로 전환될 수 있습니다.'
                    : 'Healing begins with acknowledging weakness. Your wounds can transform into strength that helps others.',
                  isKo,
                  'healing'
                )}
              </p>
            </div>
          </>
        )
      )}
    </div>
  )
}
