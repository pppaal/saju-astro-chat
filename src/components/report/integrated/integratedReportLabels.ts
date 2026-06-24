/**
 * 통합 리포트 i18n 라벨/룩업 — UI 문자열 사전, 관계·톤·오행·십신·12운성·노스노드·
 * 어스펙트·디그니티 라벨과 hover 설명 헬퍼. JSX 없는 순수 데이터/함수만 모아
 * IntegratedReport(렌더)와 분리한다. 단일 소스라 차트·메인이 같은 라벨을 공유한다.
 */

import { type BiLabel, ELEMENTS, STEM_INFO, BRANCH_INFO, SIGN_META, SIGN_ABBR } from './reportTypes'
import {
  getPlanetCore,
  getHouseRich,
  getAspectMeaning,
  getAstroDignity,
  getHanjaRich,
  type HouseNumber,
  type DignityStatus,
} from '@/lib/chart-dictionary'
import { getSibsinInterpretation, getTwelveStageInterpretation } from '@/lib/saju/interpretations'
import { SIBSIN_SHORT } from '../atoms/interpretations'
import s from './IntegratedReport.module.css'

export type Lang = 'ko' | 'en'

export interface CrossRow {
  category: string
  tone: 'resonant' | 'complement' | 'tension' | 'neutral'
  reason: string
  left?: string
  right?: string
  /** 공망/카르마(결핍 축) — resonant 톤이라도 '잘 맞아요' 집계에서 제외하기 위한 표식. */
  karmaAxis?: boolean
}

