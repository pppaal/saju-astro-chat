/**
 * 신살 도식 골든 (2) — 일간·월지·일지 기반 신살.
 *
 * 기존 shinsalTables.test.ts 는 암록·금여성·양인만 잠갔고, cheonmunseong.doctrine
 * 은 천문성만 잠갔다. 나머지 신살(천을·태극·문창·문곡·학당·천주·건록·제왕·홍염·
 * 천의성·천덕·월덕)을 공개 API(getShinsalHitsForDailyTarget / getShinsalHits)로 잠근다.
 *
 * 골든은 인용한 고전 표에서 온다 — 코드 표를 베끼지 않는다(엔진 감사 SD-18). 예전
 * 이 파일은 "현재 표가 도식과 일치함을 확인하고 고정" 한다며 코드의 태극·천주 표를
 * 그대로 복사해, 어느 학파와도 맞지 않는 값(SD-02·SD-13)이 CI 를 통과했다.
 *  - 太極貴人: 三命通會 "甲乙生人子午中, 丙丁雞兔定亨通, 戊己兩干臨四季, 庚辛寅亥祿豐隆,
 *    壬癸巳申偏喜美" (SD-02).
 *  - 天廚貴人: 食神의 祿 (OD-6 기본 학파) — CHEONJU[s] = GEONROK[식신(s)] (SD-13).
 *  - 鬼門關殺: 6쌍 子酉 丑午 寅未 卯申 辰亥 巳戌, 일지(와 년지) 기준 (SD-05).
 *  - 桃花: 일지 三合국의 年殺 자리 寅午戌→卯 申子辰→酉 巳酉丑→午 亥卯未→子 (SD-06).
 *  - 三災: 시기 신살 — 본명 hit 아님 (SD-17).
 */
import { describe, it, expect } from 'vitest'
import {
  getShinsalHitsForDailyTarget,
  getShinsalHits,
  annotateShinsal,
  getTwelveShinsalSingleByPillar,
  pickTwelveSingle,
  DOHWA_BY_DAY_BRANCH,
  type SajuPillarsLike,
} from '@/lib/saju/shinsal'
import { getSibseong } from '@/lib/saju/core/sibsin'
import { STEMS as STEM_INFO, BRANCH_NAMES } from '@/lib/saju/constants'
import { DOHWA_BY_YEAR_BRANCH } from '@/lib/calendar/constants'

// 일간 기반 신살: dayBranch 는 결과에 무관(일간×target 만 본다). target 가 표값이면 발화.
const dayStemKinds = (dayStem: string, target: string): string[] =>
  getShinsalHitsForDailyTarget(dayStem, '寅', target).map((h) => h.kind)

// 월지/천간 기반: monthBranch + targetStem 까지 넘긴다.
const monthKinds = (monthBranch: string, target: string, targetStem?: string): string[] =>
  getShinsalHitsForDailyTarget('甲', '寅', target, monthBranch, targetStem).map((h) => h.kind)

// ── 일간 → target지지 표 (정통 도식) ──
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const

