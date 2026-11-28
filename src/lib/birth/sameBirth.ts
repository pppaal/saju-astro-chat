/**
 * 화면에 그린 본명이 이 기기에 저장된 본명(getStoredBirthInfo)과 같은 사람인가.
 *
 * 상담사 CTA 는 저장된 본명으로 상담을 연다. 그래서 다른 사람의 차트(?date=… override 보기)에서
 * 그 차트의 판단(PUSH · HOLD 날짜)을 담은 질문을 실으면, 유료 상담이 남의 엔진 결과를 전제로 돈다.
 * 두 본명이 같을 때만 차트 질문을 쓰고, 아니면 일반 질문으로 돌린다(QA-8).
 *
 * 비교: 날짜 · 성별 · 시각(시각 미상 여부, 알면 HH:MM) · 출생지(둘 다 좌표가 있으면 좌표, 둘 다 없으면
 * 타임존). 한쪽만 좌표가 있으면 다른 본명으로 본다(차트의 ASC · 하우스가 달라진다).
 */

import { resolveBirthTimeAnchor } from '@/lib/saju/birthTimeAnchor'
import type { StoredBirthInfo } from './storage'

/** 화면에 그린 본명 — 출생지 미상이면 좌표를 싣지 않는다. */
export interface BirthSubject {
  birthDate: string
  /** 계산 앵커 HH:MM — 시각 미상이면 비교하지 않는다. */
  birthTime: string
  timeUnknown: boolean
  gender: 'male' | 'female'
  latitude?: number
  longitude?: number
  timeZone?: string
}

/** 좌표 허용 오차 — URL 왕복(String(number) → Number)은 정확하고, 도시 선택기는 소수 4자리 이상. */
const COORD_EPS = 1e-4

function hm(t: string): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

const hasCoords = (lat: unknown, lng: unknown): boolean =>
  typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)

export function isSameBirth(subject: BirthSubject, stored: StoredBirthInfo | null): boolean {
  if (!stored) return false
  if (stored.birthDate !== subject.birthDate) return false
  if (stored.gender !== subject.gender) return false

  const anchor = resolveBirthTimeAnchor(stored.birthTime, stored.birthTimeUnknown)
  if (anchor.timeUnknown !== subject.timeUnknown) return false
  if (!subject.timeUnknown && hm(anchor.time) !== hm(subject.birthTime)) return false

  const subjectCoords = hasCoords(subject.latitude, subject.longitude)
  const storedCoords = hasCoords(stored.latitude, stored.longitude)
  if (subjectCoords !== storedCoords) return false
  if (subjectCoords) {
    return (
      Math.abs((subject.latitude as number) - (stored.latitude as number)) <= COORD_EPS &&
      Math.abs((subject.longitude as number) - (stored.longitude as number)) <= COORD_EPS
    )
  }
  if (subject.timeZone && stored.timeZone) return subject.timeZone === stored.timeZone
  return true
}