export const UI: Record<string, BiLabel> = {
  eyebrow: { ko: '동양 사주 + 서양 별자리', en: 'Saju + Astrology' },
  titlePre: { ko: '통합', en: 'Your' },
  titleAccent: { ko: '리포트', en: 'Report' },
  titlePost: { ko: '', en: '' },
  subtitle: {
    ko: '사주와 별자리를 한 화면에서 함께 봐요',
    en: 'Your Saju and birth chart, read together on one page',
  },
  male: { ko: '남', en: 'M' },
  female: { ko: '여', en: 'F' },
  metaBirth: { ko: '출생', en: 'Birth' },
  metaPlace: { ko: '장소', en: 'Place' },
  metaCoord: { ko: '위치 좌표', en: 'Coordinates' },
  metaTz: { ko: '시간대', en: 'Time zone' },
  metaHouse: { ko: '삶의 영역(하우스)', en: 'Life areas (houses)' },
  // 메타 그리드 아래 안내 — 숫자·전문어가 겁주지 않게 "외울 필요 없다"고 한 줄.
  metaNote: {
    ko: '↑ 별자리를 정확히 계산하려고 출생지를 위치 값으로 바꾼 거예요. 외울 필요 없어요.',
    en: '↑ We turned your birthplace into precise values so the star math is exact — nothing to memorize.',
  },
  // 리포트 도입 오리엔테이션 — "이게 뭐고, 어떻게 읽는지" 항상 보이게.
  howToReadTitle: { ko: '이 리포트, 이렇게 읽어요', en: 'How to read this report' },
  howToReadBody: {
    ko: '같은 당신을 동양 사주와 서양 별자리로 따로 본 뒤 겹쳐 봐요. 둘이 같은 얘길 하면 그만큼 또렷하고 단단한 특징이에요. 어려운 말이 나오면 바로 아래 "❓ 쉽게 풀이"를 펼쳐 보세요. 하나도 몰라도 괜찮아요.',
    en: 'We read the same you twice — once with Eastern Saju, once with Western astrology — then lay them side by side. Where both agree, that trait is especially strong. Whenever a strange word shows up, open the "❓ In plain words" box right below it. No prior knowledge needed.',
  },
  howToReadJourney: {
    ko: '읽는 순서: ① 타고난 나 → ② 기운 균형 → ③ 태어난 하늘 → ④ 기운들의 대화 → ⑤ 동·서양이 똑같이 말하는 부분',
    en: 'Your path: ① Who you are → ② Energy balance → ③ Your birth sky → ④ How your forces talk → ⑤ Where both systems agree',
  },
  // 섹션 챕터 오프너 — 헤딩 아래 따뜻한 한 문장(이야기책처럼 다음 장으로 끌어당김).
  sec01Lead: {
    ko: '이제 너라는 사람의 첫 페이지를 펼쳐볼 거예요. 타고날 때부터 마음속에 담겨 있던 너만의 색깔을 함께 살펴봐요.',
    en: "Let's turn to the very first page of you, and discover the special colors you've carried inside since the day you were born.",
  },
  sec02Lead: {
    ko: '누구나 마음속엔 여러 가지 기운이 살고 있어요. 너에겐 어떤 기운이 가득하고 어떤 기운이 살짝 부족한지, 가만히 들여다봐요.',
    en: "Everyone has different kinds of energy living inside them, so let's peek at which ones fill you up and which ones are a little shy in you.",
  },
  sec03Lead: {
    ko: '네가 태어나던 날, 하늘은 너를 어떻게 바라보고 있었을까요? 별들이 들려주는 너의 이야기를 들어봐요.',
    en: "On the day you were born, how was the sky watching over you? Let's listen to the story the stars tell about you.",
  },
  sec04Lead: {
    ko: '네 안의 여러 기운들은 서로 손을 잡기도 하고 가끔 티격태격하기도 해요. 그 친구들이 어떻게 어울려 지내는지 살펴봐요.',
    en: "The different forces inside you sometimes hold hands and sometimes bump heads, so let's see how they all get along together.",
  },
  sec05Lead: {
    ko: '동양의 사주와 서양의 별자리가 똑같이 고개를 끄덕이는 부분이 있어요. 두 이야기가 한목소리로 말하는 너의 진짜 모습을 만나봐요.',
    en: "There are places where the Eastern and Western stories nod in agreement, so let's meet the real you that both tell in one voice.",
  },
  // §01 도입 — 네 줄을 "태어난 순간 카드" 이야기로 묶어 주는 문장.
  plainPillarsLead: {
    ko: '아래 네 줄은 당신이 태어난 순간을 찍은 네 장의 카드예요 — 시(時)·일(日)·월(月)·년(年). 가운데 일(日) 줄이 바로 "나 자신"이고, 각 줄의 글자는 그 카드가 맡은 삶의 역할이에요.',
    en: 'The four rows below are four cards snapped at the moment you were born — Hour, Day, Month, and Year. The Day row is "you," and the words in each row are the life-roles that card carries.',
  },
  // §01 신살/합충 도입 — 칩이 나오기 전에 무엇인지 한 줄로.
  shinsalLead: {
    ko: '내 재능에 색을 입히는 숨은 별빛이에요. 옆의 작은 글자(年·月·日·時)는 그 별이 어느 생일 카드에 앉아 있는지 알려줘요.',
    en: 'Hidden star-powers that color your talents — the little mark (Yr·Mo·Day·Hr) tells you which birth-card each one sits on.',
  },
  relationsLead: {
    ko: '내 생일 글자들이 서로 손을 잡거나(합) 부딪히는(충) 방식이에요.',
    en: 'How your birth-letters team up or bump into each other.',
  },
  timeUnknownTitle: {
    ko: '결과는 그대로 또렷해요 (태어난 시각만 몰라요)',
    en: "Your result is still clear (we just don't know your birth time)",
  },
  timeUnknownBody: {
    ko: '태어난 시각을 몰라서 낮 12시를 기준으로 계산했는데, 이건 전혀 문제가 아니에요. "내가 어떤 사람인지"를 보여주는 큰 그림과 사주·별자리 풀이는 그대로 정확하고, 첫인상이나 분야별 강조처럼 아주 작은 부분만 살짝 흐릿할 뿐이에요.',
    en: "We didn't know your birth time, so we used noon — and that's totally fine. The big picture of who you are, your Saju, and your star placements are all still accurate; only a few small things like your first impression or which life-areas stand out are a little fuzzy.",
  },
  day: { ko: '주간', en: 'diurnal' },
  night: { ko: '야간', en: 'nocturnal' },
  pHour: { ko: '시', en: 'Hr' },
  pDay: { ko: '일', en: 'Day' },
  pMonth: { ko: '월', en: 'Mo' },
  pYear: { ko: '년', en: 'Yr' },
  dayBranchLabel: { ko: '일간 (나)', en: 'Day Master' },
  shinsalCap: { ko: '타고난 색깔 (신살)', en: 'Your innate colors (symbolic stars)' },
  relCap: { ko: '글자끼리의 작용', en: 'How the characters interact' },
  iljuCap: { ko: '태어난 날이 말해 주는 나의 유형', en: 'Your day-born type' },
  sec02Title: { ko: '기운 균형', en: 'Energy balance' },
  sec02Han: { ko: '', en: '' },
  elemDist: {
    ko: '오행 분포 — 다섯 기운이 각각 몇 개인지 (꼭짓점이 멀수록 많아요)',
    en: 'Element spread — how many of each energy you have (farther point = more)',
  },
  strongWeak: { ko: '내 힘의 세기', en: 'Your strength level' },
  dayMasterLab: { ko: '나', en: 'You' },
  strong: { ko: '힘이 센 편', en: 'Strong' },
  weak: { ko: '힘이 여린 편', en: 'Weak' },
  balanced: { ko: '균형', en: 'Balanced' },
  rootedYes: { ko: '뿌리 ✓', en: 'Rooted ✓' },
  rootedNo: { ko: '뿌리 ✗', en: 'Rooted ✗' },
  rootedYesTip: {
    ko: '통근 — 일간의 오행이 지지 속 지장간에 뿌리내려 있어요. 일간의 힘을 받쳐 줘요.',
    en: 'Rooted — the Day Master element is lodged in the hidden stems, reinforcing its strength.',
  },
  rootedNoTip: {
    ko: '무근 — 일간의 오행이 지지에 뿌리내리지 못했어요. 그만큼 힘이 약해지는 요인이에요.',
    en: 'Unrooted — the Day Master element is not lodged in the branches, weakening its strength.',
  },
  gongmangLab: { ko: '빈 자리(공망)', en: 'Void (empty) seat' },
  gongmangTip: {
    ko: '빈 자리(공망) — 내 사주에서 비어 있는 두 글자예요. 그 자리의 기운은 힘이 잘 안 실려요.',
    en: 'Empty seats (Void) — two slots that come up empty in your chart; their energy does not carry much weight.',
  },
  johuLab: { ko: '계절 온도', en: 'Climate' },
  johuTip: {
    ko: '계절 온도 — 태어난 사주가 너무 춥거나 더운지 보고, 따뜻함·시원함으로 균형을 맞춰 주는 기운이에요. ⚡는 그게 급하다는 뜻. 필요도',
    en: 'Climate balance — checks if your chart runs too cold or too hot, and which warmth or cooling rebalances it. ⚡ means it is urgent. Priority',
  },
  yongLab: { ko: '채우면 좋아요', en: 'Add this' },
  giLab: { ko: '부담돼요', en: 'Burdens you' },
  yongTitle: {
    ko: '필요한 기운 — 채우면 좋은 것 · 도와주는 것 · 부담되는 것',
    en: 'Your key elements — what to add, what helps, what burdens you',
  },
  geokgukCap: { ko: '나의 큰 틀 (격국)', en: 'Your overall chart type' },
  geokPersonality: { ko: '성향', en: 'Personality' },
  geokStrength: { ko: '강점', en: 'Strengths' },
  geokWeakness: { ko: '약점', en: 'Watch-outs' },
  geokCareer: { ko: '직업', en: 'Careers' },
  geokLove: { ko: '연애', en: 'Love' },
  geokAdvice: { ko: '조언', en: 'Advice' },
  sibsinCap: { ko: '나를 이끄는 성향 (주도 십성)', en: 'Your leading drive (Ten God)' },
  sec03Title: { ko: '출생 천궁도', en: 'Natal Chart' },
  sec03Han: { ko: '', en: '' },
  planetsCap: { ko: '행성 위치', en: 'Planet positions' },
  sectLab: { ko: '낮/밤 차트', en: 'Day or night' },
  houseLab: { ko: '하우스 계산법', en: 'House method' },
  sectDay: { ko: '주간 (낮 태생)', en: 'Day chart' },
  sectNight: { ko: '야간 (밤 태생)', en: 'Night chart' },
  signSuffix: { ko: '자리', en: '' },
  sec04Title: { ko: '어스펙트', en: 'Aspects' },
  sec04Han: { ko: '', en: '' },
  legSoft: { ko: '잘 흘러요·도와줘요', en: 'Flows · helps' },
  legHard: { ko: '부딪혀요·맞서요', en: 'Clashes · opposes' },
  legNeutral: { ko: '같이 있어요', en: 'Working together' },
  dignityCap: { ko: '행성 컨디션 (자리 궁합)', en: 'Planet condition' },
  noDignity: {
    ko: '뚜렷한 위계 없음 — 행성이 모두 중립 자리예요.',
    en: 'No notable dignity — every planet sits in a neutral (peregrine) position.',
  },
  sec05Title: { ko: '통합 교차', en: 'Cross-System' },
  sec05Han: { ko: '', en: '' },
  synthLabel: { ko: '🧬 종합 정체성', en: '🧬 Synthesis' },
  sajuSide: { ko: '사주가 보는 결', en: 'Your Saju side' },
  astroSide: { ko: '점성이 보는 결', en: 'Your astrology side' },
  footBrain: {
    ko: '동·서양 통합 분석 엔진',
    en: 'East–West integrated analysis',
  },
  orb: { ko: '오차', en: 'orb' },
  // '더보기'(접기) 요약 라벨 — 전문(Level 2) 자료를 한 탭 뒤로 숨길 때.
  l2Pillars: {
    ko: '자세히 보기 — 한자 · 숨은 기운 · 생애 단계',
    en: 'See details — characters, hidden energies, life stages',
  },
  l2Sub: {
    ko: '자세히 보기 — 뿌리 · 빈 자리 · 온도',
    en: 'See details — rooting, empty seats, temperature',
  },
  l2Planets: { ko: '자세히 보기 — 행성 위치표', en: 'See details — planet positions' },
  l2Aspects: { ko: '자세히 보기 — 기운들의 관계', en: 'See details — how forces interact' },
  l2Dignity: { ko: '자세히 보기 — 행성 컨디션', en: 'See details — planet condition' },
  retroLegend: {
    ko: '역행 — 그 행성의 힘이 밖으로 내뻗기보다 안으로·되짚는 쪽으로 작동해요.',
    en: 'retrograde — that planet works inward and in review rather than pushing outward.',
  },
}

