/**
 * 상담사 DAILY(일진) 블록의 십신 = 일간 음양까지 본 정본 십신 (G4 · TP-1), 그리고
 * 신살 화이트리스트 키 = 엔진이 내는 신살 이름 (G4 · SDR-06).
 *
 * TP-1: facts.dayMaster({name, element, yinYang})를 DayMaster 로 캐스팅해 넘기던 탓에
 * getSibseong 이 yin_yang 을 못 읽어, 일간과 같은 음양의 천간·지지(≈ 절반)가 늘 반대쪽
 * 십신(겁재·상관·정재·정관·정인)으로 찍혔다. 기대값은 엔진 십신 표가 아니라 오행 생극 +
 * 음양 규칙과 지지 정기(정통)로 이 파일에서 독립적으로 만든다.
 * 10 일간 × 64일(60갑자 한 바퀴 이상) — 천간 10 × 지지 12 전부를 덮는다.
 */
import { describe, it, expect } from 'vitest'
import {
  buildDestinyContext,
  COUNSELOR_SHINSAL_EN,
  COUNSELOR_SHINSAL_LABEL,
  type DestinyBirth,
} from '@/lib/destiny/counselorContext'
import { getShinsalHits, type ShinsalPillarsInput } from '@/lib/saju/shinsal'

const SAJU_ONLY = { saju: true, astro: false }

// ── 독립 십신 ──
const EL: Record<string, string> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}
const YANG = new Set(['甲', '丙', '戊', '庚', '壬'])
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const MAIN_QI: Record<string, string> = {
  子: '癸',
  丑: '己',
  寅: '甲',
  卯: '乙',
  辰: '戊',
  巳: '丙',
  午: '丁',
  未: '己',
  申: '庚',
  酉: '辛',
  戌: '戊',
  亥: '壬',
}
function tenGod(dm: string, x: string): string {
  const same = YANG.has(dm) === YANG.has(x)
  const a = EL[dm]
  const b = EL[x]
  if (a === b) return same ? '비견' : '겁재'
  if (GEN[a] === b) return same ? '식신' : '상관'
  if (CTRL[a] === b) return same ? '편재' : '정재'
  if (CTRL[b] === a) return same ? '편관' : '정관'
  if (GEN[b] === a) return same ? '편인' : '정인'
  throw new Error(`${dm} ${x}`)
}

const birth = (date: string): DestinyBirth => ({
  birthDate: date,
  birthTime: '10:00',
  gender: 'female',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
})

// "MM-DD(요일·오늘) 壬午 (식신/정관)" 한 줄
const ROW =
  /^\d\d-\d\d\([^)]*\) ([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥]) \(([^/]+)\/([^)]+)\)$/

