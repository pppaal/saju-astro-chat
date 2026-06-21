/**
 * dayDomains — 그날(일진)의 십신 기운을 6개 생활 분야로 풀어주는 deriver (KO/EN).
 *
 * 새 점괘를 지어내지 않는다. 그날 *일진 십신*(일간 기준 그날 천간/지지의 십신)이
 * 어떤 기운인지 + 그 기운이 각 분야에 무슨 의미인지를 명리 표준 의미로 엮을 뿐.
 * 같은 토대(SIBSIN_GUIDE)와 톤을 공유한다.
 *
 * 분야: 연애 / 재물 / 직업 / 인간관계(귀인) / 공부·문서 / 건강.
 * 연애만 성별 의존(남=재성, 여=관성이 배우자성). 점수 구간(band)은 섹션 머리말
 * 한 줄로 톤을 잡고, 분야별 '오늘 켜짐(active)' 플래그로 강조한다.
 */

import { translateSignalLabel } from './signalI18n'

export type DayScoreBand = 'good' | 'mid' | 'low'

/** 십신 5분류 — 비겁/식상/재성/관성/인성. */
type SibsinCategory = 'self' | 'output' | 'wealth' | 'officer' | 'resource'

const SIBSIN_CATEGORY: Record<string, SibsinCategory> = {
  비견: 'self',
  겁재: 'self',
  식신: 'output',
  상관: 'output',
  정재: 'wealth',
  편재: 'wealth',
  정관: 'officer',
  편관: 'officer',
  정인: 'resource',
  편인: 'resource',
}

/** 그날 실제 신호 한 개를 분야 근거로 표시 — 트랜짓·신살·교차. */
export interface DomainEvidence {
  /** 표시 텍스트 (호출 시 locale 반영해서 ko/en 중 하나). */
  text: string
  polarity: number
  /** 'astro'=트랜짓 · 'saju'=신살 · 'cross'=사주×점성 교차 · 'moon'=시별 달 절정. */
  kind: 'astro' | 'saju' | 'cross' | 'moon'
  /** moon 근거일 때만 — 시각 창(괄호 제거 전 원본). 본문에 시각을 엮을 때 읽는다. */
  when?: string
  whenEn?: string
}

export interface DayDomainAdvice {
  key: string
  icon: string
  label: string
  labelEn: string
  body: string
  bodyEn: string
  /** 오늘 이 분야가 켜졌는가 — 십신이 직접 관장하거나 실제 신호가 붙으면 true. */
  active: boolean
  /** 그날 실제로 이 분야에 떨어진 신호 근거 (없으면 빈 배열 = 십신 기본 조언만). */
  evidence: DomainEvidence[]
}

export interface DayDomainsResult {
  /** 점수 구간 머리말(순풍/평이/역풍). */
  bandNote: string
  bandNoteEn: string
  domains: DayDomainAdvice[]
}

const DOMAIN_META: Array<{ key: string; icon: string; ko: string; en: string }> = [
  { key: 'love', icon: '❤️', ko: '연애', en: 'Love' },
  { key: 'money', icon: '💰', ko: '재물·돈', en: 'Money' },
  { key: 'career', icon: '💼', ko: '직업·일', en: 'Career' },
  { key: 'people', icon: '🤝', ko: '인간관계·귀인', en: 'People & allies' },
  { key: 'study', icon: '📚', ko: '공부·문서', en: 'Study & papers' },
  { key: 'health', icon: '🌿', ko: '건강', en: 'Health' },
]

