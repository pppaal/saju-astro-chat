/**
 * 사주 한자 / 십성 / 격국 / 오행 의미 — 한 줄 해석 라이브러리.
 *
 * 차트 모달의 long-press tooltip, 십성 칩, persona 카드 등이 공통으로 사용.
 * 비전공자가 한자 / 약어 보고 즉시 의미 파악할 수 있게 1~2줄 plain 한국어.
 *
 * 데이터 소스: `@/lib/chart-dictionary` (hanja-rich, geokguk-rich, saju-strength).
 * 이 모듈은 외부에 노출되는 record/helper 시그니처를 유지하면서 내부 값을
 * chart-dictionary 의 helper 호출로 빌드한다 → 미래 drift 방지.
 *
 * SIBSIN_COLOR 와 SIBSIN 의 category 매핑은 UI 토큰 / 개별 십성(비견·정관 등)
 * 단위 의미여서 chart-dictionary 의 카테고리 단위 데이터로 대체 불가 → atoms 유지.
 */

import { getHanjaRich } from '@/lib/chart-dictionary'

// ── 한자 풀(stem / branch 순서) ───────────────────────────────────────────────
const STEM_CHARS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const BRANCH_CHARS = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const

// hanja-rich 의 image 필드는 "큰 나무·동량목(棟梁木) — 곧게 위로 자라는 거목" 형태.
// 기존 atoms 시그니처는 짧은 자연 image("큰 나무") 만 노출 → 첫 ·/— 앞만 추출.
function shortImage(rich: string | undefined): string {
  if (!rich) return ''
  return rich.split('—')[0].trim().split('·')[0].trim()
}

// 10 천간 — 음양 + 오행 + 자연 image + 성격 키워드
export const HEAVENLY_STEMS: Record<
  string,
  { ko: string; yinYang: '양' | '음'; element: string; image: string; meaning: string }
> = (() => {
  const map: Record<
    string,
    { ko: string; yinYang: '양' | '음'; element: string; image: string; meaning: string }
  > = {}
  for (const c of STEM_CHARS) {
    const entry = getHanjaRich(c, 'ko')
    if (!entry || !('yinYang' in entry)) continue
    map[c] = {
      ko: entry.name,
      yinYang: entry.yinYang === '음' ? '음' : '양',
      element: entry.element,
      image: shortImage(entry.image),
      meaning: entry.nature,
    }
  }
  return map
})()

// 12 지지 — 동물 + 오행 + 의미
export const EARTHLY_BRANCHES: Record<
  string,
  { ko: string; animal: string; element: string; meaning: string }
> = (() => {
  const map: Record<string, { ko: string; animal: string; element: string; meaning: string }> = {}
  for (const c of BRANCH_CHARS) {
    const entry = getHanjaRich(c, 'ko')
    if (!entry || !('animal' in entry)) continue
    map[c] = {
      ko: entry.name,
      animal: entry.animal,
      element: entry.element,
      meaning: entry.nature,
    }
  }
  return map
})()

// 십성 (10 神) — 일간 기준 다른 천간/지지와의 관계.
// chart-dictionary 의 sibsin-category 는 카테고리(비겁/식상/...) 단위라 개별 십성
// 의미(비견·겁재 등)는 없음 → 이 매핑은 atoms 에서 유지.
export const SIBSIN: Record<
  string,
  { category: 'bigeop' | 'sikSang' | 'jaeSeong' | 'gwanSeong' | 'inSeong'; meaning: string }
> = {
  비견: { category: 'bigeop', meaning: '자기·형제·동료 — 독립·경쟁' },
  겁재: { category: 'bigeop', meaning: '경쟁자·라이벌 — 분탈·욕망' },
  식신: { category: 'sikSang', meaning: '표현·창의·즐거움 — 부드러운 결' },
  상관: { category: 'sikSang', meaning: '재능·개성·반항 — 날카로운 결' },
  편재: { category: 'jaeSeong', meaning: '활동적 재물·기회·도전' },
  정재: { category: 'jaeSeong', meaning: '안정적 재물·꾸준한 노력' },
  편관: { category: 'gwanSeong', meaning: '큰 권력·압박·도전 — 칠살' },
  정관: { category: 'gwanSeong', meaning: '명예·규율·정통 권위' },
  편인: { category: 'inSeong', meaning: '특이한 지식·직관·종교성' },
  정인: { category: 'inSeong', meaning: '학문·보호·전통 지원' },
}

