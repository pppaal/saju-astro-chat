/**
 * 테마별 리포트 — 교차(natalCross) 카테고리를 소비자 친화 "큰 테마" 6개로 묶는다.
 * 리포트가 시스템 순서(명식→천궁도→어스펙트)가 아니라 삶의 주제(나·연애·일·돈·
 * 성장·건강) 순으로 읽히게 하는 표현 계층. 판단은 그대로 엔진(cross rows)이 내고,
 * 여기선 묶음·순서·건강 카드만 담당한다(결정적·순수).
 */

export type Lang = 'ko' | 'en'
export type Tone = 'resonant' | 'complement' | 'tension' | 'neutral'

export interface ThemeRowLike {
  category: string
  tone: Tone
  left?: string
  right?: string
  reason: string
  karmaAxis?: boolean
}

export interface ThemeDef {
  key: string
  emoji: string
  title: { ko: string; en: string }
  /** 테마 도입 한 줄 — 무엇을 보는 묶음인지. */
  lead: { ko: string; en: string }
}

// 노출 순서 = 관심도 순(나 → 연애 → 일 → 돈 → 성장 → 건강).
export const THEME_DEFS: readonly ThemeDef[] = [
  {
    key: 'self',
    emoji: '🧍',
    title: { ko: '나는 어떤 사람', en: 'Who you are' },
    lead: {
      ko: '타고난 성격·기질과 나를 움직이는 기본 결.',
      en: 'Your core personality and the grain that moves you.',
    },
  },
  {
    key: 'love',
    emoji: '💞',
    title: { ko: '연애·관계', en: 'Love & relationships' },
    lead: {
      ko: '사람을 끌고, 사랑하고, 어울리는 방식.',
      en: 'How you attract, love, and relate.',
    },
  },
  {
    key: 'work',
    emoji: '💼',
    title: { ko: '일·진로·강점', en: 'Work & strengths' },
    lead: {
      ko: '밖에서 빛나는 자리와 끝까지 미는 힘.',
      en: 'Where you shine and the drive that carries you.',
    },
  },
  {
    key: 'money',
    emoji: '💰',
    title: { ko: '돈·재물', en: 'Money & resources' },
    lead: {
      ko: '돈과 자원을 모으고 키우는 그릇.',
      en: 'How you gather and grow what you have.',
    },
  },
  {
    key: 'growth',
    emoji: '🌱',
    title: { ko: '성장·인생 과제', en: 'Growth & lifework' },
    lead: {
      ko: '평생에 걸쳐 스스로 채우고 키워가는 방향.',
      en: 'What you build and grow over a lifetime.',
    },
  },
  {
    key: 'health',
    emoji: '🩺',
    title: { ko: '건강·체질', en: 'Health & constitution' },
    lead: {
      ko: '오행 균형으로 본 체질 경향과 관리 포인트.',
      en: 'Constitutional tendencies from your element balance.',
    },
  },
]

// 교차 카테고리(ko·en 둘 다) → 테마 key. 엔진이 lang 에 따라 ko/en 라벨을 내므로
// 두 표기를 모두 등록한다.
const CATEGORY_TO_THEME: Record<string, string> = {
  // self
  정체성: 'self',
  Identity: 'self',
  기질: 'self',
  Temperament: 'self',
  '핵심 성향': 'self',
  'Core Trait': 'self',
  에너지: 'self',
  Energy: 'self',
  '음양 리듬': 'self',
  'Yin-Yang Rhythm': 'self',
  // love
  '연애·매력': 'love',
  'Love & Magnetism': 'love',
  관계: 'love',
  Relationships: 'love',
  '소통·표현': 'love',
  'Voice & Expression': 'love',
  // work
  사회역할: 'work',
  'Social Role': 'work',
  강점: 'work',
  Strength: 'work',
  추진력: 'work',
  Drive: 'work',
  // money
  '재물 그릇': 'money',
  'Wealth Capacity': 'money',
  길흉: 'money',
  Fortune: 'money',
  // growth
  '성장 방향': 'growth',
  'Growth Direction': 'growth',
  '공망/카르마': 'growth',
  'Void / Karma': 'growth',
  욕망: 'growth',
  Needs: 'growth',
  '이동·변화': 'growth',
  'Movement & Change': 'growth',
  '예술·영성': 'growth',
  'Art & Spirit': 'growth',
}

export interface ThemeGroup {
  def: ThemeDef
  rows: ThemeRowLike[]
}

/** 교차 rows 를 테마별로 묶어 THEME_DEFS 순서로 돌려준다. 빈 테마는 제외하되,
 *  건강(health)은 cross 카테고리가 없으므로 호출 측에서 buildHealthCard 로 채운다. */
export function groupByTheme(rows: ThemeRowLike[]): ThemeGroup[] {
  const buckets: Record<string, ThemeRowLike[]> = {}
  for (const r of rows) {
    // CATEGORY_TO_THEME maps every current cross category (ko+en). The `?? 'self'`
    // is a safety net only: a NEW evaluator category lands under "나는 어떤 사람"
    // instead of vanishing. If you add a category, map it explicitly above —
    // don't rely on this fallback.
    const key = CATEGORY_TO_THEME[r.category] ?? 'self'
    ;(buckets[key] ??= []).push(r)
  }
  return THEME_DEFS.map((def) => ({ def, rows: buckets[def.key] ?? [] })).filter(
    (g) => g.rows.length > 0
  )
}