// 카테고리 × 분야 → 그날 조언 (연애는 loveLine 으로 별도 처리하므로 여기선 5분야).
const ADVICE: Record<SibsinCategory, Record<string, { ko: string; en: string }>> = {
  self: {
    money: {
      ko: '내 힘으로 버는 데 집중할 날. 동업·보증·돈 빌려주기는 오늘만은 미루세요(빠져나가기 쉬움).',
      en: 'Focus on earning by your own hand. Hold off on partnerships, guarantees or lending today — money slips out easily.',
    },
    career: {
      ko: '주도적으로 밀어붙이기 좋은 날. 혼자 처리할 일에 집중하고 불필요한 충돌은 피하세요.',
      en: 'A good day to drive things yourself. Focus on solo work and avoid needless clashes.',
    },
    people: {
      ko: '친구·동료와의 자리가 늘어요. 경쟁보다 협력으로 가면 내 편이 생깁니다.',
      en: 'Time with friends and peers grows. Choose teamwork over rivalry and allies form.',
    },
    study: {
      ko: '혼자 집중하는 공부에 좋은 날. 스스로 정리하면 머리에 잘 남아요.',
      en: 'Good for solo, focused study — organizing it yourself makes it stick.',
    },
    health: {
      ko: '활력이 도는 날 — 운동·몸 쓰기 좋아요. 경쟁심에 무리하다 다치지 않게.',
      en: 'Energy runs high — great for exercise and moving your body. Just don’t push into injury.',
    },
  },
  output: {
    money: {
      ko: '아이디어가 돈이 되는 날(식상생재). 콘텐츠·영업·판매·부업에 유리해요.',
      en: 'Ideas turn into income today — favorable for content, sales and side work.',
    },
    career: {
      ko: '발표·기획·창작에 빛나는 날. 다만 윗사람 비판은 한 박자 늦추세요(말로 적 만들기 쉬움).',
      en: 'You shine in presenting, planning and creating. Hold back criticism of superiors — words make enemies today.',
    },
    people: {
      ko: '사람을 즐겁게 하는 날 — 모임·네트워킹에 유리. 말이 과하지 않게만.',
      en: 'A day that delights people — good for gatherings and networking. Just don’t overtalk.',
    },
    study: {
      ko: '글쓰기·발표·표현 공부에 좋은 날. 암기보다 직접 만들어 보면 빨라요.',
      en: 'Good for writing, presenting and expressive study — produce rather than just memorize.',
    },
    health: {
      ko: '잘 먹고 잘 쉬면 회복이 빠른 날. 과로·과음만 조심하세요.',
      en: 'Eat well and rest and you recover fast — just avoid overwork and overdrinking.',
    },
  },
  wealth: {
    money: {
      ko: '돈 기운이 켜진 날 — 거래·계약·수금·합리적 쇼핑 판단에 유리. 다만 욕심·투기는 한 박자 늦추세요.',
      en: 'Money energy is switched on — favorable for deals, contracts, collecting and smart spending. Rein in greed and speculation by a beat.',
    },
    career: {
      ko: '실적·성과로 보여주기 좋은 날. 영업·협상·결과 중심 업무에 유리해요.',
      en: 'A day to show results — favorable for sales, negotiation and outcome-driven work.',
    },
    people: {
      ko: '실리로 엮인 사람과의 자리. 먼저 베풀면 돌아오는 날이에요.',
      en: 'Time with practical connections — give first and it comes back today.',
    },
    study: {
      ko: '집중이 흩어지기 쉬운 날 — 이론보다 실전·응용 위주로 가세요.',
      en: 'Focus scatters easily — go for practice and application over theory.',
    },
    health: {
      ko: '활동량이 많아 피로가 쌓이기 쉬워요. 끼니를 거르지 말고 규칙적으로.',
      en: 'Lots of motion piles up fatigue — keep regular meals and don’t skip them.',
    },
  },
  officer: {
    career: {
      ko: '자리·인정·승진 기운이 도는 날. 책임을 맡고 규범을 지키면 점수가 올라가요.',
      en: 'Standing, recognition and promotion energy — take responsibility and keep the rules to gain points.',
    },
    money: {
      ko: '안정적 관리의 날 — 큰 투자보다 정리·납부·규칙적 운용이 맞아요.',
      en: 'A day for steady management — settling, paying and routine handling over big bets.',
    },
    people: {
      ko: '윗사람·공적 관계에 유리한 날. 예의와 약속을 지키면 신뢰가 쌓입니다.',
      en: 'Favorable for superiors and formal ties — courtesy and kept promises build trust.',
    },
    study: {
      ko: '시험·자격·규칙적 공부에 좋은 날. 계획대로 밀고 나가면 잘 됩니다.',
      en: 'Good for exams, credentials and disciplined study — stick to the plan.',
    },
    health: {
      ko: '압박·스트레스가 몸에 올 수 있는 날. 무리·사고를 조심하고 쉬는 시간을 꼭 넣으세요.',
      en: 'Pressure and stress can hit the body — avoid strain and accidents, and build in rest.',
    },
  },
  resource: {
    study: {
      ko: '공부·시험·자격에 최고의 날. 집중이 잘 되고 배운 게 오래 남아요.',
      en: 'A top day for study, exams and credentials — focus comes easily and learning lasts.',
    },
    money: {
      ko: '문서·계약·부동산 관련에 유리. 즉흥 지출보다는 신중하게 결정하세요.',
      en: 'Favorable for documents, contracts and property — decide carefully over impulse spending.',
    },
    career: {
      ko: '배움·문서·승인·후원이 들어오는 날. 기획·연구·준비에 좋아요.',
      en: 'Learning, documents, approvals and backing come in — good for planning, research and prep.',
    },
    people: {
      ko: '귀인·스승·윗사람의 도움이 오는 날 — 막히면 먼저 조언을 구해보세요.',
      en: 'Help from mentors and elders arrives — when stuck, ask for advice first.',
    },
    health: {
      ko: '휴식·회복에 좋은 날. 잠과 충전으로 몸을 채우세요.',
      en: 'Good for rest and recovery — refill with sleep and downtime.',
    },
  },
}

