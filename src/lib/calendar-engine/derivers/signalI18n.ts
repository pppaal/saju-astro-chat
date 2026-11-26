/**
 * themeBreakdown.label (사주 신호명 KO) → EN 사전.
 * 엔진은 신호 이름을 KO 로 stamp 한 채 themeBreakdown 을 생성. UI 가 그대로
 * 노출하면 en 모드에서도 KO 가 보임. 응답 시점에 라벨 부분(십신·관계 등) 만
 * 영문으로 swap. 못 찾으면 KO 그대로.
 *
 * 우선순위: 가장 빈도 높은 십신 + 자주 나오는 관계 용어.
 */
import { SIBSIN_EN as SIBSIN_EN_BASE } from '@/lib/saju/sibsinLabels'

// 십신 (10 Gods) — 사주 신호의 핵심. 10개 핵심 십신은 SSOT(sibsinLabels) 에서,
// 집계 star(관성/인성/재성/식상/비겁) 는 이 디라이버 고유 키라 spread 후 추가.
const SIBSIN_EN: Record<string, string> = {
  ...SIBSIN_EN_BASE,
  관성: 'Officer star',
  인성: 'Resource star',
  재성: 'Wealth star',
  식상: 'Output star',
  비겁: 'Companion star',
}

// 사주 관계·구조
const SAJU_REL_EN: Record<string, string> = {
  충: 'clash',
  합: 'combine',
  형: 'punish',
  해: 'harm',
  파: 'break',
  회: 'gather',
  공망: 'void',
  원진: 'resentment',
  지지합: 'branch combine',
  천간합: 'stem combine',
  지지충: 'branch clash',
  천간충: 'stem clash',
  지지형: 'branch punish',
  지지해: 'branch harm',
  지지파: 'branch break',
  자형: 'self-punish',
  암합: 'hidden combine',
  육합: 'six-combine',
  삼합: 'three-combine',
  반합: 'half-combine',
  방합: 'directional combine',
  회국: 'gathering combination',
  월지: 'month branch',
  년지: 'year branch',
  일지: 'day branch',
  시지: 'hour branch',
  월간: 'month stem',
  년간: 'year stem',
  일간: 'day stem',
  시간: 'hour stem',
  대운: 'decade luck',
  세운: 'annual luck',
  월운: 'monthly luck',
  일진: 'daily luck',
}

// 점성 용어
const ASTRO_EN: Record<string, string> = {
  컨정션: 'Conjunction',
  대립: 'Opposition',
  트라인: 'Trine',
  스퀘어: 'Square',
  섹스타일: 'Sextile',
  순행: 'direct',
  역행: 'retrograde',
  목성: 'Jupiter',
  토성: 'Saturn',
  화성: 'Mars',
  금성: 'Venus',
  수성: 'Mercury',
  해왕성: 'Neptune',
  천왕성: 'Uranus',
  명왕성: 'Pluto',
  태양: 'Sun',
  달: 'Moon',
  본명: 'natal',
}

// 신살 이름 KO→EN — 캘린더가 낼 수 있는 신살 전부(saju-shinsal SHINSAL_POLARITY 키 =
// 엔진 ShinsalHit kind)와 그 '~살' 별칭. 영문은 interpretations.json shinsal name_en(정본).
// 단일 출처: dayTierEnMaps.shinsalEn·교차 사주 키 라벨(crossPair.crossSajuEn)이 이 표를 쓴다.
// 예전엔 11개만 있어 EN 화면에 '건록'·'문창'·'금여성' 등이 한글로 샜고(재감사 SI-2·CC-4),
// '육해' 는 관계어 '해'만 치환돼 '육harm' 이 됐다.
const SHINSAL_BASE_EN: Record<string, string> = {
  // 12신살
  장성: 'General Star',
  반안: 'Saddle Star',
  역마: 'Traveling Horse',
  육해: 'Six Harms Star',
  화개: 'Floral Canopy',
  겁살: 'Robbery Star',
  재살: 'Disaster Star',
  천살: 'Heavenly Disaster Star',
  월살: 'Withering Star',
  망신: 'Disgrace Star',
  지살: 'Earth Star',
  년살: 'Year Star',
  // 길성 (귀인·문창류)
  천을귀인: 'Heavenly Benefactor',
  태극귀인: 'Grand Polarity Star',
  천덕귀인: 'Heavenly Virtue',
  천덕: 'Heavenly Virtue',
  월덕귀인: 'Monthly Virtue',
  월덕: 'Monthly Virtue',
  천주귀인: 'Heavenly Granary Star',
  천관귀인: 'Heavenly Office Star',
  복성귀인: 'Fortune Star',
  암록: 'Hidden Stipend',
  금여성: 'Golden Carriage Star',
  금여: 'Golden Carriage',
  천의성: 'Healer Star',
  천문성: 'Heavenly Gate Star',
  문창: 'Literary Star',
  문창귀인: 'Literary Star',
  문곡: 'Literary Arts Star',
  학당귀인: "Scholar's Hall",
  // 록·왕 — 신살로서의 이름(interpretations shinsal). 12운성 임관(Office Entry)과 다르다.
  건록: 'Established Stipend',
  제왕: 'Peak Star',
  // 흉신·살
  도화: 'Peach Blossom',
  홍염: 'Red Charm Star',
  현침: 'Hanging Needle Star',
  고신: 'Solitary Star',
  과숙: 'Widow Star',
  괴강: 'Strong-Willed Star',
  양인: 'Blade Edge',
  백호: 'White Tiger',
  공망: 'Voidness',
  귀문관: 'Spirit Gate',
  원진: 'Resentment Star',
  천라지망: 'Heaven-Earth Net',
  삼재: 'Three Calamities Period',
}