// 천을귀인(天乙貴人): 甲戊庚 丑未 / 乙己 子申 / 丙丁 亥酉 / 壬癸 巳卯 / 辛 寅午
const CHEONEUL: Record<string, string[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  壬: ['巳', '卯'],
  癸: ['巳', '卯'],
  辛: ['寅', '午'],
}
// 태극귀인(太極貴人) — 三命通會: 甲乙 子午 / 丙丁 卯酉(雞兔) / 戊己 辰戌丑未(四季) /
// 庚辛 寅亥 / 壬癸 巳申
const TAEGEUK: Record<string, string[]> = {
  甲: ['子', '午'],
  乙: ['子', '午'],
  丙: ['卯', '酉'],
  丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'],
  己: ['辰', '戌', '丑', '未'],
  庚: ['寅', '亥'],
  辛: ['寅', '亥'],
  壬: ['巳', '申'],
  癸: ['巳', '申'],
}
// 문창귀인(文昌貴人) = 식신의 건록자리
const MUNCHANG: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
}
// 문곡귀인(文曲貴人) = 문창의 충(沖)
const MUNGOK: Record<string, string> = {
  甲: '亥',
  乙: '子',
  丙: '寅',
  丁: '卯',
  戊: '寅',
  己: '卯',
  庚: '巳',
  辛: '午',
  壬: '申',
  癸: '酉',
}
// 학당귀인(學堂貴人) = 일간의 장생지
const HAKDANG: Record<string, string> = {
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
// 천주귀인(天廚貴人) — 食神의 祿 (OD-6): 甲巳 乙午 丙巳 丁午 戊申 己酉 庚亥 辛子 壬寅 癸卯
const CHEONJU: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '巳',
  丁: '午',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
}
// 건록(建祿) = 일간의 록지
const GEONROK: Record<string, string> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
}
// 제왕(帝旺) = 12운성 왕지
const JEWANG: Record<string, string> = {
  甲: '卯',
  乙: '寅',
  丙: '午',
  丁: '巳',
  戊: '午',
  己: '巳',
  庚: '酉',
  辛: '申',
  壬: '子',
  癸: '亥',
}
// 홍염살(紅艶殺)
const HONGYEOM: Record<string, string> = {
  甲: '午',
  乙: '午',
  丙: '寅',
  丁: '未',
  戊: '辰',
  己: '辰',
  庚: '戌',
  辛: '酉',
  壬: '子',
  癸: '申',
}

describe('신살 도식 골든 — 일간 기반 길성/흉성', () => {
  it('천을귀인(天乙貴人): 10간 × 2지지', () => {
    for (const stem of STEMS)
      for (const br of CHEONEUL[stem]) {
        expect(dayStemKinds(stem, br), `${stem}→${br}`).toContain('천을귀인')
      }
  })
  it('태극귀인(太極貴人): 10간 × 12지 진리표 — 표의 지지에서만 발화', () => {
    for (const stem of STEMS)
      for (const br of BRANCH_NAMES) {
        expect(dayStemKinds(stem, br).includes('태극귀인'), `${stem}→${br}`).toBe(
          TAEGEUK[stem].includes(br)
        )
      }
  })
  it('태극귀인 회귀(SD-02): 壬巳 o · 壬寅 x · 庚亥 o · 庚丑 x · 己丑 o', () => {
    expect(dayStemKinds('壬', '巳')).toContain('태극귀인')
    expect(dayStemKinds('壬', '寅')).not.toContain('태극귀인')
    expect(dayStemKinds('庚', '亥')).toContain('태극귀인')
    expect(dayStemKinds('庚', '丑')).not.toContain('태극귀인')
    expect(dayStemKinds('己', '丑')).toContain('태극귀인')
  })
  it('문창귀인(文昌貴人): 10간', () => {
    for (const stem of STEMS) expect(dayStemKinds(stem, MUNCHANG[stem]), stem).toContain('문창')
  })
  it('문곡귀인(文曲貴人): 10간', () => {
    for (const stem of STEMS) expect(dayStemKinds(stem, MUNGOK[stem]), stem).toContain('문곡')
  })
  it('학당귀인(學堂貴人): 10간', () => {
    for (const stem of STEMS) expect(dayStemKinds(stem, HAKDANG[stem]), stem).toContain('학당귀인')
  })
  it('천주귀인(天廚貴人): 10간 × 12지 — 표의 지지에서만 발화', () => {
    for (const stem of STEMS)
      for (const br of BRANCH_NAMES) {
        expect(dayStemKinds(stem, br).includes('천주귀인'), `${stem}→${br}`).toBe(
          CHEONJU[stem] === br
        )
      }
  })
  it('천주귀인 = 식신의 건록: CHEONJU[s] === GEONROK[식신(s)] (10간)', () => {
    for (const s of STEM_INFO) {
      const siksin = STEM_INFO.find(
        (t) => getSibseong({ element: s.element, yin_yang: s.yin_yang }, t) === '식신'
      )
      expect(siksin, s.name).toBeDefined()
      expect(CHEONJU[s.name], s.name).toBe(GEONROK[siksin!.name])
    }
  })
  it('건록(建祿): 10간', () => {
    for (const stem of STEMS) expect(dayStemKinds(stem, GEONROK[stem]), stem).toContain('건록')
  })
  it('제왕(帝旺): 10간', () => {
    for (const stem of STEMS) expect(dayStemKinds(stem, JEWANG[stem]), stem).toContain('제왕')
  })
  it('홍염살(紅艶殺): 10간', () => {
    for (const stem of STEMS) expect(dayStemKinds(stem, HONGYEOM[stem]), stem).toContain('홍염살')
  })

  // 회귀 가드: 옛 코드는 천을귀인을 isCheonjuGwiin(천주 표)으로 emit 했다(주석 833행).
  // 庚 천을=丑未, 천주=亥. 亥 에서는 천주만 떠야 하고 천을은 안 떠야 한다.
  it('회귀: 庚 의 亥 는 천주귀인이지 천을귀인 아님', () => {
    const kinds = dayStemKinds('庚', '亥')
    expect(kinds).toContain('천주귀인')
    expect(kinds).not.toContain('천을귀인')
  })
})