function isFemale(sex: string): boolean {
  return sex === '여' || /female|^f$/i.test(sex)
}
function isMale(sex: string): boolean {
  return sex === '남' || /male|^m$/i.test(sex)
}

/** 연애 분야 — 성별 의존(남=재성, 여=관성이 배우자·이성 인연). */
function loveLine(cat: SibsinCategory, sex: string, ko: boolean): string {
  const female = isFemale(sex)
  switch (cat) {
    case 'wealth':
      if (isMale(sex))
        return ko
          ? '남성에겐 이성 인연·데이트 운이 켜진 날 — 먼저 다가가도 좋아요. 다만 가벼운 끌림과 진심은 구분하세요.'
          : 'For men, romance and dating switch on — fine to make the first move, but tell a passing pull from the real thing.'
      return ko
        ? '현실 감각으로 관계를 챙기기 좋은 날. 선물·데이트 같은 실질적 표현이 잘 통해요.'
        : 'A good day to tend the relationship practically — concrete gestures like gifts or a date land well.'
    case 'officer':
      if (female)
        return ko
          ? '여성에겐 좋은 인연·배우자운이 강한 날 — 진중한 만남에 특히 유리해요.'
          : 'For women, a strong window for a good partner — especially favorable for serious connections.'
      return ko
        ? '책임감 있게 다가가면 신뢰를 얻는 날. 약속을 지키는 모습이 점수가 됩니다.'
        : 'Approach with reliability and you earn trust today — keeping your word scores points.'
    case 'output':
      return ko
        ? '매력과 표현력이 살아나는 날 — 먼저 연락·고백·데이트에 좋아요. 말이 과하지 않게만.'
        : 'Charm and expression come alive — great for reaching out, confessing or a date. Just don’t overtalk.'
    case 'self':
      return ko
        ? '주관이 강해지는 날 — 끌고 가려 하기보다 상대 말을 한 번 더 들어주면 좋아요.'
        : 'Your will runs strong — listen once more instead of steering, and it goes better.'
    case 'resource':
      return ko
        ? '깊은 대화와 정서적 교감의 날. 서두르기보다 마음을 나누면 가까워져요.'
        : 'A day of deep talk and emotional closeness — share feelings rather than rush.'
  }
}

/** 오늘 십신이 직접 켜는 분야 집합(강조용). 연애는 성별로 분기. */
function activeDomains(cat: SibsinCategory, sex: string): Set<string> {
  const s = new Set<string>()
  switch (cat) {
    case 'self':
      s.add('health').add('people')
      break
    case 'output':
      s.add('love').add('career')
      break
    case 'wealth':
      s.add('money')
      if (isMale(sex)) s.add('love')
      break
    case 'officer':
      s.add('career')
      if (isFemale(sex)) s.add('love')
      break
    case 'resource':
      s.add('study').add('people')
      break
  }
  return s
}