// 관계 kind → 이중언어 라벨. EN 한글 누수 차단.
const RELATION_TYPE_LABEL: Record<string, BiLabel> = {
  천간합: { ko: '위 글자끼리 손잡음', en: 'Stem Combine' },
  천간충: { ko: '위 글자끼리 부딪힘', en: 'Stem Clash' },
  지지육합: { ko: '아래 글자 둘이 짝', en: 'Six Harmony' },
  지지삼합: { ko: '아래 글자 셋이 한 팀', en: 'Triple Harmony' },
  지지방합: { ko: '같은 계절끼리 뭉침', en: 'Directional Harmony' },
  지지충: { ko: '아래 글자끼리 정면충돌', en: 'Branch Clash' },
  지지형: { ko: '서로 깎고 긁힘', en: 'Punishment' },
  지지파: { ko: '깨고 흩뜨림', en: 'Destruction' },
  지지해: { ko: '은근히 해침', en: 'Harm' },
  원진: { ko: '미묘하게 거슬림', en: 'Resentment' },
  공망: { ko: '비어 힘 안 실림', en: 'Void' },
}
export const relationTypeLabel = (kind: string, lang: Lang): string =>
  RELATION_TYPE_LABEL[kind]?.[lang] ?? kind

// 별자리 12궁 → 쉬운 말 결(원소·양식의 성격 요약). 행성이 그 사인의 '옷'을 입는다.
// SIGN_META 키(3자 약어)와 동일 키. 점성 해석을 위해 사인의 색을 한 마디로.
export const SIGN_TRAIT: Record<string, BiLabel> = {
  Ari: { ko: '거침없이 부딪쳐 길을 내는', en: 'bold and pioneering' },
  Tau: { ko: '느긋하고 끈기 있게 쌓는', en: 'steady and grounded' },
  Gem: { ko: '호기심 많고 재빠르게 오가는', en: 'curious and quick-witted' },
  Can: { ko: '정 많고 품어 보살피는', en: 'tender and protective' },
  Leo: { ko: '당당하고 환하게 빛나는', en: 'proud and radiant' },
  Vir: { ko: '꼼꼼하고 실속을 챙기는', en: 'precise and practical' },
  Lib: { ko: '조화를 맞추고 어울리는', en: 'balanced and relational' },
  Sco: { ko: '깊고 강렬하게 파고드는', en: 'deep and intense' },
  Sag: { ko: '자유롭게 멀리 뻗는', en: 'free and far-reaching' },
  Cap: { ko: '현실적으로 끝까지 성취하는', en: 'disciplined and ambitious' },
  Aqu: { ko: '독창적이고 틀을 깨는', en: 'original and unconventional' },
  Pis: { ko: '섬세하고 상상력 넘치는', en: 'sensitive and imaginative' },
}

