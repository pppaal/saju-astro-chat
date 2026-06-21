/**
 * sajuSynastryFormatter — 두 사람의 4기둥 cross(일간·천간합/충·지지 합/충/형/해/파·
 * 배우자성·오행 균형) 포매터 + 구조화 팩트.
 *
 * Pure (deps: hyeong/pillarLookup/shinsal/ganjiKo, all pure). The file sat at
 * ~22% line coverage; these tests pin computeSajuSynastryFacts' structured
 * output against doctrine and exercise formatSajuSynastry's guards + sections.
 *
 * 오행 매핑(검증 기준): 甲乙=목 丙丁=화 戊己=토 庚辛=금 壬癸=수.
 * 극(EL_CONTROLS): 목→토 토→수 수→화 화→금 금→목.
 */
import {
  formatSajuSynastry,
  computeSajuSynastryFacts,
  type SajuPillarInput,
} from '@/lib/compatibility/sajuSynastryFormatter'

const P = (stem: string, branch: string): SajuPillarInput => ({ stem, branch })

// [년, 월, 일, 시] — index 2 = 일주(day pillar)
function pillars(
  y: [string, string],
  m: [string, string],
  d: [string, string],
  h: [string, string]
): SajuPillarInput[] {
  return [P(...y), P(...m), P(...d), P(...h)]
}

