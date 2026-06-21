/**
 * 궁합 차트(CompatChartModal) 표시층 i18n — 순수 모듈(테스트 가능).
 *
 * computeSajuSynastryFacts 가 내보내는 *KO 정본 토큰*(tags·오행·일간 relation·
 * 배우자성 sibsin)은 엔진 discriminator 라 KO 로 고정한다. EN 차트에 그릴 때만
 * 여기서 라벨로 번역 — 예전엔 facts 의 KO prose(relationLabel/role)와 KO 토큰이
 * 그대로 EN UI 로 새던 누수를, 표시 직전에 차단한다.
 */

import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'

/** 오행 KO → EN. computeSajuSynastryFacts 의 STEM_EL/BRANCH_EL 값 집합과 일치. */
export const ELEMENT_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}
export const elLabel = (el: string, isKo: boolean): string => (isKo ? el : (ELEMENT_EN[el] ?? el))

/** 기둥 관계 태그 KO → EN. CompatChartModal 의 REL_MEANING/REL_PRIORITY 와 같은 키 집합. */
export const TAG_EN: Record<string, string> = {
  천간합: 'stem harmony',
  천간충: 'stem clash',
  육합: 'six-harmony',
  삼합: 'three-harmony',
  방합: 'directional harmony',
  충: 'clash',
  형: 'punishment',
  자형: 'self-punishment',
  해: 'harm',
  파: 'break',
}
export const tagLabel = (tag: string, isKo: boolean): string => (isKo ? tag : (TAG_EN[tag] ?? tag))

/** 십신 KO → EN. SSOT(sibsinLabels)에서 가져온다. */
export const sibsinLabel = (sibsin: string, isKo: boolean): string =>
  isKo ? sibsin : (SIBSIN_EN[sibsin] ?? sibsin)

/**
 * 일간 오행 관계 — facts.relationLabel(KO prose) 대신 relation enum + 오행에서
 * 합성. enum 분기는 computeSajuSynastryFacts 의 relationLabel 분기와 1:1.
 */
export function dayMasterRelationText(
  relation: 'same' | 'aControlsB' | 'bControlsA' | 'generate',
  aEl: string,
  bEl: string,
  isKo: boolean
): string {
  const a = elLabel(aEl, isKo)
  const b = elLabel(bEl, isKo)
  switch (relation) {
    case 'same':
      return isKo ? `같은 오행 (${a}) — 비화` : `same element (${a}) — peers`
    case 'aControlsB':
      return isKo ? `${a}극${b}, 다듬어주는 흐름` : `${a} shapes ${b} — a refining flow`
    case 'bControlsA':
      return isKo ? `${b}극${a}, 다듬어주는 흐름` : `${b} shapes ${a} — a refining flow`
    default:
      return isKo ? '상생 — 서로 보완' : 'mutual generation — each fills the other'
  }
}

/**
 * 배우자성 느낌 — facts.role(KO prose, 괄호 안 키워드)을 sibsin 으로 다시 잡아 EN 화.
 * 매핑이 없으면 role 괄호 안(KO)으로 폴백.
 */
export const SPOUSE_FEELING: Record<string, { ko: string; en: string }> = {
  정재: { ko: '안정·가정', en: 'stability & home' },
  편재: { ko: '활달·자유', en: 'lively & free' },
  정관: { ko: '책임·안정', en: 'responsibility & steadiness' },
  편관: { ko: '열정·자극', en: 'passion & spark' },
}
export const spouseFeeling = (sibsin: string, role: string, isKo: boolean): string => {
  const f = SPOUSE_FEELING[sibsin]
  if (f) return isKo ? f.ko : f.en
  return role.match(/\(([^)]+)\)/)?.[1] ?? role
}