const BAND_NOTE: Record<DayScoreBand, { ko: string; en: string }> = {
  good: {
    ko: '오늘은 순풍 — 켜진 분야는 적극적으로 밀어붙여도 좋아요.',
    en: 'Tailwind today — push hard on the domains that are switched on.',
  },
  mid: {
    // '큰 기복 없이' 같은 단정은 강한 흉신(−3)이 깔린 날과 모순될 수 있어 피한다.
    ko: '무리한 확장만 피하면 무난한 하루 — 아래 켜진 분야 위주로.',
    en: 'Steady if you avoid overreaching — lean on the active areas below.',
  },
  low: {
    ko: '오늘은 역풍 — 큰 결정은 미루고 켜진 분야도 한 박자 천천히.',
    en: 'Headwind today — postpone big calls and take even the active domains a beat slower.',
  },
}

// ── 그날 실제 신호 → 분야 분류용 매핑 (행성·신살·교차). ─────────────────────
// 새 계산이 아니라, 이미 셀에 계산된 신호를 분야로 나눌 뿐. 사람마다 본명이
// 달라 트랜짓·신살이 다르므로 분야 근거도 1인 1결과가 된다.

// 행성 → 분야 (점성 표준 주관). day.transits.body 는 영문 행성명.
const PLANET_DOMAINS: Record<string, string[]> = {
  Venus: ['love', 'money'],
  Jupiter: ['money', 'career'],
  Saturn: ['career', 'health'], // 토성=제약·압박·만성피로·뼈 (공부는 수성/인성)
  Mercury: ['study', 'career'],
  Mars: ['health', 'career'],
  Sun: ['career', 'health'],
  Moon: ['health', 'people', 'love'], // 달=감정·대중·정서 교감
  Uranus: ['career'],
  Neptune: ['love', 'health'], // 해왕성=이상화된 연애·면역/수면 (명료한 학습과 상충)
  Pluto: ['money', 'career'],
}
const PLANET_KO_SHORT: Record<string, string> = {
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
}
// 엔진 신호의 aspectType 은 영문('trine'…)이라, KO 표시는 영문→한글로 옮긴다.
// (일부 경로는 한글일 수 있어 양방향 폴백.)
const ASPECT_EN: Record<string, string> = {
  합: 'conjunction',
  사각: 'square',
  삼각: 'trine',
  대립: 'opposition',
  섹스타일: 'sextile',
  퀸컹스: 'quincunx',
  반섹스타일: 'semisextile',
}
const ASPECT_KO: Record<string, string> = {
  conjunction: '합',
  square: '사각',
  trine: '삼각',
  opposition: '대립',
  sextile: '육각',
  quincunx: '퀸컹스',
  semisextile: '반육각',
}

// 신살 이름(부분일치) → 분야. 명리 표준 의미.
const SHINSAL_DOMAINS: Array<{ match: string; domains: string[] }> = [
  { match: '도화', domains: ['love'] },
  { match: '홍염', domains: ['love'] },
  { match: '금여', domains: ['love'] },
  { match: '역마', domains: ['career'] },
  { match: '문창', domains: ['study'] },
  { match: '학당', domains: ['study'] },
  { match: '화개', domains: ['study'] },
  { match: '귀인', domains: ['people'] }, // 천을·천덕·월덕·복성·태극귀인 등
  { match: '천덕', domains: ['people'] }, // '천덕'(단독) — '귀인' 미부착 출력 대비
  { match: '월덕', domains: ['people'] },
  { match: '태극', domains: ['people'] },
  { match: '복성', domains: ['people'] },
  { match: '양인', domains: ['health'] },
  { match: '백호', domains: ['health'] },
  { match: '괴강', domains: ['career'] },
  { match: '재고', domains: ['money'] },
]

