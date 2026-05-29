'use client'

import React from 'react'
import {
  getHanjaRich,
  getGeokgukRich,
  getPlanetCore,
  getHouseRich,
  type Lang,
  type HouseNumber,
  type HanjaStemLangEntry,
} from '@/lib/chart-dictionary'

/**
 * 차트 모달 Level 2 — 사주 ↔ 점성 교차 raw 표.
 *
 * 동양 (사주) raw 와 서양 (점성) raw 를 같은 영역끼리 좌/우 나란히 보여줌.
 * 비전공자가 "내 정체성·욕망·역할·흐름" 등 7 영역에서 두 시스템이 일치(동조)
 * 하는지 보완하는지 즉시 파악.
 *
 * 보완 (예: 일간 金 ↔ 태양 Earth — 다른 결을 채워줌) → gold 하이라이트.
 * 동조 (예: 격국 정관격 ↔ MC 염소자리 — 같은 결 강조) → checkmark.
 * (충돌 감지는 다음 PR — 일단 보완·동조만.)
 */
interface CrossRefTableProps {
  saju: unknown
  astro: unknown
  lang?: Lang
}

// ── Narrow shape interfaces (둘 다 /api/* 응답 또는 NatalContext 모두 수용) ──
interface SajuLike {
  dayMaster?: { name?: string; element?: string }
  birthYear?: number
  advancedAnalysis?: {
    geokguk?: { primary?: string }
    yongsin?: { primaryYongsin?: string }
  }
  daeun?: {
    list?: Array<{
      age?: number
      heavenlyStem?: string
      earthlyBranch?: string
      ganji?: string
    }>
  }
  table?: {
    byPillar?: {
      day?: {
        twelveStage?: string
        twelveShinsal?: string[] | string
        shinsal?: string[]
      }
    }
  }
  relations?: Array<{ kind?: string; detail?: string }>
}

interface PlanetLike {
  name?: string
  sign?: string
  house?: number
  formatted?: string
}

interface AstroLike {
  chartData?: {
    planets?: PlanetLike[]
    mc?: PlanetLike | { sign?: string; formatted?: string }
    ascendant?: PlanetLike
  }
  planets?: PlanetLike[]
  mc?: PlanetLike | { sign?: string; formatted?: string }
  advanced?: {
    points?: PlanetLike[]
  }
  aspects?: unknown[]
  chart?: {
    planets?: PlanetLike[]
    mc?: PlanetLike
    extraPoints?: { partOfFortune?: { sign?: string; house?: number } }
  }
  extraPoints?: { partOfFortune?: { sign?: string; house?: number } }
}

// ── Element 매핑 (사주 오행 ↔ 서양 4원소) ─────────────────────────────────
// 사주 5 원소 → 서양 4 원소 mapping (금 은 서양 4 원소에 대응 없음 — null).
// 목 → Air, 화 → Fire, 토 → Earth, 수 → Water, 금 → null (매칭 X).
// null 인 경우 동조/보완 판정에서 제외 — 5 원소 → 4 원소 정보 손실 방지.
const SAJU_TO_WESTERN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water' | null> = {
  목: 'air',
  화: 'fire',
  토: 'earth',
  금: null, // 금 (metal) 은 서양 4 원소에 직접 대응 X — 별도 분류
  수: 'water',
  wood: 'air',
  fire: 'fire',
  earth: 'earth',
  metal: null,
  water: 'water',
}

const SIGN_TO_WESTERN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  // KO
  양자리: 'fire', 사자자리: 'fire', 사수자리: 'fire',
  황소자리: 'earth', 처녀자리: 'earth', 염소자리: 'earth',
  쌍둥이자리: 'air', 천칭자리: 'air', 물병자리: 'air',
  게자리: 'water', 전갈자리: 'water', 물고기자리: 'water',
  // EN
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

