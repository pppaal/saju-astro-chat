/**
 * Plain-Korean post-processing for calendar evidence lines.
 *
 * The lite + ultra-precision engines emit lines that mix:
 *   - hanja stems / branches (辛, 未, 丁卯)
 *   - 십신 jargon (편관, 식신, 정인 …)
 *   - 12운성 stage names (장생, 관대, 제왕 …)
 *   - English astrology terms (Mercury, Sun, square, trine, retrograde)
 *
 * Sajuists read this fine. Regular users don't. This module gives a
 * single `humanizeEvidence(text, locale)` pass that rewrites those
 * tokens into either plain-Korean phrasing or appended hint text in
 * parentheses, so the bullet list reads naturally to a non-expert.
 */

// Pure hanja → hangul reading (no element suffix). Phrase-level
// generators already attach element context like "(금)" / "(토)" where
// it's needed, so we don't want to double-stamp.
const STEM_KO_MAP: Record<string, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
}
const BRANCH_KO_MAP: Record<string, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해',
}
const SIBSIN_PARENS_KO: Record<string, string> = {
  비견: '동료 흐름',
  겁재: '경쟁 흐름',
  식신: '꾸준한 표현',
  상관: '강한 발산',
  편재: '유동적 자원',
  정재: '안정 자원',
  편관: '도전·책임 압박',
  정관: '공식 직책',
  편인: '학습·내면 정비',
  정인: '돌봄·문서·인정',
}
const TWELVE_STAGE_PHRASE: Record<string, string> = {
  장생: '시작이 살아나는 시기',
  목욕: '환경 전환·정비',
  관대: '자리 잡기',
  건록: '왕성한 활동',
  제왕: '정점',
  쇠: '에너지 빠지는 구간',
  병: '재정비 구간',
  사: '마무리 구간',
  묘: '정리·보관',
  절: '단절·새 출발',
  태: '준비·잉태',
  양: '돌봄·축적',
}

const PLANET_KO: Record<string, string> = {
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
  Chiron: '카이론',
  'North Node': '북교점',
  'South Node': '남교점',
  Ascendant: '상승궁',
  MC: '천정',
}
const ASPECT_KO: Record<string, string> = {
  conjunction: '합쳐지는 각도',
  opposition: '맞서는 각도',
  square: '견제하는 각도',
  trine: '받쳐주는 각도',
  sextile: '도와주는 각도',
  semisextile: '약하게 닿는 각도',
  quincunx: '엇갈리는 각도',
  quintile: '창의적 자극',
  biquintile: '미묘한 자극',
}
const ZODIAC_KO: Record<string, string> = {
  Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
  Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
  Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
}

const RETROGRADE_PHRASE_KO = '역행'

/**
 * Run plain-Korean substitutions over a single evidence line.
 * Idempotent — safe to run twice.
 */
export function humanizeEvidence(input: string, locale: 'ko' | 'en' = 'ko'): string {
  if (!input) return ''
  let s = input
  if (locale === 'ko') {
    // Hanja stems/branches → single-char hangul reading.
    s = s.replace(/([甲乙丙丁戊己庚辛壬癸])/g, (_m, ch: string) => STEM_KO_MAP[ch] || ch)
    s = s.replace(/([子丑寅卯辰巳午未申酉戌亥])/g, (_m, ch: string) => BRANCH_KO_MAP[ch] || ch)
    // 십신 jargon: append plain-Korean hint in parentheses ONCE per line.
    const seenSibsin = new Set<string>()
    for (const [k, hint] of Object.entries(SIBSIN_PARENS_KO)) {
      if (s.includes(k) && !seenSibsin.has(k)) {
        seenSibsin.add(k)
        s = s.replace(k, `${k}(${hint})`)
      }
    }
    // 12운성 raw stage: replace bare "12운성 흐름은 X — Y." with the more
    // readable phrase form.
    s = s.replace(
      /12운성 흐름은\s*([장목관건제쇠병사묘절태양생욕대록왕]+)\s*—\s*([^.]+)\./g,
      (_m, stage: string, phase: string) => {
        const phrase = TWELVE_STAGE_PHRASE[stage.trim()]
        if (phrase) return `생애 흐름은 ${phrase}이라, ${phase.trim()}.`
        return `생애 흐름은 ${stage} — ${phase}.`
      }
    )
    // Astrology planets / aspects (KO).
    for (const [en, ko] of Object.entries(PLANET_KO)) {
      s = s.replace(new RegExp(`\\b${en}\\b`, 'g'), ko)
    }
    for (const [en, ko] of Object.entries(ASPECT_KO)) {
      s = s.replace(new RegExp(`\\b${en}\\b`, 'gi'), ko)
    }
    for (const [en, ko] of Object.entries(ZODIAC_KO)) {
      s = s.replace(new RegExp(`\\b${en}\\b`, 'g'), ko)
    }
    s = s.replace(/\bretrograde\b/gi, RETROGRADE_PHRASE_KO)
    s = s.replace(/\bapplying\b/gi, '접근')
    s = s.replace(/\bseparating\b/gi, '분리')
  }
  // Collapse any double spaces created by replacements.
  return s.replace(/\s{2,}/g, ' ').trim()
}