describe('상담사 DAILY 블록 십신 — 10 일간 × 천간 10 × 지지 12 (TP-1)', () => {
  it('every row matches the yin-yang-aware ten gods (ko)', async () => {
    const seenDm = new Set<string>()
    for (let i = 0; i < 10; i++) {
      // 2000-01-01(戊午) 부터 연속 10일 — 일간 10개가 한 번씩.
      const date = new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10)
      let dm = ''
      const stems = new Set<string>()
      const branches = new Set<string>()
      for (let w = 0; w < 8; w++) {
        const now = new Date(Date.UTC(2026, 0, 1 + w * 8, 12))
        const ctx = await buildDestinyContext(birth(date), now, 'ko', undefined, SAJU_ONLY)
        const block = ctx.daily.slice(ctx.daily.indexOf('## 일진'))
        const header = block.split('\n')[0]
        dm = /본인 일간 (\S) 기준/.exec(header)?.[1] ?? ''
        expect(dm, header).toMatch(/[甲乙丙丁戊己庚辛壬癸]/)
        const rows = block
          .split('\n')
          .slice(1)
          .map((l) => ROW.exec(l))
          .filter(Boolean)
        expect(rows.length).toBe(8)
        for (const r of rows) {
          const [, stem, branch, cheon, ji] = r!
          expect(cheon, `${dm} ${stem}`).toBe(tenGod(dm, stem))
          expect(ji, `${dm} ${branch}`).toBe(tenGod(dm, MAIN_QI[branch]))
          stems.add(stem)
          branches.add(branch)
        }
      }
      expect(stems.size).toBe(10)
      expect(branches.size).toBe(12)
      seenDm.add(dm)
    }
    expect(seenDm.size).toBe(10)
  }, 60_000)

  it('regression: 1990-05-15 10:00 M Seoul (庚) on 2026-07-07 — 壬午 Eating God, 甲申 Indirect Wealth/Companion', async () => {
    const b: DestinyBirth = { ...birth('1990-05-15'), gender: 'male' }
    const now = new Date('2026-07-07T12:00:00Z')
    const en = await buildDestinyContext(b, now, 'en', undefined, SAJU_ONLY)
    expect(en.daily).toContain('07-07(Tue·today) 壬午 (Eating God/Direct Officer)')
    expect(en.daily).toContain('07-09(Thu) 甲申 (Indirect Wealth/Companion)')
    const ko = await buildDestinyContext(b, now, 'ko', undefined, SAJU_ONLY)
    expect(ko.daily).toMatch(/07-07\([^)]*\) 壬午 \(식신\/정관\)/)
  })
})

describe('상담사 신살 화이트리스트 = 엔진 신살 이름 (SDR-06)', () => {
  // 결정론 표본 — 60갑자 4기둥 6,000 차트에서 엔진이 실제로 내는 신살 이름 전부.
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const emitted = new Set<string>()
  let seed = 7
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648)
  const p = () => {
    const i = Math.floor(next() / 65536) % 60
    return {
      heavenlyStem: { name: STEMS[i % 10], element: '목' },
      earthlyBranch: { name: BR[i % 12], element: '목' },
    }
  }
  for (let n = 0; n < 6000; n++) {
    const c = { year: p(), month: p(), day: p(), time: p() } as unknown as ShinsalPillarsInput
    for (const h of getShinsalHits(c)) emitted.add(h.kind)
  }

  it('every whitelist key is a shinsal name the engine emits (문창, not 문창귀인)', () => {
    for (const key of Object.keys(COUNSELOR_SHINSAL_LABEL)) {
      expect(emitted.has(key), key).toBe(true)
    }
    expect('문창' in COUNSELOR_SHINSAL_LABEL).toBe(true)
    expect('문창귀인' in COUNSELOR_SHINSAL_LABEL).toBe(false)
  })

  it('the EN table covers exactly the same keys', () => {
    expect(Object.keys(COUNSELOR_SHINSAL_EN).sort()).toEqual(
      Object.keys(COUNSELOR_SHINSAL_LABEL).sort()
    )
  })

  it('1990-01-09 10:00 M Seoul (己巳 丁丑 甲戌 己巳): 문창 on year and hour, ko and en', async () => {
    const b: DestinyBirth = { ...birth('1990-01-09'), gender: 'male' }
    const now = new Date('2026-11-25T12:00:00Z')
    const ko = await buildDestinyContext(b, now, 'ko', undefined, SAJU_ONLY)
    const koLine = ko.stable.split('\n').find((l) => l.startsWith('신살:')) ?? ''
    expect(koLine).toContain('문창(년, 학문·창작)')
    expect(koLine).toContain('문창(시, 학문·창작)')
    expect(koLine).not.toContain('천라지망')
    const en = await buildDestinyContext(b, now, 'en', undefined, SAJU_ONLY)
    const enLine = en.stable.split('\n').find((l) => l.startsWith('sinsal:')) ?? ''
    expect(enLine).toContain('Munchang(Y, study, creativity)')
    expect(enLine).toContain('Munchang(H, study, creativity)')
    expect(enLine).not.toContain('Cheollajimang')
  })
})