// 교차활성 텍스트 키워드 → 분야 (사주측·점성측·뜻을 한데 스캔).
const CROSS_KEYWORDS: Array<{ keys: string[]; domain: string }> = [
  {
    keys: ['도화', '홍염', '금성', 'Venus', '연애', '배우자', '합', '삼합', '육합'],
    domain: 'love',
  },
  { keys: ['재성', '재물', '편재', '정재', '목성', 'Jupiter'], domain: 'money' },
  // '편관'은 1차 직업(七殺=권력·책임). '충'=직업변동. '직'은 오탐 줄이려 '직업/직장'으로.
  {
    keys: ['관성', '정관', '편관', '토성', 'Saturn', '태양', 'Sun', '명예', '직업', '직장', '충'],
    domain: 'career',
  },
  { keys: ['인성', '정인', '편인', '수성', 'Mercury', '문서', '문창'], domain: 'study' },
  // 합=협력/인연, 충=관계균열, 형=마찰 — 모두 사람 축에도 작용.
  { keys: ['귀인', '비견', '겁재', '합', '충', '형', 'Moon'], domain: 'people' },
  // 형=수술·사고, 화성=다툼·열 — 건강. ('편관'은 직업으로 일원화, '충'은 직업/관계로 이동.)
  { keys: ['화성', 'Mars', '형'], domain: 'health' },
]
function crossDomains(hay: string): string[] {
  const out = new Set<string>()
  for (const rule of CROSS_KEYWORDS) {
    if (rule.keys.some((k) => hay.includes(k))) out.add(rule.domain)
  }
  return [...out]
}

export interface DayEvidenceInput {
  transits: Array<{ body?: string; aspect?: string; polarity: number }>
  shinsal: string[]
  crossActivations: Array<{
    sajuSide: string
    astroSide: string
    /** 분야 라우팅용 KO 텍스트(로케일 무관). 없으면 sajuSide/astroSide 로 폴백. */
    route?: string
    meaning?: string
    polarity: number
  }>
  /** 시(時)별 달 절정 — 본명 점(body)으로 분야 라우팅 + 시각 칩. */
  moon?: Array<{
    body: string // 'Venus'·'Sun'·'Ascendant'…
    aspectKo: string
    aspectEn: string
    when: string // '13-15시 (미시)'
    whenEn: string
    polarity: number
  }>
}

// 달이 건드린 본명 점 → 분야 (행성은 PLANET_DOMAINS 재사용 + 앵글 보강).
const MOON_POINT_DOMAINS: Record<string, string[]> = {
  ...{
    Venus: ['love', 'money'],
    Jupiter: ['money', 'career'],
    Saturn: ['career', 'health'],
    Mercury: ['study', 'career'],
    Mars: ['health', 'career'],
    Sun: ['career', 'health'],
    Moon: ['health', 'people', 'love'],
    Uranus: ['career'],
    Neptune: ['love', 'health'],
    Pluto: ['money', 'career'],
  },
  Ascendant: ['health'],
  MC: ['career'],
}

