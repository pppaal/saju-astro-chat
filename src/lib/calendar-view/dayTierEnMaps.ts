/**
 * dayTierEnMaps — 사주 표시 용어(격국 성패 단어·신살 이름·12운성 단계·응용격국)의 KO→EN 치환 맵.
 * 처음엔 옛 DayTier '자세히 보기' 전문가 섹션용이었고(v9.2 에서 삭제), 지금은 toUser(격국
 * 이름 · 성패 줄)가 읽고 나머지 표는 엔진 EN 커버리지 테스트가 지킨다.
 *
 * EN 로케일에서 격국 성패 단어·신살 이름·12운성 단계가 한국어로 새던 것을
 * 영문화한다(엔진/공유데이터 무수정 — 컴포넌트 렌더 직전 best-effort 치환).
 * 영문값은 src/lib/saju/data/interpretations.json 의 name_en 들과 일치시켰다.
 * 미상 키는 호출부에서 KO 로 폴백 → KO 로케일·미상 라벨엔 영향 없음.
 */

import { SHINSAL_NAME_EN, shinsalNameEn } from '@/lib/calendar-engine/derivers/signalI18n'
import { GEOKGUK_NAME_EN as GEOKGUK_NAME_EN_SSOT } from '@/lib/saju/geokgukNameEn'

/** 격국 성패 단어 — 성격/파격/반성반파. */
export const GEOKGUK_STATUS_EN: Record<string, string> = {
  성격: 'Formed',
  파격: 'Broken',
  반성반파: 'Mixed',
}

/**
 * 격국 이름 KO→EN (GeokgukType 전체 29종 + 미정) — 정본은 중립 모듈 saju/geokgukNameEn.ts.
 * 캘린더 표면(Life 머리말·Day 본명 풀이)과 상담사 컨텍스트가 같은 표를 읽는다(G13 — 예전엔
 * 상담사만 'Established-rank (Geollok)' 같은 다른 표기를 들고 있었다). 여기선 재노출만.
 */
export const GEOKGUK_NAME_EN: Readonly<Record<string, string>> = GEOKGUK_NAME_EN_SSOT

/**
 * 격국 상태 한 줄 EN — '정인격 · 반성반파 (+투출 / -합거)' 같은 한국어 전용 줄을
 * '이름 · 상태'로 영문화한다. 성패 요인(투출/합거 등)은 수십 개 자유서술 구라
 * EN 맵을 두지 않고 EN 에선 생략(핵심 정보 = 격국명 + 성패는 보존, 한국어 누수 제거).
 * 미상 이름/상태는 각 맵에서 KO 폴백.
 */
export function geokgukStatusLineEn(name: string, status?: string): string {
  const n = GEOKGUK_NAME_EN[name] ?? name
  const s = status ? (GEOKGUK_STATUS_EN[status] ?? status) : ''
  return s ? `${n} · ${s}` : n
}

/**
 * 신살 KO→EN — 정본은 엔진 쪽 signalI18n.SHINSAL_NAME_EN(interpretations.json shinsal
 * name_en, 엔진이 낼 수 있는 신살 전부 + '~살' 별칭). 예전 여기 복사본은 건록을 12운성
 * 이름('Office Entry')으로 적어 교차 칩('Established Stipend')과 어긋났다(재감사 SI-2).
 */
export const SHINSAL_EN: Readonly<Record<string, string>> = SHINSAL_NAME_EN

/** 신살 EN 치환 — 트레일링 '살' 을 떼고도 재시도, 미상은 KO 그대로. */
export function shinsalEn(name: string): string {
  return shinsalNameEn(name) ?? name
}

// ============================================================================
// '본명 상세' 접힘 섹션 — 지장간·12운성·응용격국 EN 치환.
// 누락 5신호 노출용. 모두 결정론적 고정 맵(엔진 무수정).
// ============================================================================

/** 오행 KO→EN. */
const ELEMENT_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}
export function elementEn(el: string): string {
  return ELEMENT_EN[el] ?? el
}

/** 지장간 층(정기/중기/여기) KO→EN. */
const JIJANGGAN_LAYER_EN: Record<string, string> = {
  정기: 'Primary',
  중기: 'Mid',
  여기: 'Residual',
}
export function jijangganLayerEn(layer: string): string {
  return JIJANGGAN_LAYER_EN[layer] ?? layer
}

