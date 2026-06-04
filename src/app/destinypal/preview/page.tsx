'use client'

/* ============================================================
   /destinypal/preview — Phase B (UI) 단독 검증 페이지
   ───────────────────────────────────────────────────────────
   목적: Shell 카메라 (zoom 0..3) / Topbar / Rail / Starfield
         parallax / 4-tier render-prop 슬롯이 정상 동작하는지
         실데이터 없이 눈으로 검증.

   ⚠️ Phase E (adapters) 미시행 — 본 페이지는 tier 컴포넌트의
   `DestinyUserSummary / DestinyLifetime / DestinyYear /
   DestinyMonth / DestinyDay` 어댑터 출력 shape 을 직접
   구성하지 않고, 시각 흐름 검증에 필요한 최소 필드만 담은
   placeholder fixture 를 `as unknown as …` 로 캐스팅해
   투입합니다. 실제 어댑터 (`hooks/mock.ts` 의 raw payload →
   `DestinyXxx` 변환) 가 합류하면 본 페이지는 fixture 블록을
   걷어내고 그대로 동작합니다.
   ============================================================ */

import { DestinypalShell } from '@/components/destinypal/shell'
import { LifetimeTier } from '@/components/destinypal/tiers/LifetimeTier'
import { YearTier } from '@/components/destinypal/tiers/YearTier'
import { MonthTier } from '@/components/destinypal/tiers/MonthTier'
import { DayTier } from '@/components/destinypal/tiers/DayTier'

import type {
  DestinyUserSummary,
  DestinyLifetime,
  DestinyYear,
  DestinyMonth,
  DestinyDay,
} from '@/types/destinypal'

// ============================================================================
// PLACEHOLDER FIXTURES — Phase E 어댑터 미시행. 시각 검증 전용 최소 필드.
// ============================================================================

const previewUser = {
  birth: '1995-02-09 06:40',
  birthKo: '1995년 2월 9일 06:40',
  place: '서울',
  sex: '남',
  score: 72,
  grade: 'A',
  ilgan: { hanja: '辛', kr: '신금', en: 'Sin · Yin Metal', element: 'metal' },
  yongsin: {
    hanja: '火·土',
    kr: '화·토',
    en: 'Fire · Earth',
    primary: 'fire',
    secondary: 'earth',
    avoid: ['water'],
  },
  huisin: {
    hanja: '土',
    kr: '토',
    en: 'Earth',
    primary: 'earth',
    avoid: [],
  },
  gyeokguk: '정인격',
  gyeokgukEn: 'Jeong-in (Direct Resource)',
  gangyak: '약(弱)',
  dominantSibsin: { name: '정인', pct: 28 },
  elements: { wood: 2, fire: 0, earth: 2, metal: 3, water: 1 },
  astro: {
    sun: '물병자리',
    asc: '물병자리',
    mc: '전갈자리',
    sunEn: 'Aquarius',
    ascEn: 'Aquarius',
    mcEn: 'Scorpio',
  },
  dignities: [],
  almutenFiguris: { planet: 'Saturn', score: 18 },
  sect: 'day',
  lots: [],
  intro: '서늘한 신금(辛) 일간 — 정련된 칼날의 정확함을 닮은 본명입니다.',
  introEn: 'Yin Metal (Xin) — the polished blade of precision.',
  gyeokgukStatus: '정인격 · 반성반파 (+정인 / -재성)',
  rootStatus: '월령 寅 실령 · 통근 얇음',
} as unknown as DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }

const previewLifetime = {
  birthYear: 1995,
  currentYear: 2026,
  daewoon: [
    { gz: '丙子', start: 2006, end: 2016, startAge: 11, endAge: 21, sibsin: '정관', known: true },
    { gz: '乙亥', start: 2016, end: 2026, startAge: 21, endAge: 31, sibsin: '편재', known: true, now: true },
    { gz: '甲戌', start: 2026, end: 2036, startAge: 31, endAge: 41, sibsin: '편재', known: true },
    { gz: '癸酉', start: 2036, end: 2046, startAge: 41, endAge: 51, sibsin: '식신', known: true },
  ],
  lifeStages: [
    { id: 'early',  name: '초년기', ageFrom: 0,  ageTo: 20, yearFrom: 1995, yearTo: 2015, now: false, tone: '편관 — 도전의 무대',  detail: null },
    { id: 'youth',  name: '청년기', ageFrom: 21, ageTo: 40, yearFrom: 2016, yearTo: 2035, now: true,  tone: '편재 — 현실 성취의 무대', detail: null },
    { id: 'middle', name: '중년기', ageFrom: 41, ageTo: 60, yearFrom: 2036, yearTo: 2055, now: false, tone: '식신 — 흐름과 표현',     detail: null },
    { id: 'late',   name: '장년기', ageFrom: 61, ageTo: 80, yearFrom: 2056, yearTo: 2075, now: false, tone: '비견 — 다지는 시기',     detail: null },
  ],
  milestones: [
    { year: 2024, age: 29, label: '첫 토성 회귀 — 진짜 어른됨의 통과의례', kind: 'saturn', now: true },
    { year: 2030, age: 35, label: '목성 회귀 — 확장의 사이클',          kind: 'jupiter' },
  ],
  zrSpiritChapters: [],
  zrFortuneChapters: [],
} as unknown as DestinyLifetime

