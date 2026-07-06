/* ============================================================
   assembleUserSummary — NatalContext → DestinyUserSummary 매핑.
   ───────────────────────────────────────────────────────────
   assembleTiers 의 user 블록을 함수로 분리한 것. 두 소비자:
     · assembleTiers   (/calendar — 월/일 티어 스택)
     · assembleLifetime (/destiny — 인생 흐름 단독, 연 셀 없음)
   같은 매핑이 같은 user 를 만들므로 두 surface 의 본명 요약이 어긋나지 않는다.
   ============================================================ */

import { toUser } from '@/components/calendar/adapters'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { DestinyUserSummary } from '@/types/calendar'

export type AssembledUser = DestinyUserSummary & {
  gyeokgukStatus?: string
  rootStatus?: string
}

export function assembleUserSummary(
  natal: NatalContext,
  opts: { birthDisplay: string; place: string; sex: '남' | '여'; intro?: string }
): AssembledUser {
  const userBase = toUser(natal, {
    birthDisplay: opts.birthDisplay,
    place: opts.place,
    sex: opts.sex,
    intro: opts.intro,
  })
  return {
    birth: userBase.birth,
    birthKo: userBase.birthKo,
    place: userBase.place,
    sex: userBase.sex === '남' || userBase.sex === '여' ? userBase.sex : '남',
    ilgan: {
      hanja: userBase.ilgan.hanja,
      kr: userBase.ilgan.kr,
      en: userBase.ilgan.en,
      element: userBase.ilgan.element as DestinyUserSummary['ilgan']['element'],
    },
    yongsin: {
      hanja: userBase.yongsin.hanja,
      kr: userBase.yongsin.kr,
      en: userBase.yongsin.en,
      primary: natal.saju.yongsin.primary,
      secondary: natal.saju.yongsin.secondary,
      avoid: natal.saju.yongsin.avoid,
    },
    huisin: {
      hanja: userBase.huisin.hanja,
      kr: userBase.huisin.kr,
      en: userBase.huisin.en,
      primary: natal.saju.yongsin.secondary ?? natal.saju.yongsin.primary,
      avoid: natal.saju.yongsin.avoid,
    },
    gyeokguk: userBase.gyeokguk,
    gyeokgukEn: userBase.gyeokgukEn,
    gangyak: userBase.gangyak,
    dominantSibsin: userBase.dominantSibsin,
    elements: userBase.elements,
    astro: {
      sun: userBase.astro.sun ?? '',
      asc: userBase.astro.asc ?? '',
      mc: userBase.astro.mc ?? '',
      sunEn: userBase.astro.sunEn!,
      ascEn: userBase.astro.ascEn!,
      mcEn: userBase.astro.mcEn!,
    },
    dignities: userBase.dignities,
    almutenFiguris: userBase.almutenFiguris,
    sect: userBase.sectKind,
    lots: userBase.lotsFull,
    intro: userBase.intro,
    introEn: userBase.introEn,
    gyeokgukStatus: userBase.geokgukStatus,
    rootStatus: userBase.rootStatus,
    iljuArchetype: userBase.iljuArchetype,
  }
}