/** 그날 실제 신호를 분야별 근거로 분류 (locale 반영 텍스트). */
function classifyEvidence(input: DayEvidenceInput, ko: boolean): Record<string, DomainEvidence[]> {
  const out: Record<string, DomainEvidence[]> = {
    love: [],
    money: [],
    career: [],
    people: [],
    study: [],
    health: [],
  }
  // 트랜짓 (점성)
  for (const t of input.transits) {
    const body = t.body ?? ''
    const doms = PLANET_DOMAINS[body]
    if (!doms) continue
    const aspect = t.aspect ?? ''
    const text = ko
      ? `${PLANET_KO_SHORT[body] ?? body} ${ASPECT_KO[aspect] ?? aspect}`.trim()
      : `${body} ${ASPECT_EN[aspect] ?? aspect}`.trim()
    for (const d of doms) out[d].push({ text, polarity: t.polarity, kind: 'astro' })
  }
  // 신살 (사주) — EN 로케일에선 신살명을 영문으로(원문 한글 누출 방지).
  for (const s of input.shinsal) {
    const label = ko ? s : translateSignalLabel(s, 'en')
    for (const rule of SHINSAL_DOMAINS) {
      if (s.includes(rule.match)) {
        for (const d of rule.domains) out[d].push({ text: label, polarity: 0, kind: 'saju' })
      }
    }
  }
  // 사주 × 점성 교차
  for (const c of input.crossActivations) {
    // 라우팅은 KO route 로(로케일 무관) — EN 표시일 때도 분야 분류가 동일해야
    // 같은 차트가 KO/EN 에서 정반대 톤이 되는 버그가 안 난다.
    const doms = crossDomains(c.route ?? `${c.sajuSide} ${c.astroSide} ${c.meaning ?? ''}`)
    const text = `${c.sajuSide} ↔ ${c.astroSide}`
    for (const d of doms) out[d].push({ text, polarity: c.polarity, kind: 'cross' })
  }
  // 시(時)별 달 절정 — 달이 건드린 본명 점으로 분야 라우팅, 칩에 시각 포함.
  for (const mn of input.moon ?? []) {
    const doms = MOON_POINT_DOMAINS[mn.body]
    if (!doms) continue
    const short = (ko ? mn.when : mn.whenEn).replace(/\s*\(.*\)/, '').trim()
    const text = ko ? `${short} 달${mn.aspectKo}` : `${short} Moon ${mn.aspectEn}`
    for (const d of doms)
      out[d].push({ text, polarity: mn.polarity, kind: 'moon', when: mn.when, whenEn: mn.whenEn })
  }
  // 분야별 중복 제거 + |polarity| 높은 순 4개(시각 달 칩 자리 확보).
  // astro 칩은 *행성* 기준으로 묶는다 — 같은 행성이 여러 각(수성 사각·육각·삼각)
  // 으로 동시에 잡히면 한 행성당 가장 센 한 칩만 남겨 중복·기하 모순을 없앤다.
  const dedupKey = (e: DomainEvidence) =>
    e.kind === 'astro' ? `astro:${e.text.split(' ')[0]}` : `${e.kind}:${e.text}`
  for (const d of Object.keys(out)) {
    const seen = new Set<string>()
    const sorted = out[d]
      .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))
      .filter((e) => {
        const k = dedupKey(e)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    const capped = sorted.slice(0, 4)
    // 시별 달(moon) 칩은 |polarity| 가 낮아 4개 컷에 잘 밀려난다. 본문 시각 클로즈
    // + 🌙 칩이 사라지지 않게, 4개 안에 moon 이 없으면 가장 센 moon 한 개를 보장.
    if (!capped.some((e) => e.kind === 'moon')) {
      const moon = sorted.find((e) => e.kind === 'moon')
      if (moon) {
        if (capped.length >= 4) capped[3] = moon
        else capped.push(moon)
      }
    }
    out[d] = capped
  }
  return out
}

// 분야별 '주의' 본문 — 그날 그 분야의 근거가 뚜렷이 부정적일 때(합 ≤ -2) 긍정
// 십신 조언을 대신한다. 칩(긴장 신호)과 톤을 맞춰 모순을 없애는 용도.
const CAUTION_BODY: Record<string, { ko: string; en: string }> = {
  love: {
    ko: '연애·관계에 거스르는 기운이 도는 날 — 서운한 말이나 즉흥 고백은 미루세요.',
    en: 'Relationships hit friction today — hold off on touchy talks or impulsive confessions.',
  },
  money: {
    ko: '돈 흐름이 거슬리는 날 — 큰 지출·투자·보증은 미루고 지키기에 집중하세요.',
    en: 'Money runs rough today — postpone big spends, investments and guarantees; play defense.',
  },
  career: {
    ko: '일에 마찰이 끼는 날 — 새로 벌이거나 부딪치기보다 마무리·점검 위주로.',
    en: 'Work hits friction today — wrap up and review rather than start new or clash.',
  },
  people: {
    ko: '사람 사이가 삐걱대는 날 — 예민한 자리·논쟁은 피하고 한 걸음 물러서세요.',
    en: 'Ties feel scratchy today — avoid charged settings and step back a little.',
  },
  study: {
    ko: '집중이 흐트러지는 날 — 새 분량보다 복습·정리 위주로 가볍게 가세요.',
    en: 'Focus scatters today — review and tidy rather than take on new material.',
  },
  health: {
    ko: '몸에 무리가 오기 쉬운 날 — 과로·과격한 운동·사고를 조심하고 쉬어가세요.',
    en: 'The body strains easily today — avoid overwork, hard workouts and accidents; rest.',
  },
}

