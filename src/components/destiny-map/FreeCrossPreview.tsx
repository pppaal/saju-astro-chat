'use client'

/**
 * Free Cross Signal Preview — destiny-map 무료에서 보여주는
 * Premium 깊이 *맛보기*. 2-3개 핵심 cross 신호만 짧게.
 *
 * 사주 + 점성 데이터에서 기본 신호를 추출해 한 줄씩.
 */

interface FreeCrossPreviewProps {
  saju?: Record<string, unknown>
  astrology?: Record<string, unknown>
  lang?: 'ko' | 'en'
  className?: string
}

const ELEMENT_KO: Record<string, string> = {
  Wood: '목',
  Fire: '화',
  Earth: '토',
  Metal: '금',
  Water: '수',
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
}

const ELEMENT_TONE: Record<string, string> = {
  목: '시작·확장',
  화: '표현·발산',
  토: '안정·중심',
  금: '결단·정리',
  수: '직관·정서',
}

const SIGN_TO_ELEMENT: Record<string, string> = {
  Aries: '화', Leo: '화', Sagittarius: '화',
  Taurus: '토', Virgo: '토', Capricorn: '토',
  Gemini: '목', Libra: '목', Aquarius: '목',
  Cancer: '수', Scorpio: '수', Pisces: '수',
}

function pickStr(obj: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!obj) return undefined
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v
    if (v && typeof v === 'object' && 'name' in v && typeof (v as { name: unknown }).name === 'string') {
      return (v as { name: string }).name
    }
  }
  return undefined
}

export default function FreeCrossPreview({ saju, astrology, lang = 'ko', className = '' }: FreeCrossPreviewProps) {
  const isKo = lang === 'ko'

  // 사주 측 — 일간 element
  const dayMasterElementRaw =
    pickStr(saju, 'dayMasterElement') ||
    (saju as { dayMaster?: { element?: string } } | undefined)?.dayMaster?.element
  const sajuElement = dayMasterElementRaw ? ELEMENT_KO[dayMasterElementRaw] : undefined

  // 점성 측 — 태양·ASC sign
  const planetSigns = (astrology?.planetSigns as Record<string, string> | undefined) || {}
  const sunSign = planetSigns.Sun || pickStr(astrology, 'sunSign')
  const ascSign = planetSigns.Ascendant || pickStr(astrology, 'ascSign')
  const astroElement = sunSign ? SIGN_TO_ELEMENT[sunSign] : undefined

  const lines: Array<{ label: string; text: string }> = []

  // Cross 1: 일간 vs 태양 element
  if (sajuElement && astroElement) {
    const same = sajuElement === astroElement
    lines.push({
      label: isKo ? '본명 결' : 'Core',
      text: isKo
        ? same
          ? `사주 일간 ${sajuElement} + 점성 태양 ${ELEMENT_KO[astroElement] || astroElement} — 두 시스템이 같은 ${ELEMENT_TONE[sajuElement]} 결을 가리켜요. 자기 색이 또렷한 차트예요.`
          : `사주 일간 ${sajuElement}(${ELEMENT_TONE[sajuElement]}) + 점성 태양 ${ELEMENT_KO[astroElement] || astroElement}(${ELEMENT_TONE[ELEMENT_KO[astroElement] || astroElement]}) — 두 결이 다른 차트라 안과 밖이 다른 톤이에요.`
        : same
          ? `Saju day master ${sajuElement} + Sun ${astroElement} — both systems point to the same tone.`
          : `Saju day master ${sajuElement} + Sun ${astroElement} — inner and outer tones differ.`,
    })
  }

  // Cross 2: ASC sign 톤
  if (ascSign && sajuElement) {
    const ascEl = SIGN_TO_ELEMENT[ascSign]
    if (ascEl) {
      const same = sajuElement === ELEMENT_KO[ascEl]
      lines.push({
        label: isKo ? '첫인상' : 'First impression',
        text: isKo
          ? same
            ? `상승 ${ascSign}(${ELEMENT_TONE[ELEMENT_KO[ascEl] || ascEl]} 결)와 일간이 같은 결 — 안팎이 일치하는 자기 표현이 자연스러운 차트예요.`
            : `상승 ${ascSign}(${ELEMENT_TONE[ELEMENT_KO[ascEl] || ascEl]} 결) — 첫인상은 ${ELEMENT_TONE[ELEMENT_KO[ascEl] || ascEl]} 톤으로 비치되 본명 결정은 ${ELEMENT_TONE[sajuElement]} 결이라, 안팎이 다른 두 겹의 자아를 가진 차트예요.`
          : `Ascendant ${ascSign}.`,
      })
    }
  }

  if (lines.length === 0) return null

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">
          Saju × Astrology Cross
        </p>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
          맛보기
        </span>
      </div>

      <ul className="space-y-3">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="flex-shrink-0 self-start rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200/85"
              style={{ marginTop: 2 }}
            >
              {line.label}
            </span>
            <p
              className="text-[13px] leading-[1.65] text-slate-200/90"
              style={{ wordBreak: 'keep-all' }}
            >
              {line.text}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-slate-500">
        Premium에서는 12+ cross 차원, 격국·신살·60갑자 정통 풀이까지 깊이 들어갑니다.
      </p>
    </section>
  )
}
