/**
 * deriveMonthSummary — 그 달 데이터를 이어지는 자연스러운 총평 문단으로 합성.
 *
 * 기존 월 narrative 는 인트로 1줄 + topReason 토막 4개라, 정작 계산돼 있는
 * 타이밍(best/caution/converge 날짜·이유)·전반 톤·지배 테마를 글에 안 녹였다.
 * 이 deriver 는 그 조각들을 연결어로 이어 한 문단으로 만든다 — 결정적(LLM 없음).
 * 더 매끄럽게 원하면 이 출력을 LLM 후처리로 다듬는 단계만 얹으면 된다.
 *
 * 순수 함수 — 이미 파생된 값만 입력. (점수·신호 재계산 없음.)
 */

export interface MonthSummaryInput {
  /** 월운 한글 (예: '갑오') — 없으면 생략. */
  woolunKr?: string
  /** 그 달 band 분포 — 좋은 날 / 주의 날 / 전체. */
  goodDays: number
  cautionDays: number
  totalDays: number
  /** 그 달 지배 신호(이미 정제·로컬라이즈된 topReasons 본문) 상위 몇 개. */
  topReasons: string[]
  /** 최고일 'MM-DD' + 그날 한 줄 이유(있으면). */
  bestDay?: string
  bestDayReason?: string
  /** 첫 주의일 'MM-DD'(있으면). */
  cautionDay?: string
  /** 사주×점성 수렴일 'MM-DD'(있으면). */
  convergeDate?: string
  lang: 'ko' | 'en'
}

/** 'MM-DD' → 'M월 D일' / 'M/D'. */
function fmtDate(mmdd: string, ko: boolean): string {
  const [m, d] = mmdd.split('-').map((n) => Number(n))
  if (!m || !d) return mmdd
  return ko ? `${m}월 ${d}일` : `${m}/${d}`
}

/** topReason 본문에서 핵심구만 — 선행 마크·라벨·'— 설명' 꼬리 제거. */
function coreReason(s: string): string {
  return s
    .replace(/^[↑↓·\s]+/, '')
    .replace(/^\[[^\]]*\]\s*/, '')
    .replace(/^(이달|오늘|month|day|year|decade|hour|peak)\s·\s/i, '')
    .split('—')[0]
    .split(' — ')[0]
    .trim()
}

export function deriveMonthSummary(i: MonthSummaryInput): string {
  const ko = i.lang === 'ko'
  const parts: string[] = []
  const good = i.goodDays
  const caution = i.cautionDays

  // 1) 전반 톤 — 좋은 날 vs 주의 날 분포.
  const tone: 'bright' | 'mixed' | 'careful' =
    good >= caution * 2 ? 'bright' : caution > good ? 'careful' : 'mixed'
  const wool = i.woolunKr ? (ko ? `${i.woolunKr}월은 ` : '') : ''
  if (ko) {
    parts.push(
      tone === 'bright'
        ? `${wool}전반적으로 흐름이 우호적인 달이에요.`
        : tone === 'careful'
          ? `${wool}조심이 필요한 구간이 적지 않은 달이에요.`
          : `${wool}좋은 날과 주의가 갈리는, 굴곡이 있는 달이에요.`
    )
  } else {
    parts.push(
      tone === 'bright'
        ? 'Overall a favorable month — the flow is on your side.'
        : tone === 'careful'
          ? 'A month with more than a few stretches to handle carefully.'
          : 'A month of swings — good days and cautious ones split fairly evenly.'
    )
  }

  // 2) 지배 테마 — 그 달 가장 센 신호 1~2개.
  const themes = i.topReasons.map(coreReason).filter(Boolean).slice(0, 2)
  if (themes.length) {
    parts.push(
      ko
        ? `특히 ${themes.join(' · ')} 흐름이 두드러져요.`
        : `In particular, ${themes.join(' and ')} stand out.`
    )
  }

  // 3) 가장 좋은 날 — 날짜 + 이유.
  if (i.bestDay) {
    const why = i.bestDayReason ? coreReason(i.bestDayReason) : ''
    parts.push(
      ko
        ? `가장 좋은 날은 ${fmtDate(i.bestDay, true)} 무렵${why ? ` — ${why}` : ''}.`
        : `The strongest day falls around ${fmtDate(i.bestDay, false)}${why ? ` — ${why}` : ''}.`
    )
  }

  // 4) 조심할 날 — 주의일 / 수렴일.
  if (i.cautionDay) {
    parts.push(
      ko
        ? `반대로 ${fmtDate(i.cautionDay, true)} 전후는 무리한 결정·이동을 한 박자 늦추는 게 좋아요.`
        : `On the other hand, around ${fmtDate(i.cautionDay, false)} it's wiser to hold off on big moves.`
    )
  }
  if (i.convergeDate && i.convergeDate !== i.bestDay) {
    parts.push(
      ko
        ? `${fmtDate(i.convergeDate, true)}은 사주와 점성이 함께 겹치는 분기점이라 특히 주목할 만해요.`
        : `${fmtDate(i.convergeDate, false)} is a pivot where Saju and astrology converge — worth special attention.`
    )
  }

  return parts.join(' ')
}
