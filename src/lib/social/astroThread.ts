// src/lib/social/astroThread.ts
//
// "오늘의 하늘" Threads 게시물 — 생일 없이 그날 모두에게 공통인 점성 콘텐츠.
// 두 가지 결정론 신호만 쓴다(둘 다 Swiss Ephemeris 불필요 → cron 가볍고 무료):
//   - 태양 별자리 시즌: 날짜 구간으로 정확히 결정(트로피컬).
//   - 달 위상: 삭망월(29.53일) 근사 — 소셜 한 줄엔 충분. 정밀 달자리/트랜짓은
//     본 엔진(calculateTransitChart)으로 추후 업그레이드 가능.
// 문구는 결정론 템플릿(달 위상 무드). CTA 는 무료 퍼널(/free).

import { siteBaseUrl } from '@/lib/tarot/shareLink'
import type { ThreadSlot } from './tarotThread'
import { kstYmd, type ThreadPost } from './threadTypes'

interface Sign {
  ko: string
  en: string
}

// 트로피컬 태양 별자리 — [시작월, 시작일] 이상이면 그 별자리(끝은 다음 시작 전날).
const ZODIAC: Array<{ from: [number, number]; sign: Sign }> = [
  { from: [1, 20], sign: { ko: '물병자리', en: 'Aquarius' } },
  { from: [2, 19], sign: { ko: '물고기자리', en: 'Pisces' } },
  { from: [3, 21], sign: { ko: '양자리', en: 'Aries' } },
  { from: [4, 20], sign: { ko: '황소자리', en: 'Taurus' } },
  { from: [5, 21], sign: { ko: '쌍둥이자리', en: 'Gemini' } },
  { from: [6, 21], sign: { ko: '게자리', en: 'Cancer' } },
  { from: [7, 23], sign: { ko: '사자자리', en: 'Leo' } },
  { from: [8, 23], sign: { ko: '처녀자리', en: 'Virgo' } },
  { from: [9, 23], sign: { ko: '천칭자리', en: 'Libra' } },
  { from: [10, 23], sign: { ko: '전갈자리', en: 'Scorpio' } },
  { from: [11, 22], sign: { ko: '사수자리', en: 'Sagittarius' } },
  { from: [12, 22], sign: { ko: '염소자리', en: 'Capricorn' } },
]

function sunSign(month: number, day: number): Sign {
  // 12월 22일~1월 19일 = 염소자리(연 경계 래핑).
  let current: Sign = { ko: '염소자리', en: 'Capricorn' }
  for (const z of ZODIAC) {
    const [fm, fd] = z.from
    if (month > fm || (month === fm && day >= fd)) current = z.sign
  }
  return current
}

interface Phase {
  ko: string
  en: string
  emoji: string
  vibe: { ko: string; en: string }
}

const PHASES: Phase[] = [
  {
    ko: '신월',
    en: 'New Moon',
    emoji: '🌑',
    vibe: { ko: '새로 씨앗을 심기 좋은 흐름.', en: 'A moment to plant new intentions.' },
  },
  {
    ko: '초승달',
    en: 'Waxing Crescent',
    emoji: '🌒',
    vibe: { ko: '시작한 일을 살며시 키워가는 흐름.', en: 'Nurture what you just began.' },
  },
  {
    ko: '상현달',
    en: 'First Quarter',
    emoji: '🌓',
    vibe: { ko: '결정하고 밀어붙이기 좋은 흐름.', en: 'Decide and push forward.' },
  },
  {
    ko: '차오르는 볼록달',
    en: 'Waxing Gibbous',
    emoji: '🌔',
    vibe: { ko: '다듬고 끌어올리는 흐름.', en: 'Refine and build momentum.' },
  },
  {
    ko: '보름달',
    en: 'Full Moon',
    emoji: '🌕',
    vibe: { ko: '결실과 감정이 차오르는 흐름.', en: 'Culmination — feelings run full.' },
  },
  {
    ko: '기우는 볼록달',
    en: 'Waning Gibbous',
    emoji: '🌖',
    vibe: { ko: '나누고 감사하기 좋은 흐름.', en: 'Share and give thanks.' },
  },
  {
    ko: '하현달',
    en: 'Last Quarter',
    emoji: '🌗',
    vibe: { ko: '내려놓고 정리하는 흐름.', en: 'Release and let go.' },
  },
  {
    ko: '그믐달',
    en: 'Waning Crescent',
    emoji: '🌘',
    vibe: { ko: '비우고 쉬어가는 흐름.', en: 'Empty out and rest.' },
  },
]

// 삭망월 근사 — 기준 삭(2000-01-06 18:14 UTC)에서 경과일 / 29.530588853.
const SYNODIC_DAYS = 29.530588853
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0)

function moonPhase(now: Date): Phase {
  const days = (now.getTime() - REFERENCE_NEW_MOON_MS) / 86_400_000
  let frac = (days % SYNODIC_DAYS) / SYNODIC_DAYS
  if (frac < 0) frac += 1
  // 8등분 — 경계를 1/16 씩 이동해 각 위상이 중앙에 오게.
  const idx = Math.floor((frac + 1 / 16) * 8) % 8
  return PHASES[idx]
}

const HASHTAGS: Record<'ko' | 'en', string[]> = {
  ko: ['#별자리운세', '#점성술', '#오늘의하늘', '#별자리', '#오늘의운세', '#호로스코프'],
  en: ['#horoscope', '#astrology', '#zodiac', '#dailyhoroscope', '#moon', '#stars'],
}

const GREETING: Record<'ko' | 'en', string> = {
  ko: '✨ 오늘의 하늘',
  en: '✨ Today’s sky',
}

export function buildAstroThreadPost(
  slot: ThreadSlot,
  locale: 'ko' | 'en' = 'ko',
  now: Date = new Date()
): ThreadPost {
  const { month, day } = kstYmd(now)
  const sign = sunSign(month, day)
  const phase = moonPhase(now)
  const base = siteBaseUrl()

  const caption =
    locale === 'ko'
      ? [
          GREETING.ko,
          `${sign.ko} 시즌 · ${phase.ko} ${phase.emoji}`,
          '',
          phase.vibe.ko,
          '',
          `🔗 내 별자리 운세 무료로 보기 → ${base}/free`,
        ].join('\n')
      : [
          GREETING.en,
          `${sign.en} season · ${phase.en} ${phase.emoji}`,
          '',
          phase.vibe.en,
          '',
          `🔗 Read your own horoscope, free → ${base}/free`,
        ].join('\n')

  return {
    topic: 'astro',
    slot,
    locale,
    summary: `${sign.ko}·${phase.ko}`,
    caption,
    hashtags: HASHTAGS[locale],
  }
}
