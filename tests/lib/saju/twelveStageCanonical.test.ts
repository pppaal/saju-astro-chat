/**
 * 12운성 이름 정규화 SSOT — canonicalTwelveStage (감사 CR-2).
 *
 * getTwelveStage 는 정통 표기 임관/왕지를 내고, 해석 사전·리포트 강점 표·명식 라벨·운흐름
 * 대운 글로스는 동의어 건록/제왕(/장생) 키를 쓴다. 리포트 강점 행이 정규화 없이 표를 찾아
 * 임관/왕지 일주(60 중 10 — 약 1/6)를 '약한 단계'로 읽었다. 같은 리포트의 명식 표는 이미
 * 건록/제왕으로 보여 줘 두 부분이 서로 모순됐다.
 *
 * 기대값은 엔진이 아니라 고전 규칙에서 독립적으로 만든다: 일간별 長生 지지(甲亥 丙寅 戊寅
 * 庚巳 壬申 / 乙午 丁酉 己酉 辛子 癸卯), 양간 순행·음간 역행, 火土同法. 60갑자 일주 전부를
 * 돌려 (1) 정규화된 이름이 고전 이름과 같고 (2) 강점 행의 강약 판정이 고전 강약과 같고
 * (3) EN 라벨이 한글을 흘리지 않는지 본다.
 */
import { describe, it, expect } from 'vitest'
import { canonicalTwelveStage, getTwelveStage, TWELVE_STAGE_SYNONYMS } from '@/lib/saju/shinsal'
import { getTwelveStageInterpretation } from '@/lib/saju/interpretations'
import { evalStrength } from '@/lib/report/natalCross'
import { stageLabel, stageHover } from '@/lib/report/integratedReportLabels'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
// 고전 12운성 순서 — 정본(해석 사전) 이름으로.
const CLASSICAL = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양']
const CHANGSAENG: Record<string, string> = {
  甲: '亥',
  乙: '午',
  丙: '寅',
  丁: '酉',
  戊: '寅',
  己: '酉',
  庚: '巳',
  辛: '子',
  壬: '申',
  癸: '卯',
}
const YIN = new Set(['乙', '丁', '己', '辛', '癸'])
function classicalStage(stem: string, branch: string): string {
  const start = BRANCHES.indexOf(CHANGSAENG[stem] as (typeof BRANCHES)[number])
  const at = BRANCHES.indexOf(branch as (typeof BRANCHES)[number])
  const diff = YIN.has(stem) ? (start - at + 12) % 12 : (at - start + 12) % 12
  return CLASSICAL[diff]
}
// 리포트 강점 행의 "강한 단계"(장생·관대·건록·제왕) / "약한 단계"(병·사·묘·절).
const STRONG = new Set(['장생', '관대', '건록', '제왕'])
const WEAK = new Set(['병', '사', '묘', '절'])

// 60갑자 일주 — 간지 짝(같은 음양)만.
const SIXTY: Array<[string, string]> = Array.from({ length: 60 }, (_, i) => [
  STEMS[i % 10],
  BRANCHES[i % 12],
])

const HANGUL = /[가-힣]/
const DOMICILE = { planet: 'Jupiter', status: 'domicile' }

describe('canonicalTwelveStage — 동의어 표', () => {
  it('임관→건록, 왕지→제왕, 양생→장생 이고 나머지는 그대로', () => {
    expect(canonicalTwelveStage('임관')).toBe('건록')
    expect(canonicalTwelveStage('왕지')).toBe('제왕')
    expect(canonicalTwelveStage('양생')).toBe('장생')
    for (const s of CLASSICAL) expect(canonicalTwelveStage(s)).toBe(s)
    expect(Object.keys(TWELVE_STAGE_SYNONYMS).sort()).toEqual(['양생', '왕지', '임관'])
  })

  it('정규화된 이름은 모두 해석 사전 키다', () => {
    for (const [stem, branch] of SIXTY) {
      const canon = canonicalTwelveStage(getTwelveStage(stem, branch))
      expect(
        getTwelveStageInterpretation(canon as never),
        `${stem}${branch} → ${canon}`
      ).toBeTruthy()
    }
  })
})

describe('60갑자 일주 전부 — 엔진 이름 정규화 = 고전 이름, 강점 행 = 고전 강약', () => {
  it('정규화된 엔진 단계가 고전 단계와 같다', () => {
    for (const [stem, branch] of SIXTY) {
      expect(canonicalTwelveStage(getTwelveStage(stem, branch)), `${stem}${branch}`).toBe(
        classicalStage(stem, branch)
      )
    }
  })

  it('엔진이 내는 원래 이름(임관/왕지 포함)을 넣어도 강점 행이 고전 강약대로 판정한다', () => {
    let aliasDays = 0
    for (const [stem, branch] of SIXTY) {
      const raw = getTwelveStage(stem, branch)
      if (raw === '임관' || raw === '왕지') aliasDays++
      const classical = classicalStage(stem, branch)
      const withDignity = evalStrength(raw, DOMICILE)!
      const noDignity = evalStrength(raw, null)!
      if (STRONG.has(classical)) {
        expect(withDignity.tone, `${stem}${branch} ${raw}`).toBe('resonant')
        expect(noDignity.tone, `${stem}${branch} ${raw}`).toBe('complement')
      } else {
        expect(withDignity.tone, `${stem}${branch} ${raw}`).toBe('complement')
        expect(noDignity.tone, `${stem}${branch} ${raw}`).toBe('neutral')
        if (WEAK.has(classical)) expect(noDignity.reason.ko).toContain('비축하는 단계')
      }
      // 같은 날의 동의어 이름은 같은 판정이다.
      expect(evalStrength(canonicalTwelveStage(raw), DOMICILE)).toEqual(withDignity)
    }
    // 임관 4일주(甲寅 乙卯 庚申 辛酉) + 왕지 6일주(丙午 丁巳 戊午 己巳 壬子 癸亥).
    expect(aliasDays).toBe(10)
  })

  it('庚申(임관)·壬子(왕지) — 감사 재현 일주는 강한 단계', () => {
    expect(getTwelveStage('庚', '申')).toBe('임관')
    expect(getTwelveStage('壬', '子')).toBe('왕지')
    expect(evalStrength(getTwelveStage('庚', '申'), DOMICILE)!.tone).toBe('resonant')
    expect(evalStrength(getTwelveStage('壬', '子'), null)!.tone).toBe('complement')
  })

  it('명식 라벨·툴팁도 같은 표 — EN 에 한글이 새지 않고 동의어끼리 같은 라벨', () => {
    for (const [stem, branch] of SIXTY) {
      const raw = getTwelveStage(stem, branch)
      const canon = canonicalTwelveStage(raw)
      expect(stageLabel(raw, 'ko')).toBe(canon)
      expect(stageLabel(raw, 'en')).toBe(stageLabel(canon, 'en'))
      expect(HANGUL.test(stageLabel(raw, 'en')), `${stem}${branch} ${raw}`).toBe(false)
      expect(stageHover(raw, 'en')).toBe(stageHover(canon, 'en'))
      expect(stageHover(raw, 'en').length).toBeGreaterThan(0)
    }
  })
})
