/**
 * 궁합 상담사의 개별(self) 신살 블록 — [개별 신살 (self)] / [Personal sinsal (self)] 한 사람 한 줄.
 * (compatibility/counselor 라우트에서 옮김 — 라우트 파일은 GET/POST 같은 정해진 이름만 내보낸다.)
 *
 * EN 이름은 정본 SHINSAL_NAME_EN(shinsalNameEn) — 'Blade Edge' · 'Spirit Gate' 처럼 Life · 상담사 ·
 * 캘린더와 같은 이름. 예전엔 'Yangin' · 'Gwimun' 음역을 따로 썼다(G14 후속).
 */

import { shinsalNameEn } from '@/lib/calendar-engine/derivers/signalI18n'

// 개별(self) 신살 — 각자 타고난 신살은 extras.shinsal에 이미 계산돼 있으나
// self 블록이 voided라 궁합 프롬프트엔 안 들어가던 신호. 단, 전부 쏟으면
// 다시 노이즈가 되므로 *관계 해석에 유효한 특수 신살만* 화이트리스트로
// 큐레이션 + 짧은 뜻을 붙인다. 12신살(자리)은 synastry [12신살] cross가,
// 도화·홍염살·백호·괴강·천을귀인은 sajuSynastryFormatter 의 신살 cross
// 블록이 양방향 deterministic 으로 다루므로 self 중복 제거 — 여기엔
// 오직 *cross 가 없는* personality-only 신살만 남긴다.
const PILLAR_KO: Record<string, string> = { year: '년', month: '월', day: '일', time: '시' }
/** cross 가 없는 personality 신살(화이트리스트) — 이름 → 짧은 뜻(KO). */
export const PERSONAL_SHINSAL_KEEP: Readonly<Record<string, string>> = {
  양인: '날카로움·과격',
  귀문관: '집착·예민',
  원진: '미묘한 반감',
  고신: '고독 기질',
  금여성: '배우자 복·기품',
  천덕귀인: '보호·덕',
  월덕귀인: '보호·덕',
}
// EN: 한국어 신살명 대신 정본 EN 이름(SHINSAL_NAME_EN — 'Blade Edge' · 'Spirit Gate' …, 음역
// 'Yangin' · 'Gwimun' 아님) + 짧은 영어 뜻 (영어 응답 누수 방지, 다른 화면 · 상담사와 같은 이름).
const PILLAR_EN: Record<string, string> = { year: 'Y', month: 'M', day: 'D', time: 'H' }
const PERSONAL_SHINSAL_MEAN_EN: Record<string, string> = {
  양인: 'sharp, aggressive',
  귀문관: 'obsessive, sensitive',
  원진: 'subtle aversion',
  고신: 'solitary streak',
  금여성: 'spouse fortune, grace',
  천덕귀인: 'protection, virtue',
  월덕귀인: 'protection, virtue',
}

export function formatPersonalShinsal(
  label: string,
  shinsal: unknown,
  lang: 'ko' | 'en' = 'ko'
): string | null {
  if (!Array.isArray(shinsal) || shinsal.length === 0) return null
  const en = lang === 'en'
  const byKind = new Map<string, Set<string>>()
  for (const raw of shinsal) {
    const h = raw as { kind?: string; pillars?: string[] }
    if (!h?.kind || !(h.kind in PERSONAL_SHINSAL_KEEP)) continue
    const set = byKind.get(h.kind) ?? new Set<string>()
    for (const p of h.pillars ?? []) set.add((en ? PILLAR_EN[p] : PILLAR_KO[p]) ?? p)
    byKind.set(h.kind, set)
  }
  if (byKind.size === 0) return null
  const parts = [...byKind.entries()].map(([kind, ps]) => {
    const loc = [...ps].join('·')
    if (en) {
      const nm = shinsalNameEn(kind) ?? kind
      const mn = PERSONAL_SHINSAL_MEAN_EN[kind] ?? ''
      return `${nm}(${loc ? `${loc}, ` : ''}${mn})`
    }
    return `${kind}(${loc ? `${loc}, ` : ''}${PERSONAL_SHINSAL_KEEP[kind]})`
  })
  return `${label}: ${parts.join(' · ')}`
}