// 교차 tone → 라벨 (이중언어). "사주·점성 두 시스템이 같은/다른 얘길 하는가" 관점.
export const TONE_LABEL: Record<CrossRow['tone'], BiLabel> = {
  resonant: { ko: '둘 다 같은 얘길 해요', en: 'Both say the same' },
  complement: { ko: '다르지만 서로 도와요', en: 'Different but supportive' },
  tension: { ko: '서로 다른 두 결', en: 'Two pulls in you' },
  neutral: { ko: '서로 상관없어요', en: 'Unrelated' },
}

// ── helpers ────────────────────────────────────────────────────────────
export const elClass: Record<string, string> = {
  wood: s.elWood,
  fire: s.elFire,
  earth: s.elEarth,
  metal: s.elMetal,
  water: s.elWater,
}
export const stemEl = (g: string) => STEM_INFO[g]?.el ?? ''
export const branchEl = (b: string) => BRANCH_INFO[b]?.el ?? ''
export const abbr = (sign: string) => SIGN_ABBR[sign] ?? sign

export function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)]
}

// 교차 tone → 테마카드 색.
export const TONE_COLOR: Record<CrossRow['tone'], string> = {
  resonant: 'var(--el-wood)',
  complement: 'var(--gold)',
  tension: 'var(--el-fire)',
  neutral: 'var(--ink-3)',
}

