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
  공망: 'void',
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
  방합: 'directional combine',
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

// shinsal (date-detail 에 이미 있지만 themeBreakdown 도 자주 나옴)
const SHINSAL_EN: Record<string, string> = {
  도화: 'romance star',
  천을귀인: 'heavenly noble',
  역마: 'wanderer',
  화개: 'solitary',
  양인: 'yang blade',
  백호: 'white tiger',
  괴강: 'magnetic axis',
  천덕귀인: 'heavenly virtue',
  월덕귀인: 'lunar virtue',
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

const ALL_TERMS: Record<string, string> = {
  ...SIBSIN_EN,
  ...SAJU_REL_EN,
  ...ASTRO_EN,
  ...SHINSAL_EN,
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
