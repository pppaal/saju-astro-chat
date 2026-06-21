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
  eyebrow: { ko: '四柱 × 占星 · Integrated Reading', en: '四柱 × 占星 · Integrated Reading' },
  titlePre: { ko: '통합', en: 'Integrated' },
  titleAccent: { ko: '명식', en: 'Chart' },
  titlePost: { ko: '리포트', en: 'Report' },
  subtitle: {
    ko: '사주 명식과 출생 천궁도를 하나의 평면에서 교차 분석',
    en: 'Four Pillars and natal chart cross-read on a single plane',
  },
  male: { ko: '남', en: 'M' },
  female: { ko: '여', en: 'F' },
  metaBirth: { ko: '출생', en: 'Birth' },
  metaPlace: { ko: '장소', en: 'Place' },
  metaCoord: { ko: '좌표', en: 'Coords' },
  metaTz: { ko: '표준시', en: 'Time zone' },
  metaHouse: { ko: '하우스', en: 'Houses' },
  timeUnknownTitle: { ko: '출생시각 미상', en: 'Birth time unknown' },
  timeUnknownBody: {
    ko: '출생시각이 입력되지 않아 정오를 기준으로 계산했어요. 상승궁(ASC)·중천(MC)·하우스에 기대는 해석(사회적 역할, 첫인상, 영역별 강조)은 근사치이니 참고용으로만 봐 주세요. 사주와 행성 배치 해석은 영향을 거의 받지 않아요.',
    en: 'No birth time was provided, so the chart is computed for noon. Readings that depend on the Ascendant, Midheaven, or houses (social role, first impression, life-area emphasis) are approximate — treat them as indicative only. Saju and planet-placement readings are largely unaffected.',
  },
  day: { ko: '주간', en: 'diurnal' },
  night: { ko: '야간', en: 'nocturnal' },
  pHour: { ko: '시', en: 'Hr' },
  pDay: { ko: '일', en: 'Day' },
  pMonth: { ko: '월', en: 'Mo' },
  pYear: { ko: '년', en: 'Yr' },
  dayBranchLabel: { ko: '日干', en: 'Day Master' },
  shinsalCap: { ko: '신살 · 神煞', en: 'Spirits · 神煞' },
  relCap: { ko: '본명 합충형파', en: 'Natal Interactions' },
  iljuCap: { ko: '일주 원형 · 日柱', en: 'Day-Pillar Archetype · 日柱' },
  sec02Title: { ko: '오행과 용신', en: 'Elements & Balance' },
  sec02Han: { ko: '五行·用神', en: '五行·用神' },
  elemDist: { ko: '오행 분포', en: 'Element Spread' },
  strongWeak: { ko: '신강 · 신약', en: 'Strong · Weak' },
  dayMasterLab: { ko: '일간', en: 'Day Master' },
  strong: { ko: '신강', en: 'Strong' },
  weak: { ko: '신약', en: 'Weak' },
  balanced: { ko: '중화', en: 'Balanced' },
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
  gongmangLab: { ko: '공망', en: 'Void' },
  gongmangTip: {
    ko: '공망 — 일주가 속한 60갑자 그룹에서 비어 있는 지지 2개예요. 그 지지의 작용이 약해져요.',
    en: 'Void branches — the two empty branches of the day-pillar sexagenary group; their influence is muted.',
  },
  johuLab: { ko: '조후', en: 'Climate' },
  johuTip: {
    ko: '조후용신 — 계절 균형 관점의 보조 용신. 긴급도',
    en: 'Climatic useful god — a secondary balancer from the seasonal-climate view. Urgency',
  },
  yongLab: { ko: '용신', en: 'Useful' },
  giLab: { ko: '기신', en: 'Adverse' },
  yongTitle: { ko: '용신 · 희신 · 기신', en: 'Useful · Helpful · Adverse' },
  geokgukCap: { ko: '격국 풀이 · 格局', en: 'Structure · 格局' },
  geokPersonality: { ko: '성향', en: 'Personality' },
  geokStrength: { ko: '강점', en: 'Strengths' },
  geokWeakness: { ko: '약점', en: 'Watch-outs' },
  geokCareer: { ko: '직업', en: 'Careers' },
  geokLove: { ko: '연애', en: 'Love' },
  geokAdvice: { ko: '조언', en: 'Advice' },
  sibsinCap: { ko: '주도 십성 · 十星', en: 'Dominant Ten God · 十星' },
  sec03Title: { ko: '출생 천궁도', en: 'Natal Chart' },
  sec03Han: { ko: '本命 天宮圖', en: '本命 天宮圖' },
  planetsCap: { ko: '행성 위치 · Planets', en: 'Planet Positions · Planets' },
  sectLab: { ko: 'Sect', en: 'Sect' },
  houseLab: { ko: 'House', en: 'House' },
  sectDay: { ko: '주간 (晝)', en: 'Diurnal (晝)' },
  sectNight: { ko: '야간 (夜)', en: 'Nocturnal (夜)' },
  signSuffix: { ko: '자리', en: '' },
  sec04Title: { ko: '어스펙트', en: 'Aspects' },
  sec04Han: { ko: '行星 角度', en: '行星 角度' },
  legSoft: { ko: '잘 흘러요·도와줘요', en: 'Flows · helps' },
  legHard: { ko: '부딪혀요·맞서요', en: 'Clashes · opposes' },
  legNeutral: { ko: '같이 있어요', en: 'Together' },
  dignityCap: { ko: '위계 · Dignities', en: 'Dignities' },
  noDignity: {
    ko: '뚜렷한 위계 없음 — 행성이 모두 중립(peregrine) 자리예요.',
    en: 'No notable dignity — every planet sits in a neutral (peregrine) position.',
  },
  sec05Title: { ko: '통합 교차', en: 'Cross-System' },
  sec05Han: { ko: '交叉 統合', en: '交叉 統合' },
  synthLabel: { ko: '🧬 종합 정체성', en: '🧬 Synthesis' },
  sajuSide: { ko: '사주', en: 'Saju' },
  astroSide: { ko: '점성', en: 'Astro' },
  footBrain: {
    ko: '동·서양 통합 분석 엔진',
    en: 'East–West integrated analysis',
  },
  orb: { ko: 'orb', en: 'orb' },
  // '더보기'(접기) 요약 라벨 — 전문(Level 2) 자료를 한 탭 뒤로 숨길 때.
  l2Pillars: {
    ko: '전문 명식 보기 · 한자 · 지장간 · 12운성',
    en: 'Expert chart · pillars, hidden stems, stages',
  },
  l2Sub: {
    ko: '보조 지표 보기 · 통근 · 공망 · 조후',
    en: 'Secondary indicators · rooting, void, climate',
  },
  l2Planets: { ko: '행성 위치표 자세히 보기', en: 'Full planet position table' },
  l2Aspects: { ko: '어스펙트 격자 자세히 보기', en: 'Full aspect grid' },
  l2Dignity: { ko: '행성 위계(디그니티) 자세히 보기', en: 'Planet dignities, in detail' },
  retroLegend: {
    ko: '역행 — 그 행성의 힘이 밖으로 내뻗기보다 안으로·되짚는 쪽으로 작동해요.',
    en: 'retrograde — that planet works inward and in review rather than pushing outward.',
  },
}

// 관계 kind → 이중언어 라벨. EN 한글 누수 차단.
const RELATION_TYPE_LABEL: Record<string, BiLabel> = {
  천간합: { ko: '천간합', en: 'Stem Combine' },
  천간충: { ko: '천간충', en: 'Stem Clash' },
  지지육합: { ko: '지지육합', en: 'Six Harmony' },
  지지삼합: { ko: '지지삼합', en: 'Triple Harmony' },
  지지방합: { ko: '지지방합', en: 'Directional Harmony' },
  지지충: { ko: '지지충', en: 'Branch Clash' },
  지지형: { ko: '지지형', en: 'Punishment' },
  지지파: { ko: '지지파', en: 'Destruction' },
  지지해: { ko: '지지해', en: 'Harm' },
  원진: { ko: '원진', en: 'Resentment' },
  공망: { ko: '공망', en: 'Void' },
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
  tension: { ko: '서로 반대로 말해요', en: 'They say the opposite' },
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
export function planetHover(name: string, lang: Lang): string {
  const c = getPlanetCore(NODE_CORE_KEY[name] ?? name, lang)
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