// EN 표시용 라벨 헬퍼 — 사주 용어는 ko 한글, en 은 사전 룩업으로 영문화.
// 십성(정인…) → name_en, 12운성(쇠…) → name_en, 오행 → ELEMENTS ko/영문 키.
export const sibsinLabel = (name: string, lang: Lang): string => {
  if (lang === 'ko') return name
  if (!name || name === '日干') return name === '日干' ? 'Day Master' : name
  return getSibsinInterpretation(name as never)?.name_en ?? name
}
// 십신 → 평이 한줄 글로스 (SIBSIN_SHORT 재사용). 명식 '쉬운 풀이' 행에 사용.
export const sibsinShort = (name: string, lang: Lang): string => {
  if (!name || name === '日干') return ''
  return lang === 'ko' ? (SIBSIN_SHORT[name] ?? name) : sibsinLabel(name, 'en')
}
// 십이운성 동의어 정규화: 임관=건록, 왕지=제왕, 양생=장생.
// interpretations.json 은 건록/제왕/장생만 키로 가지므로, 엔진이 동의어 이름을
// 내보내면 EN name_en 조회가 실패해 한글이 그대로 누출된다(임관 등). 라벨·툴팁
// 양쪽에서 같은 표를 써 canonical 이름으로 정규화한다.
const STAGE_SYN: Record<string, string> = { 임관: '건록', 왕지: '제왕', 양생: '장생' }
export const stageLabel = (stage: string, lang: Lang): string => {
  if (!stage) return stage
  const norm = STAGE_SYN[stage] ?? stage
  if (lang === 'ko') return norm
  return getTwelveStageInterpretation(norm as never)?.name_en ?? norm
}

