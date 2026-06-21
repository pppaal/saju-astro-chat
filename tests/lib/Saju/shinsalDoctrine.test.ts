/**
 * 신살 도식 골든 (2) — 일간·월지 기반 미검증 신살 12종.
 *
 * 기존 shinsalTables.test.ts 는 암록·금여성·양인만 잠갔고, cheonmunseong.doctrine
 * 은 천문성만 잠갔다. 나머지 신살(천을·태극·문창·문곡·학당·천주·건록·제왕·홍염·
 * 천의성·천덕·월덕)은 per-item 하드코딩 표인데 골든이 없어, 한 칸이 틀려도(천문성/
 * 금여성처럼) CI 가 못 잡았다. 정통 교리값을 공개 API(getShinsalHitsForDailyTarget)
 * 로 잠근다. 값 변경 없음 — 현재 표가 도식과 일치함을 확인하고 고정.
 */
import { describe, it, expect } from 'vitest'
import { getShinsalHitsForDailyTarget } from '@/lib/saju/shinsal'

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
// 태극귀인(太極貴人): 甲乙 子午 / 丙丁 卯酉 / 戊己 辰戌 / 庚辛 丑未 / 壬癸 寅申
const TAEGEUK: Record<string, string[]> = {
  甲: ['子', '午'],
  乙: ['子', '午'],
  丙: ['卯', '酉'],
  丁: ['卯', '酉'],
  戊: ['辰', '戌'],
  己: ['辰', '戌'],
  庚: ['丑', '未'],
  辛: ['丑', '未'],
  壬: ['寅', '申'],
  癸: ['寅', '申'],
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
// 천주귀인(天廚貴人)
const CHEONJU: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '亥',
  辛: '子',
  壬: '亥',
  癸: '子',
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
  it('태극귀인(太極貴人): 10간 × 2지지', () => {
    for (const stem of STEMS)
      for (const br of TAEGEUK[stem]) {
        expect(dayStemKinds(stem, br), `${stem}→${br}`).toContain('태극귀인')
      }
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
  it('천주귀인(天廚貴人): 10간', () => {
    for (const stem of STEMS) expect(dayStemKinds(stem, CHEONJU[stem]), stem).toContain('천주귀인')
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