// 십성 → 한 줄(2~5자) plain 한국어 키워드. 셀 칩 밑에 inline 으로 노출해서
// "비견 뭐지" 라는 인지 부담 제거. 위의 SIBSIN.meaning 은 tooltip 용 풍부한 설명이고
// 아래는 칩 옆에 항상 보이는 한 줄 라벨.
export const SIBSIN_SHORT: Record<string, string> = {
  비견: '자존·동료',
  겁재: '경쟁·라이벌',
  식신: '표현·창의',
  상관: '재능·개성',
  편재: '기회·재물',
  정재: '안정·재물',
  편관: '권력·압박',
  정관: '명예·규율',
  편인: '직관·지식',
  정인: '학문·보호',
}

// 십성 카테고리별 색 — 차트 전체에서 통일 (UI 토큰, chart-dictionary 범위 밖)
export const SIBSIN_COLOR: Record<
  'bigeop' | 'sikSang' | 'jaeSeong' | 'gwanSeong' | 'inSeong',
  { bg: string; text: string; ring: string; label: string }
> = {
  bigeop: { bg: 'bg-sky-500/15', text: 'text-sky-200', ring: 'ring-sky-500/30', label: '비겁' },
  sikSang: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-200',
    ring: 'ring-emerald-500/30',
    label: '식상',
  },
  jaeSeong: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-200',
    ring: 'ring-amber-500/30',
    label: '재성',
  },
  gwanSeong: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-200',
    ring: 'ring-rose-500/30',
    label: '관성',
  },
  inSeong: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-200',
    ring: 'ring-purple-500/30',
    label: '인성',
  },
}

// 오행 부족 시 처방 (Fire / Wood 같은 가벼운 색·방향 권장).
// chart-dictionary 의 용신 by_element 는 단일 문장 — atoms 의 분해된 {color, direction, activity}
// shape 와 불일치 → personaCompute 등 기존 consumer 가 깨지지 않게 hardcoded 유지.
type Bilingual = { ko: string; en: string }
export const ELEMENT_REMEDY: Record<
  string,
  { color: Bilingual; direction: Bilingual; activity: Bilingual }
> = {
  목: {
    color: { ko: '초록·청록', en: 'green · teal' },
    direction: { ko: '동쪽', en: 'East' },
    activity: { ko: '식물·산책·창작', en: 'plants · walks · making things' },
  },
  화: {
    color: { ko: '빨강·주황', en: 'red · orange' },
    direction: { ko: '남쪽', en: 'South' },
    activity: { ko: '운동·발표·논쟁', en: 'exercise · speaking up · debate' },
  },
  토: {
    color: { ko: '노랑·갈색', en: 'yellow · brown' },
    direction: { ko: '중앙', en: 'Center' },
    activity: { ko: '실용·신뢰·돌봄', en: 'practicality · trust · caregiving' },
  },
  금: {
    color: { ko: '흰색·은색', en: 'white · silver' },
    direction: { ko: '서쪽', en: 'West' },
    activity: { ko: '정리·체계·단단함', en: 'order · structure · firmness' },
  },
  수: {
    color: { ko: '검정·파랑', en: 'black · blue' },
    direction: { ko: '북쪽', en: 'North' },
    activity: { ko: '학습·명상·여행', en: 'study · meditation · travel' },
  },
}

// 헬퍼: 한자 → image
export function imageOf(stemOrBranch: string | undefined): string | undefined {
  if (!stemOrBranch) return undefined
  return (
    HEAVENLY_STEMS[stemOrBranch]?.image ?? EARTHLY_BRANCHES[stemOrBranch]?.meaning?.split('·')[0]
  )
}

// 헬퍼: 한자 → 1줄 의미 (long-press tooltip 용)
export function meaningOf(stemOrBranch: string | undefined): string | undefined {
  if (!stemOrBranch) return undefined
  const stem = HEAVENLY_STEMS[stemOrBranch]
  if (stem) return `${stem.image} — ${stem.meaning}`
  const branch = EARTHLY_BRANCHES[stemOrBranch]
  if (branch) return `${branch.animal} — ${branch.meaning}`
  return undefined
}

// 헬퍼: 십성 → 색 + meaning
export function sibsinInfo(sibsin: string | undefined) {
  if (!sibsin) return null
  const meta = SIBSIN[sibsin]
  if (!meta) return null
  const color = SIBSIN_COLOR[meta.category]
  return { ...meta, color }
}