describe('신살 도식 골든 — 월지 기반', () => {
  // 천의성(天醫星) = 월지 바로 앞 지지
  const CHEONUI: Record<string, string> = {
    子: '亥',
    丑: '子',
    寅: '丑',
    卯: '寅',
    辰: '卯',
    巳: '辰',
    午: '巳',
    未: '午',
    申: '未',
    酉: '申',
    戌: '酉',
    亥: '戌',
  }
  it('천의성(天醫星): 12월지', () => {
    for (const [mb, t] of Object.entries(CHEONUI)) {
      expect(monthKinds(mb, t), `${mb}월→${t}`).toContain('천의성')
    }
  })

  // 월덕귀인(月德貴人): 화국寅午戌→丙 / 금국巳酉丑→庚 / 수국申子辰→壬 / 목국亥卯未→甲
  const WOLDEOK: Record<string, string> = {
    寅: '丙',
    午: '丙',
    戌: '丙',
    巳: '庚',
    酉: '庚',
    丑: '庚',
    申: '壬',
    子: '壬',
    辰: '壬',
    亥: '甲',
    卯: '甲',
    未: '甲',
  }
  it('월덕귀인(月德貴人): 12월지 × 천간', () => {
    for (const [mb, stem] of Object.entries(WOLDEOK)) {
      expect(monthKinds(mb, '寅', stem), `${mb}월→${stem}`).toContain('월덕귀인')
    }
  })

  // 천덕귀인(天德貴人): 干支 혼합 표라 천간값 월만 함수 API(targetStem)로 발화 가능.
  // 寅丁 辰壬 巳辛 未甲 申癸 戌丙 亥乙 丑庚.
  const CHEONDEOK_STEM: Record<string, string> = {
    寅: '丁',
    辰: '壬',
    巳: '辛',
    未: '甲',
    申: '癸',
    戌: '丙',
    亥: '乙',
    丑: '庚',
  }
  it('천덕귀인(天德貴人): 천간값 월지', () => {
    for (const [mb, stem] of Object.entries(CHEONDEOK_STEM)) {
      expect(monthKinds(mb, '寅', stem), `${mb}월→${stem}`).toContain('천덕귀인')
    }
  })
})

// ── 4기둥 차트 헬퍼 ──
const POS = ['year', 'month', 'day', 'time'] as const
function chart(gz: string): SajuPillarsLike {
  const parts = gz.split(' ')
  return Object.fromEntries(
    POS.map((k, i) => [
      k,
      {
        heavenlyStem: { name: parts[i][0], element: '목' },
        earthlyBranch: { name: parts[i][1], element: '목' },
      },
    ])
  ) as unknown as SajuPillarsLike
}
const natal = (gz: string, kind: string) =>
  getShinsalHits(chart(gz))
    .filter((h) => h.kind === kind)
    .map((h) => `${h.pillars.join('+')}:${h.target}`)