/** 점성 sign 영문 → 한국어. API 가 영문만 반환해 KO 모드에서 비전공자에 어색. */
const SIGN_EN_TO_KO: Record<string, string> = {
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

/** 4 원소 영문 → 한국어. KO 모드 친화. */
const ELEMENT_EN_TO_KO: Record<string, string> = {
  fire: '불',
  earth: '흙',
  air: '공기',
  water: '물',
}

/** sign 을 KO 모드면 한국어로, EN 모드면 영어 그대로. element 도 동일. */
function localizeSign(sign: string | undefined, lang: 'ko' | 'en'): string {
  if (!sign) return ''
  if (lang === 'en') return sign
  return SIGN_EN_TO_KO[sign] ?? sign
}
function localizeElement(el: string | undefined, lang: 'ko' | 'en'): string {
  if (!el) return ''
  if (lang === 'en') return el
  return ELEMENT_EN_TO_KO[el] ?? el
}

// 격국 → 점성 MC sign "동조" (책임/표현/조화 등 결 일치). 단순 가시화 휴리스틱.
const GEOKGUK_RESONANT_SIGNS: Record<string, string[]> = {
  정관격: ['염소자리', 'Capricorn', '천칭자리', 'Libra'],
  편관격: ['전갈자리', 'Scorpio', '양자리', 'Aries'],
  정인격: ['게자리', 'Cancer', '물고기자리', 'Pisces'],
  편인격: ['물병자리', 'Aquarius', '사수자리', 'Sagittarius'],
  식신격: ['황소자리', 'Taurus', '게자리', 'Cancer'],
  상관격: ['쌍둥이자리', 'Gemini', '사자자리', 'Leo'],
  정재격: ['황소자리', 'Taurus', '처녀자리', 'Virgo'],
  편재격: ['사수자리', 'Sagittarius', '쌍둥이자리', 'Gemini'],
}

// ── 도움 함수 ───────────────────────────────────────────────────────────
function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function findPlanet(astro: AstroLike, name: string): PlanetLike | undefined {
  const lists: Array<PlanetLike[] | undefined> = [
    astro.chartData?.planets,
    astro.planets,
    astro.advanced?.points,
    astro.chart?.planets,
  ]
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    const hit = list.find((p) => p?.name === name)
    if (hit) return hit
  }
  return undefined
}

function getMc(astro: AstroLike): PlanetLike | undefined {
  const candidates = [astro.chartData?.mc, astro.mc, astro.chart?.mc]
  for (const c of candidates) {
    if (c && typeof c === 'object') return c as PlanetLike
  }
  return undefined
}

function getPof(astro: AstroLike): { sign?: string; house?: number } | undefined {
  return astro.extraPoints?.partOfFortune ?? astro.chart?.extraPoints?.partOfFortune
}

function findCurrentDaeun(
  daeunList: NonNullable<NonNullable<SajuLike['daeun']>['list']>,
  birthYear: number | undefined
): { age?: number; heavenlyStem?: string; earthlyBranch?: string; ganji?: string } | undefined {
  if (daeunList.length === 0) return undefined
  if (isFiniteNumber(birthYear)) {
    const currentAge = new Date().getFullYear() - birthYear
    let current = daeunList[0]
    for (const c of daeunList) {
      if ((c.age ?? 0) <= currentAge) current = c
      else break
    }
    return current
  }
  return daeunList[Math.min(2, daeunList.length - 1)]
}

// ── Row 데이터 모델 ──────────────────────────────────────────────────────
type RowTone = 'neutral' | 'complement' | 'resonant'

interface CrossRow {
  category: string // "정체성" / "필요" 등
  leftLabel: string // "일간" / "용신"
  leftValue: string // "辛 (음·금)"
  leftHint?: string // 한자 의미 / tagline (mouseover 용 — title 속성)
  rightLabel: string // "태양 sign" / "달 sign"
  rightValue: string // "Virgo (Earth)"
  rightHint?: string
  tone: RowTone
}