/** 12운성 단계 KO→EN (별칭 건록=임관, 제왕=왕지 포함).
 *  옛 단어 직역(Death/Illness/Tomb)은 EN 사용자에게 공포어로 읽혔다 —
 *  KO twelveStagePlain 과 같은 생활 프레임으로(단계 의미 보존, 2026-07). */
const TWELVE_STAGE_EN: Record<string, string> = {
  장생: 'fresh-start momentum',
  목욕: 'still polishing — hold the final call',
  관대: 'stepping out under your own name',
  건록: 'earning on solid skill',
  임관: 'earning on solid skill',
  제왕: 'peak momentum — pushing works',
  왕지: 'peak momentum — pushing works',
  쇠: 'past the peak — protect your gains',
  병: 'low battery — body comes first',
  사: 'wrap-up energy — close what is done',
  묘: 'sort and store, don’t expand',
  절: 'empty out, then restart',
  태: 'ideas quietly forming',
  양: 'quietly building strength',
  양생: 'fresh-start momentum',
}
export function twelveStageEn(stage: string): string {
  return TWELVE_STAGE_EN[stage] ?? stage
}

/**
 * 12운성 단계 → 한자 글리프(長生·臨官…). Day '본명 풀이' 칩의 보조 글리프(.natalHan)는
 * 한자 자리다 — 예전엔 엔진의 한글 단계명('병'·'장생')을 그대로 찍어 EN 화면에 한글이
 * 샜다(재감사 SI-3). 동의어(건록=임관, 제왕=왕지, 양생=장생)는 같은 글리프. 미상은 ''.
 */
const TWELVE_STAGE_HANJA: Record<string, string> = {
  장생: '長生',
  양생: '長生',
  목욕: '沐浴',
  관대: '冠帶',
  임관: '臨官',
  건록: '臨官',
  왕지: '帝旺',
  제왕: '帝旺',
  쇠: '衰',
  병: '病',
  사: '死',
  묘: '墓',
  절: '絶',
  태: '胎',
  양: '養',
}
export function twelveStageHanja(stage: string): string {
  return TWELVE_STAGE_HANJA[stage] ?? ''
}

/**
 * 응용격국 8종 — EN 이름 + 한 줄 뜻. KO 는 데이터의 korean/rule 을 그대로 쓰고,
 * EN 은 rule 이 한글뿐이라 여기 고정 글로스를 쓴다(EN 누출 방지).
 * 키 = 추출기 패턴 id(saju-applied-pattern APPLIED_PATTERN_IDS) 그대로. 예전 키는
 * 'gwanin-sangsaeng'·'jaesaeng-gwan' 처럼 철자가 달라 8개 중 2개만 맞았고 bigeop-talchae 는
 * 아예 없었다(재감사 SI-3) — 테스트가 추출기 id 전부를 잠근다.
 */
export const APPLIED_PATTERN_EN: Record<string, { name: string; gloss: string }> = {
  'sanggwan-gyeon-gwan': {
    name: 'Hurting Officer meets Officer',
    gloss: 'talent rubs against rules — friction with authority',
  },
  'siksin-jesal': {
    name: 'Eating God controls the Killing',
    gloss: 'creative output tames pressure — stress turned productive',
  },
  'gwan-in-sangsaeng': {
    name: 'Officer feeds Resource',
    gloss: 'authority and learning reinforce — status through study',
  },
  'jae-saeng-gwan': {
    name: 'Wealth generates Officer',
    gloss: 'resources build standing — money supports position',
  },
  'in-saeng-bigeop': {
    name: 'Resource feeds Peers',
    gloss: 'support strengthens the self and allies',
  },
  'bigeop-talchae': {
    name: 'Peers rob Wealth',
    gloss: 'rivals and expenses drain resources — guard money',
  },
  'gwan-sal-honjap': {
    name: 'Officer and Killing mixed',
    gloss: 'conflicting demands from authority — keep boundaries clear',
  },
  'hyo-sik-tal': {
    name: 'Indirect Resource steals the Eating God',
    gloss: 'over-thinking smothers output — just ship it',
  },
}

/**
 * 응용격국 EN — 패턴 id 또는 신호 id('saju.applied-pattern.<패턴 id>.<YYYY-MM-DD>')를 받는다.
 * 신호 id 를 그대로 넘기는 호출부도 맞게 패턴 id 를 뽑아 찾는다.
 */
export function appliedPatternEn(id: string): { name: string; gloss: string } | undefined {
  const m = /^saju\.applied-pattern\.([^.]+)\./.exec(id)
  return APPLIED_PATTERN_EN[m ? m[1] : id]
}