const previewYear = {
  year: 2026,
  headline: '올해의 무게중심은 8번째 영역으로 기울어요.',
  sewoon:       { gz: '丙午', sibsin: '정관', score: 68 },
  sewoonGz:     '丙午',
  sewoonSibsin: '정관',
  profection: {
    house: 8, theme: '변환 · 깊이 · 재구성', themeEn: 'Transformation · Depth · Rebuild',
    cusp: '처녀자리', cuspEn: 'Virgo', ruler: '수성', rulerEn: 'Mercury',
    rulerNatal: '1궁 (물병자리)', rulerNatalEn: '1st house · Aquarius',
    rulerNatalHouse: 1, rulerNatalSign: 'Aquarius',
  },
  profectionWheel: Array.from({ length: 12 }, (_, i) => ({
    house: i + 1, cuspSign: 'Aries', cuspRuler: 'Mars',
    natalPlanets: [], active: i + 1 === 8,
  })),
  sajuNote:  '세운 정관 — 책임·구조의 1년, 용신 火 보강 흐름.',
  astroNote: '활성 8번째 영역 룰러(수성) 본명 1궁 — 내적 자기 정리에 무게.',
  zrSpiritChapters: [],
  zrFortuneChapters: [],
  monthlyScores: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, score: 50 + ((i * 7) % 40),
  })),
} as unknown as DestinyYear

const previewMonth = {
  label: '2026년 6월',
  ym: '2026-06',
  woolun: '甲午',
  woolunSibsin: '정재',
  cautionDays: ['06-07', '06-19'],
  goodDays: ['06-03', '06-14', '06-21'],
  bestDay: { date: '06-15', score: 82 },
  avoidDays: ['06-09'],
  themes: [
    { key: 'love',     ko: '재성·연애', v: 72 },
    { key: 'career',   ko: '관성·경력', v: 64 },
    { key: 'health',   ko: '인성·건강', v: 58 },
    { key: 'money',    ko: '재성·금전', v: 70 },
    { key: 'creative', ko: '식상·창작', v: 55 },
  ],
  narrative: [],
  converge: {
    date: '2026-06-15', score: 84,
    astro: ['Saturn-Sun 트라인'], saju: ['정관 입묘'],
    bothSystems: true, meaning: '책임과 구조가 양쪽에서 정렬되는 날.',
  },
  focusDay: 15,
  calendar: Array.from({ length: 30 }, (_, i) => ({
    d: i + 1,
    ds: `06-${String(i + 1).padStart(2, '0')}`,
    iso: `2026-06-${String(i + 1).padStart(2, '0')}`,
    intensity: 0.3 + (((i * 13) % 70) / 100),
    score: 40 + ((i * 17) % 50),
    mark: i + 1 === 15 ? 'best' : i + 1 === 7 ? 'caution' : null,
    focus: i + 1 === 15,
    signalCount: 2 + (i % 4),
  })),
} as unknown as DestinyMonth

const previewDay = {
  date: '2026-06-15',
  dateKo: '2026년 6월 15일',
  iljin: '庚申',
  iljinSibsin: '겁재',
  score: 78,
  oneLine: '오늘은 같은 금(金) 기운이 겹쳐 결단력이 두드러집니다.',
  totalSignals: 9,
  themes: [
    { key: 'love',     ko: '재성·연애', v: 60 },
    { key: 'career',   ko: '관성·경력', v: 82 },
    { key: 'health',   ko: '인성·건강', v: 55 },
    { key: 'money',    ko: '재성·금전', v: 70 },
    { key: 'creative', ko: '식상·창작', v: 50 },
  ],
  signals: [],
  transits: [],
  crossSignals: [],
  allSignals: [],
  jijanggan: {
    jeonggi: { stem: '庚', sibsin: '겁재', element: 'metal', layer: '정기' },
    junggi:  { stem: '壬', sibsin: '상관', element: 'water', layer: '중기' },
    yeogi:   { stem: '戊', sibsin: '정인', element: 'earth', layer: '여기' },
  },
  geokgukStatus: {
    name: '정인격', nameEn: 'Jeong-in', status: 'mixed',
    factors: [], description: '정인의 지원이 식상에 의해 부분 손상.',
  },
  gongmang: {
    natalBranches: ['戌', '亥'], activeBranches: [],
    activeAxes: [], note: '오늘 공망 비활성.',
  },
  appliedPatterns: [],
  crossActivations: [],
  shinsalActive: ['역마', '도화'],
  narrative: [],
  topReasons: ['일간 통근 보강', '용신 火 진입'],
  cautions: [],
} as unknown as DestinyDay

// ============================================================================
// Page
// ============================================================================

export default function DestinypalPreview() {
  return (
    <DestinypalShell
      topbar={{
        whoBirthLine: '1995.2.9 06:40',
        place: '서울',
        ilganHanja: '辛',
      }}
      renderLife={({ onDive }) => (
        <LifetimeTier user={previewUser} lifetime={previewLifetime} onDive={onDive} />
      )}
      renderYear={({ onRise, onDive }) => (
        <YearTier user={previewUser} year={previewYear} onRise={onRise} onDive={onDive} />
      )}
      renderMonth={({ onRise, onFocusDay }) => (
        <MonthTier month={previewMonth} onRise={onRise} onDive={() => onFocusDay()} />
      )}
      renderDay={({ onRise }) => (
        <DayTier day={previewDay} onRise={onRise} />
      )}
    />
  )
}