// ── 건강 카드 ────────────────────────────────────────────────────────────
// 오행 → 장부·체질 경향(전통 오행-오장 대응). 단정 진단이 아니라 "관리 포인트"
// 경향으로 풀어쓴다(안전).
type El = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
const EL_KO: Record<El, string> = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)',
}
const EL_EN: Record<El, string> = {
  wood: 'Wood',
  fire: 'Fire',
  earth: 'Earth',
  metal: 'Metal',
  water: 'Water',
}
const ORGAN: Record<El, { ko: string; en: string }> = {
  wood: { ko: '간·담(눈·근육·스트레스)', en: 'liver & gallbladder (eyes, tendons, stress)' },
  fire: {
    ko: '심장·소장(순환·수면·마음)',
    en: 'heart & small intestine (circulation, sleep, mood)',
  },
  earth: { ko: '비·위(소화·면역)', en: 'spleen & stomach (digestion, immunity)' },
  metal: { ko: '폐·대장(호흡·피부)', en: 'lungs & large intestine (breath, skin)' },
  water: { ko: '신장·방광(호르몬·뼈·기력)', en: 'kidney & bladder (hormones, bones, stamina)' },
}

export interface HealthCard {
  category: string
  tone: Tone
  left?: string
  right?: string
  reason: string
}

/** 오행 분포 + 용신으로 체질 경향 한 카드 생성(결정적). */
export function buildHealthCard(
  counts: Partial<Record<El, number>> | undefined,
  yongsinPrimary: string | null | undefined,
  lang: Lang
): HealthCard | null {
  if (!counts) return null
  const els: El[] = ['wood', 'fire', 'earth', 'metal', 'water']
  const pairs = els.map((e) => [e, counts[e] ?? 0] as const)
  const total = pairs.reduce((s, [, n]) => s + n, 0)
  if (total === 0) return null
  const dom = pairs.reduce((a, b) => (b[1] > a[1] ? b : a))
  const lacking = pairs.filter(([, n]) => n === 0).map(([e]) => e)
  const yong = (yongsinPrimary?.toLowerCase() as El) || undefined
  const ok = lang === 'ko'

  // 과다(가장 두터운 기운이 평균의 2배 이상) 여부
  const excess = dom[1] >= Math.max(2, Math.ceil((total / 5) * 2))

  // 오행-장부 대응은 '단정'이 아니라 동양의학에서 짝지어 보는 전통적 연결임을
  // 분명히 한다(의료 주장 리스크 완화). "약해진다/과열된다" 같은 단정 대신
  // "에너지가 쏠리기/덜 채워지기 쉬운 영역" 같은 경향 표현으로 한 톤 낮춘다.
  const parts: string[] = []
  if (excess) {
    parts.push(
      ok
        ? `${EL_KO[dom[0]]} 기운이 ${dom[1]}개로 두터운 편이에요. 동양의학에서 이 기운과 짝지어 보는 ${ORGAN[dom[0]].ko} 영역에 에너지가 쏠리기 쉬운 결이라, 가끔 쉬어주고 무리하지 않으면 좋아요.`
        : `${EL_EN[dom[0]]} runs heavy (${dom[1]}). In the East-Asian view this energy is paired with ${ORGAN[dom[0]].en}, an area that tends to draw a lot of your energy — so easing off now and then helps.`
    )
  }
  if (lacking.length) {
    const lkKo = lacking.map((e) => EL_KO[e]).join('·')
    const lkEn =
      lacking.length === 1
        ? EL_EN[lacking[0]]
        : `${lacking
            .slice(0, -1)
            .map((e) => EL_EN[e])
            .join(', ')} and ${EL_EN[lacking[lacking.length - 1]]}`
    const organKo = lacking.map((e) => ORGAN[e].ko.split('(')[0]).join('·')
    const organEn = lacking.map((e) => ORGAN[e].en.split(' (')[0]).join(', ')
    parts.push(
      ok
        ? `${lkKo} 기운은 비어 있는 편이라, 전통적으로 이 기운과 짝지어 보는 ${organKo} 영역을 평소 조금 더 살펴주면 균형에 도움이 돼요.`
        : `${lkEn} ${lacking.length > 1 ? 'are' : 'is'} on the empty side, so the area traditionally paired with it — ${organEn} — is worth a little extra everyday care.`
    )
  }
  if (!excess && !lacking.length) {
    parts.push(
      ok
        ? '오행이 비교적 고르게 퍼져 큰 편중은 없는 균형형 결이에요.'
        : 'Your elements are fairly even — a balanced make-up without a strong skew.'
    )
  }
  if (yong && EL_KO[yong]) {
    parts.push(
      ok
        ? `생활에서 ${EL_KO[yong]} 기운(${ORGAN[yong].ko.split('(')[0]})을 보태는 음식·습관·환경에 마음을 두면 균형 잡는 데 도움이 돼요.`
        : `In daily life, leaning into ${EL_EN[yong]} (${ORGAN[yong].en.split(' (')[0]}) — food, habits, environment — helps you stay in balance.`
    )
  }
  parts.push(
    ok
      ? '오행으로 본 체질 경향일 뿐 의학적 진단이 아니에요 — 몸이 불편하면 꼭 전문의와 상담하세요.'
      : 'This is a five-element tendency, not a medical diagnosis — please see a doctor for any real symptoms.'
  )

  return {
    category: ok ? '체질 경향' : 'Constitution',
    tone: lacking.length || excess ? 'tension' : 'resonant',
    left: ok ? `${EL_KO[dom[0]]} 우세` : `${EL_EN[dom[0]]} dominant`,
    right:
      yong && EL_KO[yong] ? (ok ? `보강: ${EL_KO[yong]}` : `Support: ${EL_EN[yong]}`) : undefined,
    reason: parts.join(' '),
  }
}