describe('computeSajuSynastryFacts — dayMaster relation', () => {
  it('flags same element (비화)', () => {
    const facts = computeSajuSynastryFacts({
      pillarsA: pillars(['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['乙', '卯']),
      pillarsB: pillars(['乙', '亥'], ['甲', '戌'], ['乙', '巳'], ['甲', '午']),
    })
    expect(facts.dayMaster?.relation).toBe('same')
    expect(facts.dayMaster?.aEl).toBe('목')
    expect(facts.dayMaster?.bEl).toBe('목')
    expect(facts.dayMaster?.relationLabel).toContain('비화')
  })

  it('flags A-controls-B (목극토)', () => {
    const facts = computeSajuSynastryFacts({
      pillarsA: pillars(['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['乙', '卯']),
      pillarsB: pillars(['戊', '辰'], ['己', '丑'], ['戊', '辰'], ['己', '未']),
    })
    expect(facts.dayMaster?.relation).toBe('aControlsB')
    expect(facts.dayMaster?.relationLabel).toContain('목극토')
  })

  it('flags B-controls-A (토 일간 A, 목 일간 B)', () => {
    const facts = computeSajuSynastryFacts({
      pillarsA: pillars(['戊', '辰'], ['己', '丑'], ['戊', '辰'], ['己', '未']),
      pillarsB: pillars(['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['乙', '卯']),
    })
    expect(facts.dayMaster?.relation).toBe('bControlsA')
  })

  it('flags generate/상생 (목 → 화)', () => {
    const facts = computeSajuSynastryFacts({
      pillarsA: pillars(['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['乙', '卯']),
      pillarsB: pillars(['丙', '寅'], ['丁', '卯'], ['丙', '午'], ['丁', '巳']),
    })
    expect(facts.dayMaster?.relation).toBe('generate')
    expect(facts.dayMaster?.relationLabel).toContain('상생')
  })

  it('returns null dayMaster when a day stem is missing', () => {
    const facts = computeSajuSynastryFacts({
      pillarsA: pillars(['甲', '子'], ['乙', '丑'], ['', '寅'], ['乙', '卯']),
      pillarsB: pillars(['丙', '寅'], ['丁', '卯'], ['丙', '午'], ['丁', '巳']),
    })
    expect(facts.dayMaster).toBeNull()
  })
})

describe('computeSajuSynastryFacts — pillar relations & balance', () => {
  // A: 甲子 丙寅 庚午 壬辰  /  B: 己丑 甲申 乙未 丁亥
  const richInput = {
    pillarsA: pillars(['甲', '子'], ['丙', '寅'], ['庚', '午'], ['壬', '辰']),
    pillarsB: pillars(['己', '丑'], ['甲', '申'], ['乙', '未'], ['丁', '亥']),
  }

  it('detects a 천간합 stem bond with its 합화 element', () => {
    const facts = computeSajuSynastryFacts(richInput)
    const hap = facts.pillarRelations.find(
      (r) => r.layer === 'stem' && r.tags.includes('천간합') && r.aChar === '甲' && r.bChar === '己'
    )
    expect(hap).toBeDefined()
    expect(hap?.tone).toBe('bond')
    expect(hap?.element).toBe('토') // 甲己合化土
  })

  it('detects a 천간충 stem clash involving the day pillar', () => {
    const facts = computeSajuSynastryFacts(richInput)
    // A 일간 庚 ↔ B 월간 甲 = 천간충
    const chung = facts.pillarRelations.find(
      (r) => r.layer === 'stem' && r.tags.includes('천간충') && r.aChar === '庚' && r.bChar === '甲'
    )
    expect(chung).toBeDefined()
    expect(chung?.tone).toBe('clash')
    expect(chung?.isDayInvolved).toBe(true)
  })

  it('detects branch 육합 (bond) and 충 (clash)', () => {
    const facts = computeSajuSynastryFacts(richInput)
    const branch = facts.pillarRelations.filter((r) => r.layer === 'branch')
    expect(branch.some((r) => r.tags.includes('육합') && r.tone === 'bond')).toBe(true) // 子-丑
    expect(branch.some((r) => r.tags.includes('충') && r.tone === 'clash')).toBe(true) // 寅-申
  })

  it('collects spouse stars (재성/관성) for both sides', () => {
    const facts = computeSajuSynastryFacts(richInput)
    expect(facts.spouseStars.length).toBeGreaterThan(0)
    const SPOUSE = new Set(['정재', '편재', '정관', '편관'])
    expect(facts.spouseStars.every((s) => SPOUSE.has(s.sibsin))).toBe(true)
    expect(facts.spouseStars.some((s) => s.from === 'A')).toBe(true)
  })

  it('computes a merged element balance over all 16 element slots', () => {
    const facts = computeSajuSynastryFacts(richInput)
    const bal = facts.elementBalance
    expect(bal).not.toBeNull()
    const total = Object.values(bal!.merged).reduce((a, b) => a + b, 0)
    expect(total).toBe(16) // 4 pillars × (stem+branch) × 2 people
    expect(['목', '화', '토', '금', '수']).toContain(bal!.strongest)
    expect(['목', '화', '토', '금', '수']).toContain(bal!.weakest)
    expect(bal!.range).toBe(bal!.merged[bal!.strongest] - bal!.merged[bal!.weakest])
    expect(typeof bal!.balanced).toBe('boolean')
  })
})

describe('formatSajuSynastry', () => {
  const valid = {
    pillarsA: pillars(['甲', '子'], ['丙', '寅'], ['庚', '午'], ['壬', '辰']),
    pillarsB: pillars(['己', '丑'], ['甲', '申'], ['乙', '未'], ['丁', '亥']),
  }

  it('returns empty string when fewer than 4 pillars', () => {
    expect(formatSajuSynastry({ pillarsA: [P('甲', '子')], pillarsB: valid.pillarsB })).toBe('')
  })

  it('returns empty string when a day stem is missing', () => {
    const noDayStem = pillars(['甲', '子'], ['丙', '寅'], ['', '午'], ['壬', '辰'])
    expect(formatSajuSynastry({ pillarsA: noDayStem, pillarsB: valid.pillarsB })).toBe('')
  })

  it('renders a synastry block with header and tier sections', () => {
    const out = formatSajuSynastry(valid)
    expect(out).toContain('시너스트리')
    expect(out).toContain('천간충') // A 일간 庚 ↔ B 월간 甲
    expect(out).toContain('[IMPORTANT]')
    expect(out.length).toBeGreaterThan(50)
  })

  it('runs the named-label path and still returns a valid block', () => {
    // names feed the A(nm)/B(nm) label branch; the block renders regardless.
    const out = formatSajuSynastry({ ...valid, nameA: '민수', nameB: '지영' })
    expect(out).toContain('시너스트리')
    expect(out.length).toBeGreaterThan(50)
  })

  describe('시각 미상 — 시주(index 3) cross 제외', () => {
    // valid 의 시주: A=壬辰, B=丁亥 → 壬丁合化木 (시천간 천간합). 시각 미상이면 이
    // 날조 cross 가 빠져야 한다. 반대로 일/월주 cross(천간충 庚↔甲)는 유지.
    it('둘 다 시각 알면 시주 천간합이 보인다(baseline)', () => {
      const out = formatSajuSynastry(valid)
      expect(out).toContain('시천간 임 + B 시천간 정')
      expect(out).toContain('천간충')
    })

    it('A 시각 미상이면 A 시주 cross 가 사라지고 일/월주 cross 는 남는다', () => {
      const out = formatSajuSynastry({ ...valid, timeUnknownA: true })
      expect(out).not.toContain('시천간 임 + B 시천간 정')
      expect(out).toContain('천간충') // A 일간 庚 ↔ B 월간 甲 (시주 무관)
    })

    it('B 시각 미상이면 B 시주가 빠져 시주 천간합이 사라진다', () => {
      const out = formatSajuSynastry({ ...valid, timeUnknownB: true })
      expect(out).not.toContain('시천간 임 + B 시천간 정')
    })
  })
})
