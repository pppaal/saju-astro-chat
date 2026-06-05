/**
 * 올해 점성 한 줄 — 연간 프로펙션(annual profection). 매년 본명 상승점(ASC)에서
 * 한 칸씩 도는 활성 하우스를 나이로 계산(완료 햇수 mod 12)하고, 그 하우스
 * 커스프의 SIGN → 전통 룰러(Lord of the Year) → 본명 차트에서의 그 룰러의
 * 하우스·sign 까지 함께 노출. 헬레니즘 전통: house 1 == ASC, 매년 반시계로 1칸.
 * 나이 기반이라 ephemeris 불필요(프로덕션·테스트 모두 deterministic). monthly scope 노출.
 *
 * Solar Return: 호출자(api/calendar)가 미리 계산해 solarReturnSummary 로 전달.
 * 본 deriver 는 swisseph 비의존이라 그대로 받아 한 줄 합성만 한다 — astroMilestoneOverrides 패턴과 동일.
 */
import type { NatalContext } from '../context/types'
import type { ZodiacKo, House, PlanetBase } from '@/lib/astrology/foundation/types'
import { SIGN_KO } from '@/lib/astrology/signLabels'
import { SIGN_RULERS_BY_SIGN } from '@/lib/astrology/foundation/dignities'

type Lang = 'ko' | 'en'
type RulerPlanet =
  | 'Mars'
  | 'Venus'
  | 'Mercury'
  | 'Moon'
  | 'Sun'
  | 'Jupiter'
  | 'Saturn'

const HOUSE_THEME_KO: Record<number, string> = {
  1: '자기·몸·새 출발',
  2: '재물·자원·가치관',
  3: '소통·배움·가까운 이동',
  4: '가정·뿌리·내면의 토대',
  5: '연애·창작·즐거움',
  6: '일·건강·일상 루틴',
  7: '관계·파트너·계약',
  8: '변환·깊이·재구성',
  9: '확장·여행·배움',
  10: '커리어·명예·사회적 위치',
  11: '동료·네트워크·목표',
  12: '마무리·치유·내면 정리',
}

const HOUSE_THEME_EN: Record<number, string> = {
  1: 'self · body · fresh start',
  2: 'money · resources · values',
  3: 'communication · learning · short trips',
  4: 'home · roots · inner foundation',
  5: 'romance · creativity · play',
  6: 'work · health · daily routine',
  7: 'partnership · contracts',
  8: 'transformation · depth · rebuild',
  9: 'expansion · travel · study',
  10: 'career · reputation · public role',
  11: 'community · networks · goals',
  12: 'closure · healing · inner work',
}

/** EN sign labels (canonical PascalCase passes through). */
const SIGN_EN: Record<ZodiacKo, string> = {
  Aries: 'Aries',
  Taurus: 'Taurus',
  Gemini: 'Gemini',
  Cancer: 'Cancer',
  Leo: 'Leo',
  Virgo: 'Virgo',
  Libra: 'Libra',
  Scorpio: 'Scorpio',
  Sagittarius: 'Sagittarius',
  Capricorn: 'Capricorn',
  Aquarius: 'Aquarius',
  Pisces: 'Pisces',
}

/** Hellenistic traditional sign rulers (no modern outers). dignities.ts(SSOT) 파생. */
const SIGN_RULERS = SIGN_RULERS_BY_SIGN as Record<ZodiacKo, RulerPlanet>

const PLANET_KO: Record<RulerPlanet, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
}

function signLabel(sign: ZodiacKo, lang: Lang): string {
  return lang === 'ko' ? (SIGN_KO[sign] ?? sign) : (SIGN_EN[sign] ?? sign)
}

function planetLabel(p: RulerPlanet, lang: Lang): string {
  return lang === 'ko' ? PLANET_KO[p] : p
}

export interface YearAstroProfection {
  /** 활성 하우스 번호 (1-12). */
  house: number
  /** 활성 하우스 커스프의 sign. */
  sign: ZodiacKo
  /** 전통 sign 룰러 — Lord of the Year. */
  lord: RulerPlanet
  /** 본명 차트에서 lord 행성의 하우스 (찾지 못하면 undefined). */
  lordNatalHouse: number | undefined
  /** 본명 차트에서 lord 행성의 sign (찾지 못하면 undefined). */
  lordNatalSign: ZodiacKo | undefined
  /** 나이 (완료 햇수 근사). */
  age: number
}

/**
 * Profection 핵심 산출 — pure compute. matcher 외 다른 deriver/콜러가 직접
 * 참조 가능하도록 export.
 */
