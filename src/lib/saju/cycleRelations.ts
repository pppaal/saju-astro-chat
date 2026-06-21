/**
 * 운(대운/세운/월운/일운) 갑자 조립 + 운끼리 충·합·형 관계 — 엔진 공용.
 *
 * 캘린더 v3(yearlyDates)에서 추출. 점수 로직과 무관한 순수 사주 갑자 math라
 * v3·v2 어느 엔진에서든 같은 결과로 재사용한다. DailyFlowCard의 "대운/세운/
 * 월운/일진 흐름"과 "충/합/형" 칩이 이 모듈 한 곳에서 나온다.
 */

import { getSibseong } from './core/sibsin'
import type { FiveElement } from './types'
import {
  STEM_COMBINE,
  STEM_CLASH_4,
  SIX_HARMONY,
  BRANCH_CLASH,
  HARM_PAIRS,
  BREAK_PAIRS,
  PUNISHMENT_TRIOS,
  PUNISHMENT_PAIR,
  THREE_HARMONY,
  DIRECTIONAL_HARMONY,
  RESENTMENT_PAIRS,
  toBidiRecord,
  toPairKeySet,
} from './relationTables'

// ── 천간/지지 기본 ──
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const STEM_YIN: Record<string, boolean> = {
  甲: false,
  乙: true,
  丙: false,
  丁: true,
  戊: false,
  己: true,
  庚: false,
  辛: true,
  壬: false,
  癸: true,
}
const STEM_TO_KO_ELEMENT: Record<string, string> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}
const BRANCHES_BY_INDEX = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// ── 관계 상수 — relationTables.ts(SSOT)에서 파생. 로컬 복제 금지. ──
const STEM_HAP_PARTNER: Record<string, { partner: string; transform: string }> = (() => {
  const r: Record<string, { partner: string; transform: string }> = {}
  for (const { pair, element } of STEM_COMBINE) {
    r[pair[0]] = { partner: pair[1], transform: element }
    r[pair[1]] = { partner: pair[0], transform: element }
  }
  return r
})()
const STEM_CHUNG_SET = toPairKeySet(STEM_CLASH_4)
const BRANCH_HAP_PARTNER: Record<string, string> = toBidiRecord(SIX_HARMONY.map((h) => h.pair))
const BRANCH_CHUNG_PARTNER: Record<string, string> = toBidiRecord(BRANCH_CLASH)
const BRANCH_HAE_PAIRS = toPairKeySet(HARM_PAIRS)
const BRANCH_PA_PAIRS = toPairKeySet(BREAK_PAIRS)
const BRANCH_HYUNG_TRIO = [...PUNISHMENT_TRIOS[0]]
const BRANCH_HYUNG_TRIO2 = [...PUNISHMENT_TRIOS[1]]
const BRANCH_HYUNG_PAIR = toPairKeySet([PUNISHMENT_PAIR])
// 삼합/방합 — 합화오행·라벨·나열순서는 표시용이라 보존하되, 멤버/오행은 canon에서 파생.
const BRANCH_TRIPLES_SAMHAP: Array<{ members: string[]; result: string; label: string }> = (
  ['목', '화', '금', '수'] as const
).map((el) => {
  const t = THREE_HARMONY.find((x) => x.element === el)!
  return { members: [...t.members], result: el, label: `${t.members.join('')} ${el} 삼합` }
})
const BANGHAP_SEASON: Record<string, string> = { 목: '봄', 화: '여름', 금: '가을', 수: '겨울' }
const BRANCH_TRIPLES_BANGHAP: Array<{ members: string[]; result: string; label: string }> =
  DIRECTIONAL_HARMONY.map((d) => ({
    members: [...d.members],
    result: d.element,
    label: `${d.members.join('')} ${BANGHAP_SEASON[d.element]} 방합`,
  }))
const BRANCH_WONJIN_PAIRS = toPairKeySet(RESENTMENT_PAIRS)

// ── 십신 (본명 일간 기준 상대 십신) ──
// SSOT: 정본 getSibseong(core/sibsin) 에 위임. 이전엔 인덱스 연산으로 직접 구현했으나
// 전 100조합 대조 결과 정본과 동일 — 출처 둘로 갈리지 않게 위임으로 통일.
// (이 함수는 천간 한자를 받으므로 stem→{element,yin_yang} 매핑만 여기서 한다.)
export function getSibsinKo(dayStem: string, targetStem: string): string {
  const dayEl = STEM_TO_KO_ELEMENT[dayStem]
  const tEl = STEM_TO_KO_ELEMENT[targetStem]
  if (!dayEl || !tEl) return ''
  return getSibseong(
    { element: dayEl as FiveElement, yin_yang: STEM_YIN[dayStem] ? '음' : '양' },
    { element: tEl as FiveElement, yin_yang: STEM_YIN[targetStem] ? '음' : '양' }
  )
}

// ── 운별 갑자 컨텍스트 ──
export interface SewoonContext {
  ganji: string
  year: number
  sibsinStem: string
}
export interface GanjiSibsin {
  ganji: string
  sibsinStem: string
}

/** 세운 — 그 해 60갑자. */
export function sewoonForYear(yr: number, natalDayMaster: string): SewoonContext {
  const idx60 = (yr - 4 + 6000) % 60
  const stem = STEMS[idx60 % 10]
  const branch = BRANCHES_BY_INDEX[idx60 % 12]
  const sibsinStem = natalDayMaster && stem ? getSibsinKo(natalDayMaster, stem) : ''
  return { ganji: `${stem}${branch}`, year: yr, sibsinStem }
}

