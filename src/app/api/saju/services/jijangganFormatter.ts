// src/app/api/saju/services/jijangganFormatter.ts
// 지장간 포매터 함수들

import type { JGItem, JijangganAny } from '@/types/saju-api'
import { STEMS } from '@/lib/saju/constants'
import { getSibseong } from '@/lib/saju/core/sibsin'

// Record type guard
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export const toJGItem = (value: unknown): JGItem | undefined => {
  if (!value) {
    return undefined
  }
  if (typeof value === 'string') {
    return { name: value }
  }
  if (isRecord(value)) {
    const name = typeof value.name === 'string' ? value.name : undefined
    const sibsin = typeof value.sibsin === 'string' ? value.sibsin : undefined
    if (name || sibsin) {
      return { name, sibsin }
    }
  }
  return undefined
}

// Stem name mappings
const HANGUL_TO_HANJA_STEM: Record<string, string> = {
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
}
const HANJA_TO_HANGUL_STEM: Record<string, string> = Object.fromEntries(
  Object.entries(HANGUL_TO_HANJA_STEM).map(([ko, han]) => [han, ko])
)

// 한자 정규화: (한글 → 한자)
export const normalizeStemName = (name?: string) => {
  if (!name) {
    return name
  }
  if (HANJA_TO_HANGUL_STEM[name]) {
    return name
  } // 이미 한자면 그대로
  return HANGUL_TO_HANJA_STEM[name] ?? name // 한글이면 한자로 매핑
}

// 한글로 환원: (한자 → 한글)
export const toHangulStem = (name?: string) => {
  if (!name) {
    return name
  }
  if (HANGUL_TO_HANJA_STEM[name]) {
    return name
  } // 이미 한글이면 그대로
  return HANJA_TO_HANGUL_STEM[name] ?? name // 한자면 한글로 매핑
}

// 무엇이 오든 {chogi,junggi,jeonggi} 객체로
export const coerceJijanggan = (
  raw: JijangganAny
): { chogi?: JGItem; junggi?: JGItem; jeonggi?: JGItem } => {
  if (!raw) {
    return {}
  }
  if (isRecord(raw)) {
    return {
      chogi: toJGItem(raw.chogi),
      junggi: toJGItem(raw.junggi),
      jeonggi: toJGItem(raw.jeonggi),
    }
  }
  const arr: JGItem[] = Array.isArray(raw)
    ? raw.map((x) => (typeof x === 'object' ? x : { name: String(x) }))
    : String(raw)
        .split('')
        .filter(Boolean)
        .map((ch) => ({ name: ch }))
  return { chogi: arr[0], junggi: arr[1], jeonggi: arr[2] }
}

// 십신은 core/sibsin getSibseong 단일 소스(CONVENTIONS §7). 예전 이 파일의 손 표는
// 100칸 중 20칸의 음양이 뒤집혀 있었다(SD-15).
const stemInfo = (name?: string) => (name ? STEMS.find((s) => s.name === name) : undefined)

// 지장간에 십신 보강
export const enrichSibsin = (
  jg: { chogi?: JGItem; junggi?: JGItem; jeonggi?: JGItem },
  dayMasterStem: string
) => {
  const dm = stemInfo(normalizeStemName(dayMasterStem))
  if (!dm) {
    return jg
  }
  for (const key of ['chogi', 'junggi', 'jeonggi'] as const) {
    const it = jg[key]
    if (it && it.name) {
      const stemName = normalizeStemName(it.name)
      if (!stemName) {
        continue
      }
      const target = stemInfo(stemName)
      if (!it.sibsin && target) {
        it.sibsin = getSibseong(dm, target)
      }
      it.name = stemName // 한자 통일
    }
  }
  return jg
}

// 원문 문자열/배열 생성(한글로)
export const buildJijangganRaw = (raw: JijangganAny) => {
  if (typeof raw === 'string') {
    const list = raw.split('').filter(Boolean)
    return { raw, list }
  }
  if (Array.isArray(raw)) {
    const list = raw.map((v) => (typeof v === 'string' ? v : (v?.name ?? ''))).filter(Boolean)
    return { raw: list.join(''), list }
  }
  if (isRecord(raw)) {
    const keys = ['chogi', 'junggi', 'jeonggi'] as const
    const list = keys
      .map((k) => {
        const v = raw[k]
        if (!v) {
          return ''
        }
        const name =
          typeof v === 'string' ? v : isRecord(v) && typeof v.name === 'string' ? v.name : ''
        return toHangulStem(name)
      })
      .filter(Boolean)
    return { raw: list.join(''), list }
  }
  return { raw: '', list: [] as string[] }
}
