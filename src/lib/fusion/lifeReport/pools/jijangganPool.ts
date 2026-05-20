// src/lib/fusion/lifeReport/pools/jijangganPool.ts
//
// 지장간 (hidden stems inside a branch) variation pool.
//
// Source: src/lib/saju/constants.ts → JIJANGGAN
// 12 branches → 1-3 hidden stems each (여기 / 중기 / 정기).
//
// The 정기 (main qi) is what's "officially" represented by the branch;
// 여기 (residual qi) is the energy carried over from the previous month;
// 중기 (middle qi) is the transitional thread. 자평진전·삼명통회 use
// these as the deep structural layer beneath surface 사주 readings.
//
// LifeReport surface today only shows the day branch as a single letter.
// This pool exposes the inner 3-stem structure as a "root energy" line.
//
// 12 branches × 3-7 framings = 36-84 variations (small pool — branch is
// only 12 keys, so we keep framings sparse to avoid mechanical feel).

import { JIJANGGAN } from '@/lib/saju/constants'

// 천간 → 한글 음 + 오행 자연 descriptor (ko/en). jijangganLine 은 raw 한자
// 대신 자연어 element 만 노출 — 일반 사용자도 읽히게.
const STEM_VOICE: Record<string, { ko: string; element: string; elementEn: string }> = {
  甲: { ko: '갑목', element: '큰 나무', elementEn: 'a great tree' },
  乙: { ko: '을목', element: '여린 풀', elementEn: 'tender grass' },
  丙: { ko: '병화', element: '태양', elementEn: 'the sun' },
  丁: { ko: '정화', element: '촛불', elementEn: 'a candle flame' },
  戊: { ko: '무토', element: '넓은 땅', elementEn: 'broad earth' },
  己: { ko: '기토', element: '밭의 흙', elementEn: 'field soil' },
  庚: { ko: '경금', element: '큰 쇠', elementEn: 'strong metal' },
  辛: { ko: '신금', element: '보석', elementEn: 'a jewel' },
  壬: { ko: '임수', element: '큰 물', elementEn: 'a great water' },
  癸: { ko: '계수', element: '이슬', elementEn: 'morning dew' },
}

export interface JijangganPart {
  position: '여기' | '중기' | '정기'
  stem: string
  stemKo: string
  flavor: string
  flavorEn: string
}

/**
 * Decompose a branch into its hidden stems. Returns an empty array for
 * an unknown branch — callers should treat the result as additive.
 */
export function getJijanggan(branch: string | undefined): JijangganPart[] {
  if (!branch) return []
  const entry = JIJANGGAN[branch]
  if (!entry) return []
  const out: JijangganPart[] = []
  for (const pos of ['여기', '중기', '정기'] as const) {
    const stem = entry[pos]
    if (!stem) continue
    const voice = STEM_VOICE[stem]
    if (!voice) continue
    out.push({
      position: pos,
      stem,
      stemKo: voice.ko,
      flavor: voice.element,
      flavorEn: voice.elementEn,
    })
  }
  return out
}

/**
 * Format a branch's hidden-stem structure as one Korean / English line.
 *
 * "당신의 일지 卯 깊은 곳엔 정기 乙(을목)의 결 — 여린 풀의 에너지가
 * 중심에 자리해요."
 *
 * Returns empty string when the branch is unknown.
 */
export function jijangganLine(branch: string | undefined, lang: 'ko' | 'en'): string {
  const parts = getJijanggan(branch)
  if (parts.length === 0) return ''
  const main = parts.find((p) => p.position === '정기')
  if (!main) return ''
  const others = parts.filter((p) => p.position !== '정기')
  if (lang === 'ko') {
    const mainLine = `겉으론 잘 안 드러나지만 **${main.flavor}**의 기운이 중심에 자리해요`
    if (others.length === 0) {
      return `당신 안쪽 깊은 곳엔 ${mainLine}.`
    }
    const otherLine = others.map((p) => p.flavor).join(' · ')
    return `당신 안쪽 깊은 곳엔 ${mainLine}. 그 곁엔 ${otherLine}의 결도 함께 흘러요.`
  }
  const mainLine = `**${main.flavorEn}** sits quietly at the centre, beneath the surface`
  if (others.length === 0) {
    return `Deep inside you, ${mainLine}.`
  }
  const otherLine = others.map((p) => p.flavorEn).join(' · ')
  return `Deep inside you, ${mainLine}. Alongside it run ${otherLine}.`
}