export function computeProfection(
  natal: NatalContext,
  year: number,
): YearAstroProfection | undefined {
  const birthYear = natal.input?.year
  if (!birthYear) return undefined
  const age = year - birthYear
  if (!Number.isFinite(age) || age < 0) return undefined

  const house = (((age % 12) + 12) % 12) + 1
  const houses: readonly House[] = natal.astro?.chart?.houses ?? []
  const houseRow = houses.find((h) => h.index === house)
  if (!houseRow) return undefined
  const sign = houseRow.sign
  const lord = SIGN_RULERS[sign]
  if (!lord) return undefined

  const planets: readonly PlanetBase[] = natal.astro?.chart?.planets ?? []
  const lordPlanet = planets.find((p) => p.name === lord)
  return {
    age,
    house,
    sign,
    lord,
    lordNatalHouse: lordPlanet?.house,
    lordNatalSign: lordPlanet?.sign,
  }
}

/**
 * 외부에서 미리 계산해 전달하는 Solar Return 요약. swisseph 호출은 호출 측에서.
 */
export interface SolarReturnSummary {
  ascSign?: ZodiacKo
  /** 태양이 떨어진 하우스 (1-12). */
  sunHouse?: number
  /** 자유 텍스트 cue (예: "관계가 무대"). 미지정 시 sunHouse 의 테마로 폴백. */
  cue?: string
}

export function deriveYearAstro(
  natal: NatalContext,
  year: number,
  lang: Lang = 'ko',
  solarReturnSummary?: SolarReturnSummary,
): string | undefined {
  const prof = computeProfection(natal, year)
  if (!prof) return undefined

  const themeMap = lang === 'ko' ? HOUSE_THEME_KO : HOUSE_THEME_EN
  const houseTheme = themeMap[prof.house]
  if (!houseTheme) return undefined

  const signTxt = signLabel(prof.sign, lang)
  const lordTxt = planetLabel(prof.lord, lang)

  let line: string
  if (lang === 'ko') {
    const lordWhere =
      prof.lordNatalHouse != null && prof.lordNatalSign
        ? ` — 그 룰러 ${lordTxt}는 본명 ${prof.lordNatalHouse}궁(${signLabel(prof.lordNatalSign, lang)})에 있어요`
        : ''
    line =
      `점성으로는 올해 ${prof.house}번째 영역(${houseTheme})이 활성화돼요 — ` +
      `커스프 ${signTxt} / 룰러 ${lordTxt}${lordWhere}. 한 해의 무게중심이 이쪽으로 기울어요.`
  } else {
    const lordWhere =
      prof.lordNatalHouse != null && prof.lordNatalSign
        ? ` — natally ${lordTxt} sits in your ${ordinalEn(prof.lordNatalHouse)} house (${signLabel(prof.lordNatalSign, lang)})`
        : ''
    line =
      `Astrologically this year activates your ${ordinalEn(prof.house)} house (${houseTheme}) — ` +
      `cusp in ${signTxt}, ruler ${lordTxt}${lordWhere}. The year's center of gravity tilts here.`
  }

  const sr = formatSolarReturn(solarReturnSummary, lang)
  return sr ? `${line} ${sr}` : line
}

function formatSolarReturn(
  s: SolarReturnSummary | undefined,
  lang: Lang,
): string | undefined {
  if (!s) return undefined
  const hasAsc = !!s.ascSign
  const hasSun = typeof s.sunHouse === 'number' && s.sunHouse >= 1 && s.sunHouse <= 12
  if (!hasAsc && !hasSun && !s.cue) return undefined

  const themeMap = lang === 'ko' ? HOUSE_THEME_KO : HOUSE_THEME_EN
  const cue = s.cue ?? (hasSun ? themeMap[s.sunHouse as number] : undefined)

  if (lang === 'ko') {
    const ascPart = hasAsc ? `ASC ${signLabel(s.ascSign as ZodiacKo, lang)}` : ''
    const sunPart = hasSun ? `태양 ${s.sunHouse}궁` : ''
    const head = [ascPart, sunPart].filter(Boolean).join(', ')
    const tail = cue ? ` — ${cue}` : ''
    return `올해의 솔라 리턴: ${head}${tail}.`
  } else {
    const ascPart = hasAsc ? `ASC ${signLabel(s.ascSign as ZodiacKo, lang)}` : ''
    const sunPart = hasSun ? `Sun in ${ordinalEn(s.sunHouse as number)}` : ''
    const head = [ascPart, sunPart].filter(Boolean).join(', ')
    const tail = cue ? ` — ${cue}` : ''
    return `Solar Return: ${head}${tail}.`
  }
}

function ordinalEn(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}
