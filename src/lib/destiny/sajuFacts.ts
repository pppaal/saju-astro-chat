// src/lib/destiny/sajuFacts.ts
//
// "재료 준비실" — 사주 raw 데이터를 한 번에 모으는 순수 계산 layer.
// counselorContext.ts 의 buildSajuSection 이 raw 호출 + 텍스트 포매팅을 한
// 함수에서 했던 것을 분리해, 다른 서비스(통합 리포트 / 운흐름 / 캘린더) 도
// 같은 facts 를 받아 자기 포매팅 자기가 할 수 있게 한다.
//
// 본 모듈은 **포매팅 0**. locale 무관. text 0. JSON-able 객체만 반환.

import { calculateSajuData } from '@/lib/saju/saju'
import { determineYongsin, type YongsinResult } from '@/lib/saju/yongsin'
import { determineGeokguk } from '@/lib/saju/geokguk'
import { calculateStrengthScore } from '@/lib/saju/strengthScore'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'

export interface SajuFactsInput {
  birthDate: string // 'YYYY-MM-DD' (solar)
  birthTime: string // 'HH:MM'
  gender: 'male' | 'female'
  timezone?: string
  longitude?: number
}

/** 사주 4기둥 raw 항목 (천간/지지/십신/지장간 평면). */
export interface SajuPillarFact {
  stem: string
  branch: string
  /** 천간 오행 한글 (木·火·土·金·水) — toSajuPillarsLike 등 element 필요 호출용. */
  stemElement: string
  /** 지지 본기 오행 한글. */
  branchElement: string
  stemSibsin: string | null
  branchSibsin: string | null
  jijanggan: string[] // 지장간 천간 0~3개 (정기, 중기, 여기 순)
}

export interface SajuFacts {
  pillars: Record<'year' | 'month' | 'day' | 'time', SajuPillarFact>
  dayMaster: {
    name: string
    element: string | null
    yinYang: '음' | '양' | null
    rooted: boolean // 지장간 어디에든 일간 오행이 박혀 있으면 true (통근)
  }
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number }
  /** 신강·신약 단순화 라벨. 계산 실패 시 빈 문자열. */
  strength: '신강' | '신약' | ''
  geokguk: string | null
  yongsin: YongsinResult | null
  relations: Array<{ kind: string; detail?: string; pillars?: string[] }>
  /** 정관 AND 편관 같이 있는 관살혼잡 형국. */
  gwansalHonjap: boolean
  /** 대운 (10년 단위) — current 진입 단계 + 전체 리스트. 출생연도 미정 시 null. */
  daeun: {
    current: DaeunEntry | null
    list: DaeunEntry[]
  }
}

export interface DaeunEntry {
  age: number
  heavenlyStem: string
  earthlyBranch: string
  /** 일간 기준 그 단계 천간/지지 십신. 엔진이 null 보낼 수도 있음. */
  sibsin: { cheon: string | null; ji: string | null } | null
}

const STEM_ELEMENT: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토', '己': '토',
  '庚': '금', '辛': '금', '壬': '수', '癸': '수',
}
const BRANCH_ELEMENT: Record<string, string> = {
  '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
  '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수',
}

/**
 * birth 정보로 사주 raw 한 번 계산하고 derived 까지 다 채워서 반환.
 * 운명 LLM context, 통합 리포트, 운흐름 등 어디서나 이 facts 를 받아
 * 자기 포매팅만 하면 됨.
 */
