import { getTwelveStage } from '@/lib/saju/shinsal'
import { computeDayBranch } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'

/**
 * 12운성 (十二運星) 일진 추출기.
 *
 * 일간(日干) 기준으로 매일의 12운성 결정.
 * 12운성 = 한 사람의 에너지 상태를 12단계로 본 사이클.
 *
 * 활성 윈도우: 그 1일.
 */

// 12운성별 polarity + 의미
const STAGE_POLARITY: Record<string, Polarity> = {
  장생:  2,    // 새로운 시작·생기
  목욕: -1,    // 변화·불안정
  관대:  1,    // 성장·자립
  임관:  2,    // 성숙·실력 발휘  (= 건록)
  건록:  2,
  왕지:  2,    // 절정             (= 제왕)
  제왕:  2,
  쇠:    0,    // 안정에서 하강
  병:   -1,    // 약화
  사:   -2,    // 끝맺음
  묘:   -1,    // 수렴·매장
  절:   -2,    // 단절
  태:    1,    // 새로 잉태
  양:    1,    // 자라남
}

const STAGE_LABEL: Record<string, string> = {
  장생: '장생 — 새 출발',
  목욕: '목욕 — 변화·시행착오',
  관대: '관대 — 자립·성장',
  임관: '임관 — 실력 발휘',
  건록: '건록 — 실력 발휘',
  왕지: '왕지 — 절정',
  제왕: '제왕 — 절정',
  쇠:   '쇠 — 안정 하강',
  병:   '병 — 기운 약화',
  사:   '사 — 끝맺음',
  묘:   '묘 — 수렴',
  절:   '절 — 단절',
  태:   '태 — 잉태',
  양:   '양 — 자라남',
}

const sajuTwelveStageExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'pillar-sibsin',   // 별도 SignalKind 안 만들고 pillar-sibsin에 묶음
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const dayStemName = natal.saju.pillars.day.heavenlyStem.name
    if (!dayStemName) return []

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetBranch = computeDayBranch(date)
      if (!targetBranch) continue

      const stage = getTwelveStage(dayStemName, targetBranch)
      if (!stage) continue
      const polarity = STAGE_POLARITY[stage] ?? 0
      if (polarity === 0) continue   // 쇠는 중립 → 신호로 안 띄움

      const dayIso = date.toISOString().slice(0, 10)
      signals.push({
        id: `saju.twelve-stage.${dayIso}.${stage}`,
        source: 'saju',
        kind: 'pillar-sibsin',
        name: STAGE_LABEL[stage] ?? `12운성 ${stage}`,
        korean: STAGE_LABEL[stage],
        themes: ['personality'],   // 기본; tagger가 보강 가능
        polarity,
        layer: 'daily',
        active: {
          start: `${dayIso}T00:00:00.000Z`,
          peak:  `${dayIso}T12:00:00.000Z`,
          end:   `${dayIso}T23:59:59.999Z`,
        },
        weight: 0.45,   // 일진 12운성은 부드러운 신호
        evidence: {
          module: 'saju-twelve-stage',
          detail: {
            twelveStage: stage,
            dayStem: dayStemName,
            targetBranch,
          },
        },
      })
    }

    return signals
  },
}

export default sajuTwelveStageExtractor
