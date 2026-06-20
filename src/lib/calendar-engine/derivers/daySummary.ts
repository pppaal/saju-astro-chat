/**
 * deriveDaySummary — 그날(일진) 데이터를 자연스러운 한 문단 총평으로 합성.
 *
 * deriveMonthSummary(월)의 일(日) 버전. 이미 파생된 값만 입력으로 받아 연결어로
 * 이어 붙인다 — 점괘를 새로 짓지 않고, LLM 도 쓰지 않는다(결정적).
 *   · 톤(verdict) → 전반 한 문장
 *   · 상위 우호 사유 1~2 → 지배 흐름
 *   · 주의 사유 1 → '다만' 전환
 *   · 톤별 행동 제안 → 마무리
 *
 * 입력 사유(topReasons/cautions)는 이미 로컬라이즈·plain 처리된 문자열이라
 * 화살표·라벨 머리만 떼어 쓴다.
 */

import { plainReason } from './plainLanguage'

export interface DaySummaryInput {
  /** verdict.tone — 화해된 단일 톤. */
  tone: 'positive' | 'mixed' | 'caution'
  /** 상위 우호 사유(이미 plain·로컬라이즈). */
  topReasons: string[]
  /** 상위 주의 사유(이미 plain·로컬라이즈). */
  cautions: string[]
  lang: 'ko' | 'en'
}

/**
 * 사유 문자열에서 핵심구만 추출 — 공용 plainReason(화살표·레이어 대괄호·괄호
 * 글로스·한자月 정리) 후, 스케일 접두('이달 · ' 등)와 '— 설명' 꼬리를 더 떼낸다.
 */
function core(s: string, ko: boolean): string {
  return plainReason(s, ko)
    .replace(/^(이달|오늘|올해|이번 달|month|day|year|decade|hour|peak)\s*·\s*/i, '')
    .split('—')[0]
    .split(' — ')[0]
    .trim()
}

export function deriveDaySummary(i: DaySummaryInput): string {
  const ko = i.lang === 'ko'
  const parts: string[] = []
  const goods = i.topReasons
    .map((s) => core(s, ko))
    .filter(Boolean)
    .slice(0, 2)
  const caution = i.cautions.map((s) => core(s, ko)).filter(Boolean)[0]

  // 1) 전반 톤 한 문장.
  if (ko) {
    parts.push(
      i.tone === 'positive'
        ? '오늘은 흐름이 잘 받쳐주는 날이에요.'
        : i.tone === 'caution'
          ? '오늘은 한 박자 늦춰 가면 좋은, 조심스러운 날이에요.'
          : '오늘은 좋고 나쁨이 함께 있어 굴곡이 있는 날이에요.'
    )
  } else {
    parts.push(
      i.tone === 'positive'
        ? 'Today the flow is on your side.'
        : i.tone === 'caution'
          ? 'A careful day — it rewards a steadier hand over bold moves.'
          : 'A day of swings — good and tricky parts sit side by side.'
    )
  }

  // 2) 지배 흐름(우호 사유 1~2).
  if (goods.length) {
    parts.push(
      ko
        ? `특히 ${goods.join(' · ')} 흐름이 살아나요.`
        : `In particular, ${goods.join(' and ')} come alive.`
    )
  }

  // 3) 주의 — '다만'으로 전환.
  if (caution) {
    parts.push(ko ? `다만 ${caution}는 한 박자 늦추세요.` : `That said, ease off on ${caution}.`)
  }

  // 4) 톤별 마무리 행동 제안.
  parts.push(
    ko
      ? i.tone === 'positive'
        ? '하고 싶던 일이 있다면 오늘 밀어붙여 보세요.'
        : i.tone === 'caution'
          ? '새 일을 벌이기보다 정리·점검에 두면 무난해요.'
          : '큰 결정은 잘 풀리는 쪽 위주로, 무리만 피하면 괜찮아요.'
      : i.tone === 'positive'
        ? "If something's been on hold, push it forward today."
        : i.tone === 'caution'
          ? 'Lean toward review and tidying over new ventures.'
          : 'Keep big calls to what already flows, and avoid overreach.'
  )

  return parts.join(' ')
}