export function collectSajuFacts(input: SajuFactsInput): SajuFacts {
  const tz = input.timezone ?? 'Asia/Seoul'
  // longitude 진태양시 보정. 출생 시간대 + 경도로 본명·운기 모두 동일 기준.
  const raw = calculateSajuData(
    input.birthDate,
    input.birthTime,
    input.gender,
    'solar',
    tz,
    undefined,
    input.longitude,
  ) as unknown as RawSajuShape

  const P = raw.pillars
  const day = P.day.heavenlyStem.name

  // simple 4 기둥 평면 (yongsin / geokguk 입력용)
  const simple = {
    year: { stem: P.year.heavenlyStem.name, branch: P.year.earthlyBranch.name },
    month: { stem: P.month.heavenlyStem.name, branch: P.month.earthlyBranch.name },
    day: { stem: P.day.heavenlyStem.name, branch: P.day.earthlyBranch.name },
    time: { stem: P.time.heavenlyStem.name, branch: P.time.earthlyBranch.name },
  }

  // 신강·신약 단순화 라벨
  let strengthLabel: '신강' | '신약' | '' = ''
  try {
    const s = calculateStrengthScore(raw.pillars as never)
    strengthLabel = ['극강', '강', '중강'].includes(s.level) ? '신강' : '신약'
  } catch {
    /* leave empty */
  }

  // 격국
  let geokguk: string | null = null
  try {
    const g = determineGeokguk(simple as never).primary
    geokguk = g && g !== '미정' ? g : null
  } catch {
    geokguk = null
  }

  // 용신
  let yongsin: YongsinResult | null = null
  try {
    yongsin = determineYongsin(simple as never)
  } catch {
    yongsin = null
  }

  // 합·충·형 관계
  let relations: SajuFacts['relations'] = []
  try {
    relations = analyzeRelations(toAnalyzeInputFromSaju(P as never, day)) as SajuFacts['relations']
  } catch {
    relations = []
  }

  // 관살혼잡 (정관 + 편관 둘 다 있음)
  const allSibsin = (['year', 'month', 'day', 'time'] as const).flatMap((k) => [
    P[k].heavenlyStem.sibsin ?? null,
    P[k].earthlyBranch.sibsin ?? null,
  ])
  const gwansalHonjap = allSibsin.includes('정관') && allSibsin.includes('편관')

  // 통근 — 4기둥 지장간 어디에든 일간 오행이 있으면 true
  const dayEl = STEM_ELEMENT[day] ?? null
  const rooted = dayEl
    ? (['year', 'month', 'day', 'time'] as const).some((k) => {
        const jg = P[k].jijanggan
        return [jg?.chogi?.name, jg?.junggi?.name, jg?.jeonggi?.name].some(
          (s) => !!s && STEM_ELEMENT[s] === dayEl,
        )
      })
    : false

  return {
    pillars: {
      year: pillarToFact(P.year),
      month: pillarToFact(P.month),
      day: pillarToFact(P.day),
      time: pillarToFact(P.time),
    },
    dayMaster: {
      name: raw.dayMaster.name,
      element: raw.dayMaster.element ?? null,
      yinYang: (raw.dayMaster.yin_yang as '음' | '양' | undefined) ?? null,
      rooted,
    },
    fiveElements: {
      wood: raw.fiveElements.wood ?? 0,
      fire: raw.fiveElements.fire ?? 0,
      earth: raw.fiveElements.earth ?? 0,
      metal: raw.fiveElements.metal ?? 0,
      water: raw.fiveElements.water ?? 0,
    },
    strength: strengthLabel,
    geokguk,
    yongsin,
    relations,
    gwansalHonjap,
    daeun: {
      current: raw.daeWoon?.current
        ? {
            age: raw.daeWoon.current.age ?? 0,
            heavenlyStem: raw.daeWoon.current.heavenlyStem ?? '',
            earthlyBranch: raw.daeWoon.current.earthlyBranch ?? '',
            sibsin: raw.daeWoon.current.sibsin
              ? {
                  cheon: raw.daeWoon.current.sibsin.cheon ?? null,
                  ji: raw.daeWoon.current.sibsin.ji ?? null,
                }
              : null,
          }
        : null,
      list: (raw.daeWoon?.list ?? []).map((d) => ({
        age: d.age ?? 0,
        heavenlyStem: d.heavenlyStem ?? '',
        earthlyBranch: d.earthlyBranch ?? '',
        sibsin: d.sibsin
          ? { cheon: d.sibsin.cheon ?? null, ji: d.sibsin.ji ?? null }
          : null,
      })),
    },
  }
}

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────

interface RawSajuPillar {
  heavenlyStem: { name: string; sibsin?: string | null }
  earthlyBranch: { name: string; sibsin?: string | null }
  jijanggan?: {
    chogi?: { name: string }
    junggi?: { name: string }
    jeonggi?: { name: string }
  }
}

interface RawSajuShape {
  pillars: Record<'year' | 'month' | 'day' | 'time', RawSajuPillar>
  dayMaster: { name: string; element?: string; yin_yang?: string }
  fiveElements: { wood?: number; fire?: number; earth?: number; metal?: number; water?: number }
  daeWoon?: {
    current?: {
      heavenlyStem?: string
      earthlyBranch?: string
      age?: number
      sibsin?: { cheon?: string | null; ji?: string | null }
    } | null
    list?: Array<{
      age?: number
      heavenlyStem?: string
      earthlyBranch?: string
      sibsin?: { cheon?: string | null; ji?: string | null }
    }>
  }
}

function pillarToFact(p: RawSajuPillar): SajuPillarFact {
  const jg = p.jijanggan
  const stems: string[] = []
  if (jg?.chogi?.name) stems.push(jg.chogi.name)
  if (jg?.junggi?.name) stems.push(jg.junggi.name)
  if (jg?.jeonggi?.name) stems.push(jg.jeonggi.name)
  return {
    stem: p.heavenlyStem.name,
    branch: p.earthlyBranch.name,
    stemElement: STEM_ELEMENT[p.heavenlyStem.name] ?? '',
    branchElement: BRANCH_ELEMENT[p.earthlyBranch.name] ?? '',
    stemSibsin: p.heavenlyStem.sibsin ?? null,
    branchSibsin: p.earthlyBranch.sibsin ?? null,
    jijanggan: stems,
  }
}