// 분야별 band-aware 한 줄 — 섹션 머리말(BAND_NOTE)과 *다른* 짧은 문장으로,
// 그 분야에 한정해 톤만 잡는다. 'caution' 은 polaritySum ≤ -2(주의 본문) 가지로,
// 순풍이라도 "밀어붙이라"고 말하지 않게 톤을 누른다(칩과 모순 방지).
const BAND_DOMAIN_CLAUSE: Record<DayScoreBand | 'caution', { ko: string; en: string }> = {
  good: {
    ko: ' 흐름이 받쳐주니 한 발 더 내디뎌도 좋아요.',
    en: ' The flow is behind you, so it’s fine to lean in a step further.',
  },
  mid: {
    ko: ' 욕심만 내려놓으면 꾸준히 가기 좋은 결입니다.',
    en: ' Set greed aside and it’s a fine groove to keep steady in.',
  },
  low: {
    ko: ' 결이 거세니 무리하지 말고 한 박자 천천히 가세요.',
    en: ' The grain runs rough, so don’t force it — go a beat slower.',
  },
  caution: {
    ko: ' 오늘은 벌이기보다 지키고 추스르는 쪽이 낫습니다.',
    en: ' Today leans toward holding steady and regrouping rather than pushing.',
  },
}

/**
 * 분야별 band-aware 한 줄. 주의 본문 가지(caution)면 band 무관하게 누른 톤을 쓴다.
 * 머리말과 겹치지 않게 짧고 분야 한정으로.
 */
function bandDomainClause(band: DayScoreBand, caution: boolean, ko: boolean): string {
  const c = caution ? BAND_DOMAIN_CLAUSE.caution : BAND_DOMAIN_CLAUSE[band]
  return ko ? c.ko : c.en
}

/**
 * 그 분야의 *가장 센 실제 신호*(|polarity| 최대, moon 제외 — moon 은 moonTimeClause 가
 * 따로 시각으로 엮음)를 산문 한 줄로 엮는다. 동적 텍스트(예: '편재 ↔ 금성', '천을귀인',
 * '토성 사각')에 한국어 주격/목적격 조사(이/가·을/를·은/는)를 직접 붙이면 비문이 되므로,
 * em-dash·콜론·쉼표 구조로만 잇는다. 방향(부호)에 따라 동사를 고른다.
 */
function strongSignalClause(ev: DomainEvidence[], ko: boolean): string {
  let best: DomainEvidence | null = null
  for (const e of ev) {
    if (e.kind === 'moon') continue
    if (e.polarity === 0) continue // 신살(중립 polarity 0)은 방향이 없어 산문화 보류
    if (!best || Math.abs(e.polarity) > Math.abs(best.polarity)) best = e
  }
  if (!best) return ''
  const text = best.text.trim()
  if (!text) return ''
  if (best.polarity > 0) {
    // 동적 텍스트 뒤에 조사 없이 em-dash 로 이어 받침 유무와 무관하게 자연스럽게.
    return ko
      ? ` 오늘은 ${text} — 이 분야를 밀어주는 신호예요.`
      : ` Today, ${text} is the signal pushing this area forward.`
  }
  return ko
    ? ` 다만 ${text} — 이 분야에 마찰을 더하니 살펴보세요.`
    : ` That said, ${text} adds friction here, so keep an eye on it.`
}

/**
 * 분야 근거 중 시별 달(moon) 신호가 있으면, 가장 센(|polarity| 최대) 달의 시각을
 * 본문에 한 줄로 엮는다. 시각 창만 남기고 "달…" 꼬리는 떼어 시간만 보이게 한다.
 * (예: "21-23시 달삼각" → "21-23시"). 차트별 신호가 달라 1인 1결과로 일반화된다.
 */
function moonTimeClause(ev: DomainEvidence[], ko: boolean): string {
  let best: DomainEvidence | null = null
  for (const e of ev) {
    if (e.kind !== 'moon') continue
    if (!best || Math.abs(e.polarity) > Math.abs(best.polarity)) best = e
  }
  if (!best) return ''
  const raw = (ko ? best.when : best.whenEn) ?? best.text
  const time = raw.replace(/\s*\(.*\)/, '').trim()
  if (!time) return ''
  if (best.polarity >= 0) {
    return ko ? ` 특히 ${time}에 흐름이 살아나요.` : ` Especially ${time} the flow picks up.`
  }
  return ko ? ` ${time}엔 한 박자 늦추세요.` : ` Around ${time}, ease off a beat.`
}