// ── Row 빌더 ───────────────────────────────────────────────────────────
function buildRows(saju: SajuLike, astro: AstroLike, lang: Lang): CrossRow[] {
  const rows: CrossRow[] = []

  // 1. 정체성: 일간 ↔ 태양 sign
  {
    const dm = saju.dayMaster?.name
    const sun = findPlanet(astro, 'Sun')
    if (dm && sun?.sign) {
      const hanja = getHanjaRich(dm, lang)
      const stem = hanja && 'as_daymaster' in hanja ? (hanja as HanjaStemLangEntry) : undefined
      const dmEl = saju.dayMaster?.element ?? stem?.element
      const leftValue = stem
        ? `${dm} (${stem.yinYang}·${stem.element})`
        : `${dm}${dmEl ? ` (${dmEl})` : ''}`
      const sajuWest = dmEl ? SAJU_TO_WESTERN_ELEMENT[dmEl] : undefined
      const sunWest = SIGN_TO_WESTERN_ELEMENT[sun.sign]
      const tone: RowTone =
        sajuWest && sunWest ? (sajuWest === sunWest ? 'resonant' : 'complement') : 'neutral'
      rows.push({
        category: lang === 'ko' ? '정체성' : 'Identity',
        leftLabel: lang === 'ko' ? '일간 (나)' : 'Day Master',
        leftValue,
        leftHint: stem?.image,
        rightLabel: lang === 'ko' ? '태양 별자리' : 'Sun sign',
        rightValue: sunWest
          ? `${localizeSign(sun.sign, lang)} (${localizeElement(sunWest, lang)})`
          : localizeSign(sun.sign, lang),
        rightHint: getPlanetCore('Sun', lang)?.principle,
        tone,
      })
    }
  }

  // 2. 필요/욕망: 용신 ↔ 달 sign
  {
    const yongsin = saju.advancedAnalysis?.yongsin?.primaryYongsin
    const moon = findPlanet(astro, 'Moon')
    if (yongsin && moon?.sign) {
      const yongWest = SAJU_TO_WESTERN_ELEMENT[yongsin]
      const moonWest = SIGN_TO_WESTERN_ELEMENT[moon.sign]
      const tone: RowTone =
        yongWest && moonWest && yongWest === moonWest ? 'complement' : 'neutral'
      rows.push({
        category: lang === 'ko' ? '필요·욕망' : 'Needs',
        leftLabel: lang === 'ko' ? '용신 (필요 원소)' : 'Yongsin',
        leftValue: yongsin,
        rightLabel: lang === 'ko' ? '달 별자리' : 'Moon sign',
        rightValue: moonWest
          ? `${localizeSign(moon.sign, lang)} (${localizeElement(moonWest, lang)})`
          : localizeSign(moon.sign, lang),
        rightHint: getPlanetCore('Moon', lang)?.principle,
        tone,
      })
    }
  }

  // 3. 사회 역할: 격국 ↔ MC sign
  {
    const geokguk = saju.advancedAnalysis?.geokguk?.primary
    const mc = getMc(astro)
    if (geokguk && mc?.sign) {
      const taglineEntry = getGeokgukRich(geokguk, lang)
      const resonantList = GEOKGUK_RESONANT_SIGNS[geokguk]
      const tone: RowTone = resonantList?.includes(mc.sign) ? 'resonant' : 'neutral'
      rows.push({
        category: lang === 'ko' ? '사회 역할' : 'Social Role',
        leftLabel: lang === 'ko' ? '격국' : 'Geokguk',
        leftValue: geokguk,
        leftHint: taglineEntry?.tagline,
        rightLabel: lang === 'ko' ? 'MC (천직)' : 'MC',
        rightValue: localizeSign(mc.sign, lang),
        tone,
      })
    }
  }

  // 4. 현재 흐름: 현재 대운 ↔ 활성 transit (없으면 N/A — row 자체는 출력)
  {
    const daeunList = saju.daeun?.list ?? []
    const current = findCurrentDaeun(daeunList, saju.birthYear)
    if (current) {
      const stem = current.heavenlyStem ?? ''
      const branch = current.earthlyBranch ?? ''
      const ganji = current.ganji ?? `${stem}${branch}`.trim()
      if (ganji) {
        rows.push({
          category: lang === 'ko' ? '현재 흐름' : 'Current Flow',
          leftLabel: lang === 'ko' ? '현재 대운' : 'Current Daeun',
          leftValue: `${current.age ?? 0}~ ${ganji}`,
          rightLabel: lang === 'ko' ? '활성 transit' : 'Active transit',
          rightValue: lang === 'ko' ? '아직 없음' : 'N/A',
          tone: 'neutral',
        })
      }
    }
  }

  // 5. 길흉: 12신살 (일주) ↔ POF house
  {
    const dayCell = saju.table?.byPillar?.day
    const luckySource = dayCell?.shinsal ?? []
    const lucky = Array.isArray(luckySource) ? luckySource.filter(Boolean) : []
    const pof = getPof(astro)
    if (lucky.length > 0 || pof?.house || pof?.sign) {
      const right =
        pof && (pof.house || pof.sign)
          ? `${pof.sign ? localizeSign(pof.sign, lang) : ''}${
              pof.house ? ` ${pof.house}H` : ''
            }`.trim()
          : lang === 'ko' ? '아직 없음' : 'N/A'
      const houseHint =
        pof?.house && pof.house >= 1 && pof.house <= 12
          ? getHouseRich(pof.house as HouseNumber, lang)?.domain
          : undefined
      rows.push({
        category: lang === 'ko' ? '길흉' : 'Fortune',
        leftLabel: lang === 'ko' ? '12 신살 (일주)' : 'Sinsal (day)',
        leftValue: lucky.length > 0 ? lucky.join(' · ') : lang === 'ko' ? '아직 없음' : 'N/A',
        rightLabel: lang === 'ko' ? '행운점 (POF)' : 'Part of Fortune',
        rightValue: right,
        rightHint: houseHint,
        tone: 'neutral',
      })
    }
  }

  // 6. 관계: 합/충 (사주 내) ↔ 주요 aspect (개수)
  {
    const relations = saju.relations ?? []
    const aspects = Array.isArray(astro.aspects) ? astro.aspects : []
    if (relations.length > 0 || aspects.length > 0) {
      const hapCount = relations.filter((r) => (r.kind ?? '').includes('합')).length
      const chungCount = relations.filter((r) => (r.kind ?? '').includes('충')).length
      const leftParts: string[] = []
      if (hapCount > 0) leftParts.push(lang === 'ko' ? `합 ${hapCount}` : `${hapCount} hap`)
      if (chungCount > 0) leftParts.push(lang === 'ko' ? `충 ${chungCount}` : `${chungCount} chung`)
      rows.push({
        category: lang === 'ko' ? '관계' : 'Relations',
        leftLabel: lang === 'ko' ? '합·충 (사주 내)' : 'Hap/Chung',
        leftValue: leftParts.length > 0 ? leftParts.join(' · ') : lang === 'ko' ? '아직 없음' : 'N/A',
        rightLabel: lang === 'ko' ? '주요 aspect' : 'Major aspects',
        rightValue:
          aspects.length > 0
            ? lang === 'ko'
              ? `${aspects.length}개`
              : `${aspects.length}`
            : lang === 'ko' ? '아직 없음' : 'N/A',
        tone: 'neutral',
      })
    }
  }

  // 7. 강점: 12운성 (일주) ↔ 행성 dignity (강한 것)
  {
    const stage = saju.table?.byPillar?.day?.twelveStage
    // dignity 강세 표시 — 데이터 없으므로 N/A.
    if (stage) {
      rows.push({
        category: lang === 'ko' ? '강점' : 'Strength',
        leftLabel: lang === 'ko' ? '12 운성 (일주)' : 'Twelve Stage',
        leftValue: stage,
        rightLabel: lang === 'ko' ? '행성 위신' : 'Planet dignity',
        rightValue: lang === 'ko' ? '아직 없음' : 'N/A',
        tone: 'neutral',
      })
    }
  }

  return rows
}

