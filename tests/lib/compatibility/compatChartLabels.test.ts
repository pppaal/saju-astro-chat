/**
 * 궁합 차트(CompatChartModal) 표시층 i18n 가드.
 *
 * computeSajuSynastryFacts 가 내보내는 KO 정본 토큰(일간 relation·오행·태그·배우자성
 * sibsin)을 EN 헬퍼로 렌더했을 때 Hangul 이 새지 않아야 한다. 예전엔 facts 의 KO
 * prose(relationLabel/role)·토큰이 EN 차트 UI 로 그대로 새어, EN 사용자에게 한글이
 * 노출됐다. 새 토큰이 facts 에 추가됐는데 EN 라벨이 빠지면 이 sweep 이 잡는다.
 */
import { describe, it, expect } from 'vitest'
import { computeSajuSynastryFacts } from '@/lib/compatibility/sajuSynastryFormatter'
import {
  elLabel,
  tagLabel,
  sibsinLabel,
  dayMasterRelationText,
  spouseFeeling,
} from '@/lib/compatibility/compatChartLabels'

const HANGUL = /[가-힣]/
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const sweepPillars = (seed: number) =>
  [0, 1, 2, 3].map((k) => ({
    stem: STEMS[(seed * 7 + k * 3) % 10],
    branch: BRANCHES[(seed * 5 + k * 4) % 12],
  }))

// facts 의 모든 표시 토큰을 EN 헬퍼로 렌더한 문자열들.
function renderedEnFields(seedA: number, seedB: number): string[] {
  const facts = computeSajuSynastryFacts({
    pillarsA: sweepPillars(seedA),
    pillarsB: sweepPillars(seedB + 13),
  })
  const out: string[] = []
  if (facts.dayMaster) {
    const dm = facts.dayMaster
    out.push(elLabel(dm.aEl, false), elLabel(dm.bEl, false))
    out.push(dayMasterRelationText(dm.relation, dm.aEl, dm.bEl, false))
  }
  for (const s of facts.spouseStars) {
    out.push(sibsinLabel(s.sibsin, false), spouseFeeling(s.sibsin, s.role, false))
  }
  for (const r of facts.pillarRelations) {
    out.push(...r.tags.map((t) => tagLabel(t, false)))
  }
  return out
}

describe('compat chart labels — EN display purity', () => {
  it('renders every facts token in EN with no Hangul (wide sweep)', () => {
    const leaks = new Set<string>()
    for (let a = 0; a < 30; a++) {
      for (let b = 0; b < 30; b++) {
        for (const field of renderedEnFields(a, b)) {
          if (HANGUL.test(field)) leaks.add(field)
        }
      }
    }
    expect([...leaks], `Hangul leaked in EN chart labels:\n${[...leaks].join('\n')}`).toEqual([])
  })

  it('KO mode still renders Korean (not accidentally English-only)', () => {
    const facts = computeSajuSynastryFacts({
      pillarsA: [
        { stem: '甲', branch: '子' },
        { stem: '乙', branch: '丑' },
        { stem: '甲', branch: '寅' },
        { stem: '乙', branch: '卯' },
      ],
      pillarsB: [
        { stem: '庚', branch: '午' },
        { stem: '辛', branch: '未' },
        { stem: '庚', branch: '申' },
        { stem: '辛', branch: '酉' },
      ],
    })
    expect(facts.dayMaster).not.toBeNull()
    const dm = facts.dayMaster!
    expect(HANGUL.test(dayMasterRelationText(dm.relation, dm.aEl, dm.bEl, true))).toBe(true)
    expect(elLabel(dm.aEl, true)).toBe(dm.aEl)
  })

  it('EN day-master relation covers every relation enum branch', () => {
    const branches: Array<'same' | 'aControlsB' | 'bControlsA' | 'generate'> = [
      'same',
      'aControlsB',
      'bControlsA',
      'generate',
    ]
    for (const rel of branches) {
      const en = dayMasterRelationText(rel, '목', '화', false)
      expect(HANGUL.test(en), `relation ${rel} leaked Hangul: ${en}`).toBe(false)
    }
  })
})