/** 결정적 시드 차트 — 60갑자 중 4개를 LCG 로 고른다(테스트 재현성). */
function seededCharts(n: number, seed = 20261125): string[] {
  const branchesBy = (i: number) => BRANCH_NAMES[i % 12]
  const stemsBy = (i: number) => STEMS[i % 10]
  let x = seed >>> 0
  const next = () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    return x
  }
  const out: string[] = []
  for (let c = 0; c < n; c++) {
    const gz: string[] = []
    for (let k = 0; k < 4; k++) {
      const i = next() % 60
      gz.push(stemsBy(i) + branchesBy(i))
    }
    out.push(gz.join(' '))
  }
  return out
}

describe('태극귀인 — 차트 골든 (SD-02)', () => {
  it('戊辰 癸亥 庚午 甲申 → 庚 의 太極 亥(월지)에 발화', () => {
    expect(natal('戊辰 癸亥 庚午 甲申', '태극귀인')).toEqual(['month:亥'])
  })
  it('辛未 辛丑 壬寅 庚戌 → 壬 의 太極은 巳申 — 일지 寅 에 발화 안 함', () => {
    expect(natal('辛未 辛丑 壬寅 庚戌', '태극귀인')).toEqual([])
  })
})

describe('귀문관살(鬼門關殺) — 정통 6쌍, 일지·년지 기준 (SD-05)', () => {
  const PAIRS: Array<[string, string]> = [
    ['子', '酉'],
    ['丑', '午'],
    ['寅', '未'],
    ['卯', '申'],
    ['辰', '亥'],
    ['巳', '戌'],
  ]
  const isPair = (a: string, b: string) =>
    PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

  it('일진: 일지 × target 12×12 — 6쌍에서만 발화, 자기쌍 없음', () => {
    for (const db of BRANCH_NAMES)
      for (const t of BRANCH_NAMES) {
        const kinds = getShinsalHitsForDailyTarget('甲', db, t).map((h) => h.kind)
        expect(kinds.includes('귀문관'), `${db}→${t}`).toBe(isPair(db, t))
      }
  })
  it('일진: 월지와 무관 — 월지 子 라도 일지 기준으로만 판단', () => {
    const kinds = (mb: string) =>
      getShinsalHitsForDailyTarget('甲', '寅', '丑', mb).map((h) => h.kind)
    for (const mb of BRANCH_NAMES) expect(kinds(mb), mb).not.toContain('귀문관')
    expect(getShinsalHitsForDailyTarget('甲', '寅', '未', '子').map((h) => h.kind)).toContain(
      '귀문관'
    )
  })
  it('丙申 庚子 己未 己巳 → 월지 子 가 자기 자신으로 귀문을 일으키지 않음(없음)', () => {
    expect(natal('丙申 庚子 己未 己巳', '귀문관')).toEqual([])
  })
  it('丁未 丙午 丙寅 戊戌 → 일지 寅 · 년지 未 쌍 하나', () => {
    expect(natal('丁未 丙午 丙寅 戊戌', '귀문관')).toEqual(['year+day:未'])
  })
  it('년지 기준 쌍: 戊辰 癸亥 庚午 甲申 → 년지 辰 · 월지 亥', () => {
    expect(natal('戊辰 癸亥 庚午 甲申', '귀문관')).toEqual(['month+year:亥'])
  })
  it('시드 차트: 모든 귀문 hit 은 기준(일지/년지)과 6쌍이고, 모든 6쌍이 보고된다', () => {
    for (const gz of seededCharts(300)) {
      const c = chart(gz)
      const br = (k: (typeof POS)[number]) => c[k].earthlyBranch.name
      const hits = getShinsalHits(c).filter((h) => h.kind === '귀문관')
      for (const h of hits) {
        const [own, ...bases] = h.pillars
        expect(h.target, gz).toBe(br(own))
        for (const b of bases) {
          expect(['day', 'year'], gz).toContain(b)
          expect(isPair(br(own), br(b)), gz).toBe(true)
        }
      }
      const expected = new Set<string>()
      for (const basis of ['day', 'year'] as const)
        for (const k of POS)
          if (k !== basis && isPair(br(basis), br(k))) expected.add([basis, k].sort().join('+'))
      const reported = new Set<string>()
      for (const h of hits)
        for (const b of h.pillars.slice(1)) reported.add([h.pillars[0], b].sort().join('+'))
      expect([...reported].sort(), gz).toEqual([...expected].sort())
    }
  })
})

