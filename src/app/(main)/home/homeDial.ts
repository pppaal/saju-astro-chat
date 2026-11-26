/**
 * 홈 60갑자 다이얼 + 카드 뒷면 세운 — 서버에서만 만든다(page.tsx).
 *
 * sixtyDial 은 절입 표(periodPillars → saju/constants)를 끌고 오므로 클라이언트 번들에 넣지
 * 않는다: 서버가 모델(좌표 · 라벨 문자열)만 만들어 넘기고, 클라이언트는 그리기만 한다.
 * 언어 토글이 새로고침 없이 바뀌므로 ko/en 두 벌을 함께 만든다.
 *
 * '지금' 세운은 보는 사람 시간대의 민용 날짜로 정한다(오너 결정 17 — 立春 이 든 그날부터
 * 새 세운): page.tsx 가 요청의 시간대(x-vercel-ip-timezone)를 넘기고, 없거나 깨졌으면
 * dialModel 의 규칙대로 UTC 다. 카드 뒷면 세운(backYear)도 같은 모델의 now 에서 읽어
 * 다이얼 가운데와 언제나 같은 해다. 시계를 읽지 않는다 — now 는 호출자가 넘긴다.
 */

import 'server-only'
import { dialModel, type DialModel } from '@/lib/v9/sixtyDial'
import type { Lang } from '@/lib/i18n/bi'
import { SAMPLE_DIAL } from './sampleCard'

export interface HomeDial {
  /** 다이얼 모델 — 언어별 라벨. */
  dial: Record<Lang, DialModel>
  /** 카드 뒷면 세운 — 다이얼 가운데와 같은 해. */
  backYear: { ganji: string; year: number }
}

export function buildHomeDial(input: { now: Date; timeZone?: string | null }): HomeDial {
  const base = {
    nowDate: input.now,
    timeZone: input.timeZone ?? null,
    bornYear: SAMPLE_DIAL.bornYear,
    turn: SAMPLE_DIAL.turn ? { year: SAMPLE_DIAL.turn.year } : null,
  }
  const en = dialModel({ ...base, locale: 'en' })
  const ko = dialModel({ ...base, locale: 'ko' })
  return {
    dial: { en, ko },
    backYear: { ganji: `${en.now.stem}${en.now.branch}`, year: en.now.sajuYear },
  }
}