// ── Tone 별 styling ─────────────────────────────────────────────────────
function toneStyle(tone: RowTone): { background: string; border: string } {
  if (tone === 'complement') {
    return {
      background: 'rgba(212, 181, 114, 0.08)',
      border: '1px solid rgba(212, 181, 114, 0.35)',
    }
  }
  if (tone === 'resonant') {
    return {
      background: 'rgba(212, 181, 114, 0.08)',
      border: '1px solid rgba(212, 181, 114, 0.35)',
    }
  }
  return {
    background: 'var(--ds-dark-surface)',
    border: '1px solid var(--ds-dark-border)',
  }
}

function toneBadge(tone: RowTone, lang: Lang): string | null {
  if (tone === 'complement') return lang === 'ko' ? '보완' : 'complement'
  if (tone === 'resonant') return lang === 'ko' ? '동조 ✓' : 'resonant ✓'
  return null
}

// ── Component ──────────────────────────────────────────────────────────
export function CrossRefTable({ saju, astro, lang = 'ko' }: CrossRefTableProps) {
  if (!saju || !astro) return null
  const rows = buildRows(saju as SajuLike, astro as AstroLike, lang)
  if (rows.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="space-y-1 px-1">
        <div
          className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--ds-gold-on-dark)' }}
        >
          <span>{lang === 'ko' ? '사주 ↔ 점성 교차' : 'Saju ↔ Astrology'}</span>
          <span style={{ color: 'var(--ds-dark-text-muted)', fontSize: 10 }}>
            {lang === 'ko' ? '동양 (좌) ↔ 서양 (우)' : 'East ↔ West'}
          </span>
        </div>
        <p className="text-[11px] leading-snug" style={{ color: 'var(--ds-dark-text-muted)' }}>
          {lang === 'ko'
            ? '같은 영역을 두 시스템에서 어떻게 보는지 — 금색 박스(✓)는 두 시스템이 같은 결을 가리킬 때 표시돼요.'
            : 'How each life area looks in both systems — gold boxes (✓) mark where they point to the same thing.'}
        </p>
      </div>

      <ul className="space-y-1.5">
        {rows.map((row, idx) => {
          const style = toneStyle(row.tone)
          const badge = toneBadge(row.tone, lang)
          return (
            <li
              key={idx}
              className="relative rounded-lg px-3 py-2"
              style={{ background: style.background, border: style.border }}
            >
              {/* 카테고리 칩 + tone 배지 (우상단) */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background: 'rgba(212, 181, 114, 0.12)',
                    color: 'var(--ds-gold-on-dark)',
                    border: '1px solid rgba(212, 181, 114, 0.25)',
                  }}
                >
                  {row.category}
                </span>
                {badge && (
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color:
                        row.tone === 'complement'
                          ? 'var(--ds-gold-on-dark)'
                          : 'rgba(167, 139, 250, 0.95)',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>

              {/* 좌 (사주) ↔ 우 (점성) */}
              <div
                className="grid items-start gap-2"
                style={{ gridTemplateColumns: '1fr auto 1fr' }}
              >
                <div className="min-w-0">
                  <div
                    className="text-[10px]"
                    style={{ color: 'var(--ds-dark-text-muted)' }}
                  >
                    {row.leftLabel}
                  </div>
                  <div
                    className="text-xs leading-snug sm:text-sm"
                    style={{ color: 'var(--ds-dark-text)' }}
                    title={row.leftHint}
                  >
                    {row.leftValue}
                  </div>
                </div>

                <div
                  className="select-none px-1 text-base"
                  style={{ color: 'var(--ds-gold-on-dark)', lineHeight: '1.6' }}
                  aria-hidden="true"
                >
                  ↔
                </div>

                <div className="min-w-0 text-right">
                  <div
                    className="text-[10px]"
                    style={{ color: 'var(--ds-dark-text-muted)' }}
                  >
                    {row.rightLabel}
                  </div>
                  <div
                    className="text-xs leading-snug sm:text-sm"
                    style={{ color: 'var(--ds-dark-text)' }}
                    title={row.rightHint}
                  >
                    {row.rightValue}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