describe('도화(桃花) = 일지 三合국의 年殺 자리 (SD-06)', () => {
  const DOHWA: Record<string, string> = {
    寅: '卯',
    午: '卯',
    戌: '卯',
    申: '酉',
    子: '酉',
    辰: '酉',
    巳: '午',
    酉: '午',
    丑: '午',
    亥: '子',
    卯: '子',
    未: '子',
  }
  it('표 = 인용 규칙 = calendar/constants DOHWA_BY_YEAR_BRANCH', () => {
    expect({ ...DOHWA_BY_DAY_BRANCH }).toEqual(DOHWA)
    expect({ ...DOHWA_BY_YEAR_BRANCH }).toEqual(DOHWA)
  })
  it('일진: 일지 × target 12×12 — 도화는 년살과 같은 날에만', () => {
    for (const db of BRANCH_NAMES)
      for (const t of BRANCH_NAMES) {
        const kinds = getShinsalHitsForDailyTarget('甲', db, t).map((h) => h.kind)
        expect(kinds.includes('도화'), `${db}→${t}`).toBe(DOHWA[db] === t)
        expect(kinds.includes('도화'), `${db}→${t}`).toBe(pickTwelveSingle(db, t) === '년살')
      }
  })
  it('일진 壬戌: target 午 는 도화 아님, target 卯 는 도화', () => {
    const kinds = (t: string) => getShinsalHitsForDailyTarget('壬', '戌', t).map((h) => h.kind)
    expect(kinds('午')).not.toContain('도화')
    expect(kinds('卯')).toContain('도화')
  })
  it('癸酉 戊午 癸未 壬戌 → 도화 없음(未 의 도화는 子)', () => {
    expect(natal('癸酉 戊午 癸未 壬戌', '도화')).toEqual([])
  })
  it('시드 차트: 도화 칸 = 년살 칸', () => {
    for (const gz of seededCharts(300)) {
      expect(natal(gz, '도화').sort(), gz).toEqual(natal(gz, '년살').sort())
    }
  })
})

describe('삼재·12신살 라벨 (SD-17)', () => {
  it('본명 hit 에 삼재가 없다 (시기 신살)', () => {
    for (const gz of seededCharts(100)) expect(natal(gz, '삼재'), gz).toEqual([])
  })
  it("annotateShinsal · getTwelveShinsalSingleByPillar 는 '…살살' 을 내지 않는다", () => {
    for (const gz of seededCharts(100)) {
      const annot = annotateShinsal(chart(gz))
      const labels = POS.flatMap((k) => [
        ...annot.byPillar![k].twelveShinsal,
        ...annot.byPillar![k].generalShinsal,
      ])
      for (const l of labels) expect(l.endsWith('살살'), `${gz} ${l}`).toBe(false)
      const single = getTwelveShinsalSingleByPillar(chart(gz))
      for (const k of POS) expect(single[k].endsWith('살살'), `${gz} ${single[k]}`).toBe(false)
    }
  })
  it('12신살 라벨: 천살·년살은 그대로, 장성·역마는 +살', () => {
    // 일지 午(장성 午): 申 = 역마, 酉 = 육해… 寅午戌 의 年殺 = 卯, 天殺 = 丑
    const single = getTwelveShinsalSingleByPillar(chart('甲丑 甲卯 甲午 甲申'))
    expect(single).toEqual({ year: '천살', month: '년살', day: '장성살', time: '역마살' })
  })
})