// ── 차트 인자 hover 해석 (양언어) — 글자/도수만 뜨던 차트 요소에 의미 툴팁 ──
const NODE_CORE_KEY: Record<string, string> = {
  'True Node': 'NorthNode',
  'Mean Node': 'NorthNode',
  'North Node': 'NorthNode',
}
export function planetHover(name: string, lang: Lang, isMinor = false): string {
  const c = getPlanetCore(NODE_CORE_KEY[name] ?? name, lang, isMinor)
  if (!c) return ''
  return c.keywords?.length ? `${c.principle} · ${c.keywords.slice(0, 4).join(', ')}` : c.principle
}
export function houseHover(n: number, lang: Lang): string {
  const h = getHouseRich(n as HouseNumber, lang)
  return h ? `${h.name} · ${h.domain}` : ''
}
const ASPECT_DICT_KEY: Record<string, string> = {
  conjunction: 'Conjunction',
  sextile: 'Sextile',
  square: 'Square',
  trine: 'Trine',
  opposition: 'Opposition',
  quincunx: 'Quincunx',
  semisextile: 'Semi-sextile',
  'semi-sextile': 'Semi-sextile',
  semisquare: 'Semi-square',
  sesquiquadrate: 'Sesquiquadrate',
  quintile: 'Quintile',
  biquintile: 'Bi-quintile',
}
export function aspectHover(type: string, lang: Lang): string {
  const a = getAspectMeaning(ASPECT_DICT_KEY[String(type).toLowerCase()] ?? '', lang)
  return a ? `${a.label} — ${a.meaning}` : ''
}
export function hanjaHover(ch: string, lang: Lang): string {
  const h = getHanjaRich(ch, lang) as { name?: string; element?: string; nature?: string } | null
  if (!h) return ''
  return h.nature ? `${h.name} · ${h.element} · ${h.nature}` : (h.name ?? '')
}
/**
 * 한자 글리프 옆에 인라인으로 보여줄 "음(소리)" 하나. 모바일엔 hover(title) 가 없어
 * 명식 한자가 음·뜻 없이 암호처럼 보이던 문제(검수 C2)를 풀기 위함.
 *   ko → 한글 음('경'),  en → 로마자 음('Gyeong'). EN 은 병음 괄호(Gēng)를 떼어
 * 3중 표기 혼란을 막고, EN 본문에 한글이 새지 않게 한다(enParity 가드).
 */
export function hanjaReading(ch: string, lang: Lang): string {
  const h = getHanjaRich(ch, lang) as { name?: string } | null
  if (!h?.name) return ''
  return lang === 'en' ? h.name.replace(/\s*\(.*\)\s*$/, '').trim() : h.name
}
const DIGNITY_STATUS_KEY: Record<string, DignityStatus> = {
  domicile: 'Domicile',
  exaltation: 'Exaltation',
  detriment: 'Detriment',
  fall: 'Fall',
  peregrine: 'Peregrine',
}
export function dignityHover(planet: string, tier: string, lang: Lang): string {
  const st = DIGNITY_STATUS_KEY[String(tier).toLowerCase()]
  if (!st) return ''
  return getAstroDignity(NODE_CORE_KEY[planet] ?? planet, st, lang)?.text ?? ''
}
export function stageHover(stage: string, lang: Lang): string {
  const it = getTwelveStageInterpretation((STAGE_SYN[stage] ?? stage) as never)
  if (!it) return ''
  return lang === 'en' ? (it.meaning_en ?? '') : (it.meaning ?? '')
}
export const elementLabel = (key: string, lang: Lang): string => {
  const e = ELEMENTS[key]
  if (!e) return key
  return lang === 'en' ? key.charAt(0).toUpperCase() + key.slice(1) : e.ko
}
// 약어(3자) → 영어 풀네임 역방향 표. EN 에서 "Sco" 대신 "Scorpio" 로 읽히게.
const ABBR_TO_SIGN_EN: Record<string, string> = Object.fromEntries(
  Object.entries(SIGN_ABBR).map(([full, ab]) => [ab, full])
)
export const signLabel = (abbrKey: string, lang: Lang): string => {
  const m = SIGN_META[abbrKey]
  if (!m) return abbrKey
  return lang === 'en' ? (ABBR_TO_SIGN_EN[abbrKey] ?? abbrKey) : m.ko
}
