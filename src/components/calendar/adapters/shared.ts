/**
 * destinypal adapters — shared helpers
 *
 * Pure-function utilities shared by toUser / toLifeStages / toDaewoon /
 * toMilestones / toDecade / toYear / toMonth / toDay.
 *
 * No side effects. No I/O. Everything is deterministic so adapters can run
 * inside React `useMemo` and SSR/server boundaries without surprises.
 */

import type { ZodiacKo } from '@/lib/astrology/foundation/types'

// ── 천간 / 지지 한자↔한글↔영문 ──────────────────────────────────────────────
export const STEM_HAN_TO_KO: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
}
export const STEM_HAN_TO_EN: Record<string, string> = {
  甲: 'gap',
  乙: 'eul',
  丙: 'byeong',
  丁: 'jeong',
  戊: 'mu',
  己: 'gi',
  庚: 'gyeong',
  辛: 'sin',
  壬: 'im',
  癸: 'gye',
}
export const BRANCH_HAN_TO_KO: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}
export const BRANCH_HAN_TO_EN: Record<string, string> = {
  子: 'ja',
  丑: 'chuk',
  寅: 'in',
  卯: 'myo',
  辰: 'jin',
  巳: 'sa',
  午: 'o',
  未: 'mi',
  申: 'sin',
  酉: 'yu',
  戌: 'sul',
  亥: 'hae',
}

// 한글 천간↔한자 (사주 엔진은 한글 천간 — "갑/을/병…" — 으로 들고 다님)
export const STEM_KO_TO_HAN: Record<string, string> = {
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
}
export const BRANCH_KO_TO_HAN: Record<string, string> = {
  자: '子',
  축: '丑',
  인: '寅',
  묘: '卯',
  진: '辰',
  사: '巳',
  오: '午',
  미: '未',
  신: '申',
  유: '酉',
  술: '戌',
  해: '亥',
}

/**
 * destinypal 표시 형식의 간지 객체 ─ { hanja, kr, en }.
 * input 은 한자(甲, 寅 등) 또는 한글(갑, 인 등) 모두 받을 수 있다 — saju 엔진은
 * pillars 를 한글로, advancedAnalysis 는 한자로 들고 다니는 비대칭 때문에 한
 * 컨버터로 양쪽을 흡수.
 */
export interface Ganji {
  hanja: string // e.g. "甲戌"
  kr: string // e.g. "갑술"
  en: string // e.g. "gapsul"
}

export function toGanji(stem: string, branch: string): Ganji {
  const stemHan = STEM_KO_TO_HAN[stem] ?? stem
  const branchHan = BRANCH_KO_TO_HAN[branch] ?? branch
  const stemKo = STEM_HAN_TO_KO[stemHan] ?? stem
  const branchKo = BRANCH_HAN_TO_KO[branchHan] ?? branch
  const stemEn = STEM_HAN_TO_EN[stemHan] ?? ''
  const branchEn = BRANCH_HAN_TO_EN[branchHan] ?? ''
  return {
    hanja: `${stemHan}${branchHan}`,
    kr: `${stemKo}${branchKo}`,
    en: `${stemEn}${branchEn}`,
  }
}

// ── 오행 ────────────────────────────────────────────────────────────────────
export const ELEMENT_KO: Record<string, string> = {
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
}
export const ELEMENT_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}

// ── 12점성 사인 (한글) ─────────────────────────────────────────────────────
export const SIGN_KO: Record<ZodiacKo, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

// 행성 한글 표기 ─ "Sun → 태양" 식. 데이터 레이어 표시.
export const PLANET_KO: Record<string, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
  Uranus: '천왕성',
  Neptune: '해왕성',
  Pluto: '명왕성',
  Ascendant: '상승점',
  MC: 'MC',
}

// ── 본명/대운/세운 정통화: F등급 라벨 → status 풀이 ────────────────────────
/** 격국 status 한 줄 압축. */
export function geokgukStatusLine(
  primary: string | undefined,
  status: string | undefined,
  positive: string[] | undefined,
  negative: string[] | undefined
): string | undefined {
  if (!primary) return undefined
  const head = status ? `${primary} · ${status}` : primary
  if (status === '성격' && positive && positive.length > 0) {
    return `${head} (${positive[0]})`
  }
  if (status === '파격' && negative && negative.length > 0) {
    return `${head} (${negative[0]})`
  }
  if (status === '반성반파') {
    const tail: string[] = []
    if (positive?.[0]) tail.push(`+${positive[0]}`)
    if (negative?.[0]) tail.push(`-${negative[0]}`)
    return tail.length ? `${head} (${tail.join(' / ')})` : head
  }
  return head
}

/**
 * "재성 43%" 라벨을 정통 (월령·통근) 한 줄로 정통화.
 * deukryeong: '득령' | '실령' | '평령'
 * tonggeun.totalStrength: 0..200
 */
export function rootLine(
  monthBranch: string | undefined,
  deukryeong: string | undefined,
  tonggeunStrength: number | undefined
): string | undefined {
  const parts: string[] = []
  if (monthBranch && deukryeong) {
    const dStr = deukryeong === '득령' ? '득령' : deukryeong === '실령' ? '실령' : '평령'
    parts.push(`월령 ${monthBranch} ${dStr}`)
  }
  if (typeof tonggeunStrength === 'number') {
    const tg =
      tonggeunStrength >= 100
        ? '통근 단단'
        : tonggeunStrength >= 50
          ? '통근 뚜렷'
          : tonggeunStrength > 0
            ? '통근 얇음'
            : '뿌리 없음'
    parts.push(tg)
  }
  return parts.length ? parts.join(' · ') : undefined
}

// ── ISO ↔ Year/Month/Day 변환 ──────────────────────────────────────────────
export function ymdFromIso(iso: string): { y: number; m: number; d: number } {
  return { y: +iso.slice(0, 4), m: +iso.slice(5, 7), d: +iso.slice(8, 10) }
}
export function isoToYmd(iso: string): string {
  return iso.slice(0, 10)
}
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// ── 신살 polarity 캡 (audit 보완) ──────────────────────────────────────────
/**
 * 신살 polarity cap — common 등급 ±2, classical-noble 등급 ±3.
 *  - 천을귀인/천덕귀인/월덕귀인/문창귀인/학당귀인/금여(성)/금여 = classical-noble
 *  - 그 외(도화/역마/양인/공망/겁살/망신/백호/지살/년살/월살/반안(살)/장성(살)/
 *    화개(살)/재살/천살/육해(살)) = common
 */
const CLASSICAL_NOBLE = new Set([
  '천을귀인',
  '천덕귀인',
  '월덕귀인',
  '문창귀인',
  '문창',
  '학당귀인',
  '금여',
  '금여성',
])
export function capShinsalPolarity(name: string, raw: number): number {
  const cap = CLASSICAL_NOBLE.has(name) ? 3 : 2
  if (raw > cap) return cap
  if (raw < -cap) return -cap
  return raw
}