/**
 * 신살 이름 → EN 정본 표 (별칭 '~살' 포함). 키가 '살'로 끝나지 않으면 '~살' 별칭을,
 * '살'로 끝나면(겁살·재살…) 그대로 — 부분 치환('장성살' → 'General Star살')이 생기지 않게
 * 긴 별칭 키도 표에 둔다.
 */
export const SHINSAL_NAME_EN: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(SHINSAL_BASE_EN).flatMap(([ko, en]) =>
      ko.endsWith('살')
        ? [[ko, en]]
        : [
            [ko, en],
            [`${ko}살`, en],
          ]
    )
  )
)

/** 신살 이름 하나의 EN — 표에 없으면 undefined (호출부가 폴백을 고른다). */
export function shinsalNameEn(name: string): string | undefined {
  return SHINSAL_NAME_EN[name] ?? SHINSAL_NAME_EN[name.replace(/살$/, '')]
}

// themeBreakdown 분류어 — 신살 이름이 아닌 묶음 라벨.
const SHINSAL_CLASS_EN: Record<string, string> = {
  흉살: 'malefic',
  길성: 'lucky star',
}

// 글루/잔차 라벨 — 사주·점성 용어가 아닌 합성 문구. 전체 구절 단위로 치환
// (SORTED_TERMS 가 길이 desc 라 긴 구절이 먼저 매칭).
const GLUE_EN: Record<string, string> = {
  '그 외 다수 신호': 'other signals',
  활성: 'active',
  시진: 'hour pillar',
}

// 신살 표를 관계어보다 *먼저* 펼친다 — 공망·원진은 관계어 표(void·resentment)가 이기도록
// 예전 치환 결과를 그대로 둔다(신살 이름으로만 쓰이는 키는 겹치지 않는다).
const ALL_TERMS: Record<string, string> = {
  ...SIBSIN_EN,
  ...SHINSAL_NAME_EN,
  ...SAJU_REL_EN,
  ...ASTRO_EN,
  ...SHINSAL_CLASS_EN,
  ...GLUE_EN,
}

// 긴 단어 먼저 매칭하도록 정렬 — "지지합" 이 "지지" 앞에 와야 함
const SORTED_TERMS = Object.keys(ALL_TERMS).sort((a, b) => b.length - a.length)

/**
 * KO 라벨 텍스트 안의 사주/점성 용어를 EN 으로 swap.
 * 못 매칭되는 잔존 KO 는 그대로 둠 — graceful.
 *
 * 예: "정관 월지 정해합" → "Direct Officer month branch ..."
 */
export function translateSignalLabel(koLabel: string, lang: 'ko' | 'en'): string {
  if (lang !== 'en' || !koLabel) return koLabel
  let out = koLabel
  for (const term of SORTED_TERMS) {
    if (out.includes(term)) {
      // 단순 replaceAll — 한국어는 토큰 경계 모호하므로 그냥 단어 swap
      out = out.split(term).join(ALL_TERMS[term])
    }
  }
  return out
}