/** 월운 — 절기 기반 월주(stem/branch)에서 조립. */
export function wolwoonFromPillar(
  monthStem: string,
  monthBranch: string,
  natalDayMaster: string
): GanjiSibsin {
  const sibsinStem = natalDayMaster && monthStem ? getSibsinKo(natalDayMaster, monthStem) : ''
  return { ganji: `${monthStem}${monthBranch}`, sibsinStem }
}

// ── 운끼리 충/합/형 ──
export type CycleInteractionKind =
  | '천간합'
  | '천간충'
  | '지지합'
  | '지지충'
  | '지지형'
  | '지지해'
  | '지지파'
  | '자형'
export interface CycleInteraction {
  pair: string
  kind: CycleInteractionKind
  blurb: string
}
interface CycleSlot {
  id: string
  label: string
  stem: string
  branch: string
}

function interactionFor(a: CycleSlot, b: CycleSlot): CycleInteraction[] {
  const out: CycleInteraction[] = []
  const pair = `${a.label}↔${b.label}`
  if (a.stem && b.stem && STEM_HAP_PARTNER[a.stem]?.partner === b.stem) {
    out.push({
      pair,
      kind: '천간합',
      blurb: `${a.label}(${a.stem})과 ${b.label}(${b.stem})이 천간합 — 두 흐름이 부드럽게 묶입니다.`,
    })
  }
  if (a.stem && b.stem && STEM_CHUNG_SET.has(`${a.stem}-${b.stem}`)) {
    out.push({
      pair,
      kind: '천간충',
      blurb: `${a.label}(${a.stem})과 ${b.label}(${b.stem})이 천간충 — 결정 압박이 크게 들어옵니다.`,
    })
  }
  if (a.branch && b.branch && BRANCH_HAP_PARTNER[a.branch] === b.branch && a.branch !== b.branch) {
    out.push({
      pair,
      kind: '지지합',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 지지합 — 환경이 손발 맞춰 돕습니다.`,
    })
  }
  if (a.branch && b.branch && BRANCH_CHUNG_PARTNER[a.branch] === b.branch) {
    out.push({
      pair,
      kind: '지지충',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 지지충 — 환경 변동·이동·교체 신호.`,
    })
  }
  const inTrio = (set: string[]) =>
    set.includes(a.branch) && set.includes(b.branch) && a.branch !== b.branch
  if (
    a.branch &&
    b.branch &&
    (inTrio(BRANCH_HYUNG_TRIO) ||
      inTrio(BRANCH_HYUNG_TRIO2) ||
      BRANCH_HYUNG_PAIR.has(`${a.branch}-${b.branch}`))
  ) {
    out.push({
      pair,
      kind: '지지형',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 형 — 마찰·구설·실수 노출 주의.`,
    })
  }
  if (a.branch && b.branch && BRANCH_HAE_PAIRS.has(`${a.branch}-${b.branch}`)) {
    out.push({
      pair,
      kind: '지지해',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 해 — 오해·관계 균열 주의.`,
    })
  }
  if (a.branch && b.branch && BRANCH_PA_PAIRS.has(`${a.branch}-${b.branch}`)) {
    out.push({
      pair,
      kind: '지지파',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 파 — 진행 중인 일이 살짝 어긋날 수 있어요.`,
    })
  }
  return out
}

/** 본명·대운·세운·월운·일운 다섯 슬롯의 pairwise 충/합/형/해/파/원진 + 삼합/방합. */
export function buildCycleInteractions(
  natalDayMaster: string,
  natalDayBranch: string,
  daeun: { ganji: string } | null,
  sewoon: { ganji: string },
  wolwoon: { ganji: string },
  iljin: { ganji: string }
): CycleInteraction[] | undefined {
  const split = (g: string): { stem: string; branch: string } => ({
    stem: g.charAt(0) || '',
    branch: g.charAt(1) || '',
  })
  const slots: CycleSlot[] = [
    { id: 'natal', label: '본명', stem: natalDayMaster, branch: natalDayBranch },
    ...(daeun ? [{ id: 'daeun', label: '대운', ...split(daeun.ganji) }] : []),
    { id: 'sewoon', label: '세운', ...split(sewoon.ganji) },
    { id: 'wolwoon', label: '월운', ...split(wolwoon.ganji) },
    { id: 'iljin', label: '일운', ...split(iljin.ganji) },
  ]
  const out: CycleInteraction[] = []
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      out.push(...interactionFor(slots[i], slots[j]))
    }
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]
      const b = slots[j]
      if (a.branch && b.branch && BRANCH_WONJIN_PAIRS.has(`${a.branch}-${b.branch}`)) {
        out.push({
          pair: `${a.label}↔${b.label}`,
          kind: '지지해', // 원진은 의미상 해와 비슷한 마찰 — UI는 같은 카드로
          blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 원진 — 감정적 거리·미묘한 신경전.`,
        })
      }
    }
  }
  const allBranches = slots.map((s) => s.branch).filter(Boolean)
  for (const trio of [...BRANCH_TRIPLES_SAMHAP, ...BRANCH_TRIPLES_BANGHAP]) {
    const present = trio.members.filter((m) => allBranches.includes(m))
    if (present.length === 3) {
      const involved = slots
        .filter((s) => trio.members.includes(s.branch))
        .map((s) => s.label)
        .join(', ')
      const isSamhap = BRANCH_TRIPLES_SAMHAP.includes(trio)
      out.push({
        pair: involved,
        kind: '지지합',
        blurb: `${trio.label} 완성 (${involved}) — ${trio.result} 기운으로 강하게 묶이는 ${isSamhap ? '삼합' : '방합'} 흐름.`,
      })
    }
  }
  return out.length > 0 ? out : undefined
}