export function deriveDayDomains(args: {
  iljinSibsin: string
  sex: string
  scoreBand: DayScoreBand
  /** 그날 실제 신호 — 주면 분야별 근거가 붙고, 없으면 십신 기본 조언만. */
  evidence?: DayEvidenceInput
  /** evidence 텍스트 locale (기본 ko). */
  ko?: boolean
}): DayDomainsResult | null {
  const cat = SIBSIN_CATEGORY[args.iljinSibsin]
  if (!cat) return null
  const activeDomainSet = activeDomains(cat, args.sex)
  const evidenceByDomain = args.evidence ? classifyEvidence(args.evidence, args.ko !== false) : null
  const domains: DayDomainAdvice[] = DOMAIN_META.map((d) => {
    const ev = evidenceByDomain?.[d.key] ?? []
    // 근거 극성 합 — 톤·배지를 그날 *그 분야의 실제 신호*에 맞춘다. 같은 일진이라도
    // 본명이 다르면 분야별 신호(트랜짓)가 달라 결과가 사람마다 갈린다(개인화).
    const polaritySum = ev.reduce((s, e) => s + e.polarity, 0)
    // 본문: 근거가 뚜렷이 부정적(합 ≤ -2)이면 긍정 십신 조언 대신 '주의' 본문으로
    // 바꿔, 칩(긴장 신호)과 글의 톤이 어긋나지 않게 한다(모순 제거).
    const caution = polaritySum <= -2
    let body: string
    let bodyEn: string
    if (caution) {
      body = CAUTION_BODY[d.key].ko
      bodyEn = CAUTION_BODY[d.key].en
    } else {
      body = d.key === 'love' ? loveLine(cat, args.sex, true) : ADVICE[cat][d.key].ko
      bodyEn = d.key === 'love' ? loveLine(cat, args.sex, false) : ADVICE[cat][d.key].en
    }
    // (2) band-aware 한 줄 — 점수 구간에 맞춰 톤을 잡는다. 주의(caution) 가지면
    // 순풍이라도 "밀어붙이라" 대신 누른 톤을 써 칩과 모순이 안 나게 한다.
    body += bandDomainClause(args.scoreBand, caution, true)
    bodyEn += bandDomainClause(args.scoreBand, caution, false)
    // (3) 그 분야의 가장 센 실제 신호를 산문 한 줄로 — 조사 없이 em-dash 로 이어
    // 동적 텍스트의 한국어 받침 문제를 피한다(particle-safe).
    body += strongSignalClause(ev, true)
    bodyEn += strongSignalClause(ev, false)
    // 시별 달 근거가 있으면 실제 절정 시각을 본문에 엮어 더 구체적으로(KO/EN).
    const koClause = moonTimeClause(ev, true)
    const enClause = moonTimeClause(ev, false)
    if (koClause) body += koClause
    if (enClause) bodyEn += enClause
    // '주목' 배지 = 그날 *십신이 관장하는* 분야(=오늘의 테마) 1~2개만 — 단,
    // 근거가 net-negative 면(긴장 분야) 배지를 달지 않는다(긍정 강조와 모순 방지).
    // 트랜짓은 매일 거의 모든 분야에 깔려 배지로 쓰면 다 켜져버리므로, 실제
    // 신호는 배지 대신 분야별 '근거' 칩으로 보여준다(분리).
    const active = activeDomainSet.has(d.key) && (ev.length === 0 || polaritySum >= 0)
    return {
      key: d.key,
      icon: d.icon,
      label: d.ko,
      labelEn: d.en,
      body,
      bodyEn,
      active,
      evidence: ev,
    }
  })
  return {
    bandNote: BAND_NOTE[args.scoreBand].ko,
    bandNoteEn: BAND_NOTE[args.scoreBand].en,
    domains,
  }
}
