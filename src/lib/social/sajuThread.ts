// src/lib/social/sajuThread.ts
//
// "오늘의 일진(日辰)" Threads 게시물 — 생일 없이 그날 모두에게 공통인 사주
// 콘텐츠. 일간/일지는 사주 엔진의 단일 소스(computeDayPillarIndices, JDN+49)와
// STEMS/BRANCHES 상수를 그대로 써 본 계산과 어긋나지 않는다. 문구는 결정론
// 템플릿(오행 기운) — LLM 비용 없음. CTA 는 무료 퍼널(/free).

import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { STEMS, BRANCHES } from '@/lib/saju/constants'
import { siteBaseUrl } from '@/lib/tarot/shareLink'
import type { ThreadSlot } from './tarotThread'
import { kstYmd, type ThreadPost } from './threadTypes'

// STEMS/BRANCHES 와 같은 순서(甲..癸 / 子..亥)의 한글 독음.
const STEM_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const BRANCH_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

type Elem = '목' | '화' | '토' | '금' | '수'

const ELEMENT_EN: Record<Elem, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}

const ELEMENT_VIBE: Record<Elem, { ko: string; en: string }> = {
  목: {
    ko: '새싹처럼 뻗어나가는 기운 — 시작과 성장에 좋은 하루.',
    en: 'Growing, branching energy — good for starts and growth.',
  },
  화: {
    ko: '타오르는 열정의 기운 — 표현하고 밀어붙이기 좋은 하루.',
    en: 'Bright, rising energy — good for expression and momentum.',
  },
  토: {
    ko: '단단한 안정의 기운 — 다지고 정리하기 좋은 하루.',
    en: 'Steady, grounding energy — good for consolidating and tidying up.',
  },
  금: {
    ko: '서늘하고 단호한 기운 — 결단과 마무리에 좋은 하루.',
    en: 'Cool, decisive energy — good for cutting clean and finishing.',
  },
  수: {
    ko: '흐르는 지혜의 기운 — 사색과 소통에 좋은 하루.',
    en: 'Flowing, reflective energy — good for thinking and connecting.',
  },
}

const HASHTAGS: Record<'ko' | 'en', string[]> = {
  ko: ['#오늘의일진', '#사주', '#일진', '#만세력', '#오늘의운세', '#운세'],
  en: ['#saju', '#bazi', '#fourpillars', '#dailyfortune', '#astrology', '#fortune'],
}

const GREETING: Record<'ko' | 'en', string> = {
  ko: '🧧 오늘의 일진',
  en: "🧧 Today's day pillar",
}

export function buildSajuThreadPost(
  slot: ThreadSlot,
  locale: 'ko' | 'en' = 'ko',
  now: Date = new Date()
): ThreadPost {
  const { year, month, day } = kstYmd(now)
  const { stemIndex, branchIndex } = computeDayPillarIndices(year, month, day)
  const stem = STEMS[stemIndex]
  const branch = BRANCHES[branchIndex]
  const element = stem.element as Elem

  const stemKo = STEM_KO[stemIndex]
  const branchKo = BRANCH_KO[branchIndex]
  const ganjiKo = `${stemKo}${branchKo}` // 예: 갑자
  const ganjiHanja = `${stem.name}${branch.name}` // 예: 甲子
  const base = siteBaseUrl()
  const vibe = ELEMENT_VIBE[element][locale]

  const caption =
    locale === 'ko'
      ? [
          GREETING.ko,
          `${ganjiKo}일 (${ganjiHanja}日) · ${element}의 기운`,
          '',
          vibe,
          '',
          `🔗 내 사주 무료로 보기 → ${base}/free`,
        ].join('\n')
      : [
          GREETING.en,
          `${ganjiHanja} day · ${ELEMENT_EN[element]} energy`,
          '',
          vibe,
          '',
          `🔗 Read your own Saju, free → ${base}/free`,
        ].join('\n')

  return {
    topic: 'saju',
    slot,
    locale,
    summary: `${ganjiKo}일 (${element})`,
    caption,
    hashtags: HASHTAGS[locale],
  }
}
