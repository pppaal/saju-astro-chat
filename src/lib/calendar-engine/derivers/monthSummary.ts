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

/**
 * 산문(총평)에 박을 테마 문구 정리 — 기술적 괄호 주석을 떼어 읽기 쉽게.
 * 신호 라벨이 "목성 가장 좋은 자리(고양) (게자리)"처럼 (글로스)·(별자리) 괄호를
 * 달고 오는데, 한 문단 산문에선 거슬린다. 괄호 그룹을 모두 제거하고 공백 정리.
 */
function themePhrase(s: string): string {
  return coreReason(s)
    .replace(/\s*[(（][^)）]*[)）]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function deriveMonthSummary(i: MonthSummaryInput): string {
  const ko = i.lang === 'ko'
  const parts: string[] = []
  const good = i.goodDays
  const caution = i.cautionDays
  const total = i.totalDays

  // 1) 전반 톤 — 좋은 날 vs 주의 날 분포. 한 문장 안에 톤 + 날수까지 녹여 길게.
  const tone: 'bright' | 'mixed' | 'careful' =
    good >= caution * 2 ? 'bright' : caution > good ? 'careful' : 'mixed'
  const wool = i.woolunKr ? (ko ? `${i.woolunKr}월은 ` : '') : ''
  const countKo =
    total > 0
      ? ` 전체 ${total}일 가운데 흐름이 트이는 날이 ${good}일, 한 박자 늦추면 좋은 날이 ${caution}일쯤 돼요.`
      : ''
  const countEn =
    total > 0
      ? ` Of its ${total} days, about ${good} run with the current and ${caution} ask for a steadier hand.`
      : ''
  if (ko) {
    parts.push(
      (tone === 'bright'
        ? `${wool}전반적으로 바람을 등진 듯 흐름이 순하게 풀리는 달이에요.`
        : tone === 'careful'
          ? `${wool}크게 벌이기보다 한 박자 늦춰 가는 게 좋은, 조심스러운 결의 달이에요.`
          : `${wool}좋은 날과 조심할 날이 번갈아 드는, 굴곡이 또렷한 달이에요.`) + countKo
    )
  } else {
    parts.push(
      (tone === 'bright'
        ? 'Overall a favorable month — the flow is on your side.'
        : tone === 'careful'
          ? 'A month that rewards a steadier hand over bold moves.'
          : 'A month of swings — good days and cautious ones alternate.') + countEn
    )
  }

  // 2) 지배 테마 — 그 달 가장 센 신호 1~2개. 톤에 맞춰 자연스럽게 이어 붙임.
  const themes = i.topReasons.map(themePhrase).filter(Boolean).slice(0, 2)
  if (themes.length) {
    parts.push(
      ko
        ? `무엇보다 ${themes.join(' · ')} 흐름이 이 달의 결을 이끌어요.`
        : `Above all, ${themes.join(' and ')} set the grain of the month.`
    )
  }

  // 3) 가장 좋은 날 — 날짜 + 이유. 앞 문장과 '그중'으로 연결.
  if (i.bestDay) {
    const why = i.bestDayReason ? coreReason(i.bestDayReason) : ''
    parts.push(
      ko
        ? `그중 ${fmtDate(i.bestDay, true)} 무렵이 가장 무게가 실리는 날이에요${why ? ` — ${why}` : ''}. 미뤄둔 일이 있다면 이때 앞당겨 잡아보세요.`
        : `Among them, ${fmtDate(i.bestDay, false)} carries the most weight${why ? ` — ${why}` : ''}. If something's been on hold, this is the window to bring it forward.`
    )
  }

  // 4) 조심할 날 — '다만'으로 전환, 수렴일은 '또'로 덧붙임.
  if (i.cautionDay) {
    parts.push(
      ko
        ? `다만 ${fmtDate(i.cautionDay, true)} 전후로는 무리한 결정이나 이동을 한 박자 늦추는 편이 안전해요.`
        : `That said, around ${fmtDate(i.cautionDay, false)} it's wiser to hold off on big moves and travel.`
    )
  }
  if (i.convergeDate && i.convergeDate !== i.bestDay) {
    parts.push(
      ko
        ? `또 ${fmtDate(i.convergeDate, true)}은 사주와 점성의 신호가 한꺼번에 겹치는 분기점이라, 큰 흐름이 바뀔 수 있으니 특히 눈여겨보세요.`
        : `And ${fmtDate(i.convergeDate, false)} is a pivot where Saju and astrology converge at once — a turn worth watching closely.`
    )
  }

  // 5) 마무리 한 줄 — 톤별 행동 제안으로 문단을 자연스럽게 닫는다(길이·완결감).
  parts.push(
    ko
      ? tone === 'bright'
        ? '전반적으로는 벌여도 좋은 달이니, 망설이던 일이 있다면 이때 밀어붙여 보세요.'
        : tone === 'careful'
          ? '큰 욕심보다 마무리와 점검에 무게를 두면 한결 무난하게 지나갈 거예요.'
          : '좋은 날엔 밀고 조심할 날엔 쉬어 가는 리듬만 지키면 충분한 달이에요.'
      : tone === 'bright'
        ? "Overall a month to act on — if something's been on hold, this is the time to push."
        : tone === 'careful'
          ? 'Lean into wrapping up and review rather than big ambitions, and it passes smoothly.'
          : 'Push on the good days, rest on the cautious ones, and the rhythm carries you through.'
  )

  return parts.join(' ')
}
