'use client'

import { Sparkles } from 'lucide-react'
import type { ImportantDate } from './types'

interface Props {
  importantDate: ImportantDate | null
}

/**
 * Daily 활성 흐름 카드 — 활성 신호와 신살을 글로 풀어씀.
 *
 * 기존:
 *  - ActiveSignalsList (리스트 ↑↑ ↓↓ 형태)
 *  - 발동 중인 신살 (칩 분리)
 *
 * 신규:
 *  - 2~3 단락 narrative (매칭 패턴 헤드라인 + 신살 + 큰 흐름)
 *  - 신살명은 본문 안에 자연스럽게 녹임
 *
 * 룰 없이 신호 데이터에서 직접 합성 (룰 DB는 monthly에만).
 */
export default function DailyFlowCard({ importantDate }: Props) {
  if (!importantDate) return null

  const patterns = importantDate.matchedPatterns ?? []
  const shinsalActive = importantDate.shinsalActive ?? []
  const signals = importantDate.engineSignals ?? []

  if (patterns.length === 0 && shinsalActive.length === 0 && signals.length === 0) {
    return null
  }

  // 1. 핵심 헤드라인 (매칭 패턴 1번째)
  const lead = patterns[0]?.headline

  // 2. 신살 — 길/흉 분류해 문장으로
  const luckyShinsal = shinsalActive.filter((s) => s.type === 'lucky').map((s) => s.name)
  const unluckyShinsal = shinsalActive.filter((s) => s.type === 'unlucky').map((s) => s.name)
  const neutralShinsal = shinsalActive
    .filter((s) => s.type !== 'lucky' && s.type !== 'unlucky')
    .map((s) => s.name)

  // 3. 큰 흐름 신호 — decadal/yearly에서 강한 거 1~2개
  const bigFlow = [...signals]
    .filter((s) => (s.layer === 'decadal' || s.layer === 'yearly') && Math.abs(s.polarity) >= 2)
    .sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)
    .slice(0, 2)

  // 4. 일진 디테일 — daily peak 신호 1~2개
  const dailyDetail = [...signals]
    .filter((s) => s.layer === 'daily' && Math.abs(s.polarity) >= 2)
    .sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)
    .slice(0, 2)

  return (
    <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
      <h3 className="text-base font-bold text-zinc-200 mb-3 flex items-center gap-2 tracking-wider uppercase">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        오늘의 활성 흐름
      </h3>

      <div className="text-base text-zinc-200 leading-relaxed space-y-3">
        {/* 핵심 한 줄 */}
        {lead && (
          <p className="text-amber-200 font-bold text-base">{lead}.</p>
        )}

        {/* 큰 흐름 + 일진 디테일 */}
        {(bigFlow.length > 0 || dailyDetail.length > 0) && (
          <p>
            {bigFlow.length > 0 && (
              <>
                현재{' '}
                {bigFlow.map((s, i) => (
                  <span key={s.id}>
                    <span className={s.polarity > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {s.korean ?? s.name}
                    </span>
                    {i < bigFlow.length - 1 ? '·' : ''}
                  </span>
                ))}
                의 큰 흐름이 작동하고 있어요.{' '}
              </>
            )}
            {dailyDetail.length > 0 && (
              <>
                오늘 특히{' '}
                {dailyDetail.map((s, i) => (
                  <span key={s.id}>
                    <span className={s.polarity > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {s.korean ?? s.name}
                    </span>
                    {i < dailyDetail.length - 1 ? ', ' : ''}
                  </span>
                ))}
                {' '}이(가) 두드러집니다.
              </>
            )}
          </p>
        )}

        {/* 신살 — 길/흉 따로 문장으로 */}
        {(luckyShinsal.length > 0 || unluckyShinsal.length > 0 || neutralShinsal.length > 0) && (
          <p className="text-sm text-zinc-300">
            {luckyShinsal.length > 0 && (
              <>
                길성 발동:{' '}
                <span className="text-emerald-300 font-medium">
                  {luckyShinsal.join(', ')}
                </span>
                {(unluckyShinsal.length > 0 || neutralShinsal.length > 0) ? ' · ' : ''}
              </>
            )}
            {unluckyShinsal.length > 0 && (
              <>
                흉살 발동:{' '}
                <span className="text-rose-300 font-medium">
                  {unluckyShinsal.join(', ')}
                </span>
                {neutralShinsal.length > 0 ? ' · ' : ''}
              </>
            )}
            {neutralShinsal.length > 0 && (
              <>
                도화·역마 등:{' '}
                <span className="text-amber-300 font-medium">
                  {neutralShinsal.join(', ')}
                </span>
              </>
            )}
          </p>
        )}

        {/* 매칭 패턴 액션 추천 */}
        {patterns.length > 0 && (
          <p className="text-xs text-zinc-400 pt-2 border-t border-white/5">
            {patterns
              .filter((p) => p.action)
              .slice(0, 2)
              .map((p) => p.action)
              .join(' ')}
          </p>
        )}
      </div>
    </div>
  )
}
