import type { HumanSemanticsLang } from './humanSemantics'
import { withTopicParticle } from './humanSemanticsTimingSupport'

export function describeSajuAstroRole(input: {
  hasSaju: boolean
  hasAstro: boolean
  crossVerified?: boolean
  crossAgreementPercent?: number
  lang?: HumanSemanticsLang
}): string | null {
  const { hasSaju, hasAstro, crossVerified = false, crossAgreementPercent, lang = 'ko' } = input
  const aligned = Number.isFinite(crossAgreementPercent) && Number(crossAgreementPercent) >= 70

  if (lang === 'ko') {
    if (hasSaju && hasAstro) {
      if (crossVerified && aligned) {
        return '사주는 큰 흐름과 기본 체력을 받쳐주고, 점성은 타이밍과 변수 관리를 잡아줘서 둘이 같은 방향으로 맞물리고 있습니다.'
      }
      return '사주는 큰 흐름과 기본 성향을, 점성은 당장 흔들릴 변수와 타이밍을 보여주니 둘을 같이 보고 속도를 정하는 편이 좋습니다.'
    }
    if (hasSaju) {
      return '사주 쪽 해석은 오늘 하루의 운세보다, 지금 삶의 흐름과 에너지 배분을 길게 보라는 쪽에 가깝습니다.'
    }
    if (hasAstro) {
      return '점성 쪽 해석은 오늘의 타이밍, 사람 간 반응, 일정 변화처럼 당장 체감되는 변수에 더 민감합니다.'
    }
    return null
  }

  if (hasSaju && hasAstro) {
    if (crossVerified && aligned) {
      return 'Saju supports the broader pattern while astrology supports timing and variable management in the same direction.'
    }
    return 'Saju shows the bigger arc while astrology highlights near-term timing and volatility, so pace matters.'
  }
  if (hasSaju) {
    return 'Saju is speaking more to the bigger pattern and energy allocation than to the hour-by-hour timing.'
  }
  if (hasAstro) {
    return 'Astrology is more sensitive to timing, communication, and scheduling variables.'
  }
  return null
}

export function describeSajuAstroConflict(input: {
  crossAgreement?: number | null
  focusDomainLabel?: string
  lang?: HumanSemanticsLang
}): string {
  const { focusDomainLabel = '', lang = 'ko' } = input
  const raw = Number(input.crossAgreement)
  const normalized = Number.isFinite(raw) ? (raw <= 1 ? raw * 100 : raw) : null
  if (!Number.isFinite(normalized)) {
    return lang === 'ko'
      ? '사주와 점성은 같은 결론만 반복하는 구조가 아니라, 큰 흐름과 당장 변수를 같이 보며 속도를 조절합니다.'
      : 'Saju and astrology are used together to separate the larger pattern from the near-term variables.'
  }

  const score = Math.max(0, Math.min(100, Math.round(normalized as number)))
  const topic = focusDomainLabel ? withTopicParticle(focusDomainLabel) : ''

  if (lang === 'ko') {
    if (score >= 70) {
      return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '이 영역'}에서는 기준만 정리되면 속도를 내도 되는 편입니다.`
    }
    if (score >= 45) {
      return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 세부 타이밍과 변수 해석이 조금 갈려서, ${focusDomainLabel || '이 영역'}에서는 한 번 더 확인하는 절차가 필요합니다.`
    }
    return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어서, ${focusDomainLabel || '이 영역'}에서는 서둘러 확정하기보다 충돌 지점을 먼저 정리해야 합니다.`
  }

  if (score >= 70) {
    return `Saju and astrology are aligned enough that ${focusDomainLabel || 'this area'} can move faster once the baseline is set.`
  }
  if (score >= 45) {
    return `Saju and astrology point in a similar broad direction, but they differ enough on timing and variables that ${focusDomainLabel || 'this area'} still needs one more verification pass.`
  }
  return `Saju and astrology are pulling in different directions, so ${focusDomainLabel || 'this area'} should resolve the conflict first instead of rushing commitment.`
}

export function detectConflictFocusKey(
  domainLabel: string
): 'career' | 'love' | 'money' | 'health' | 'move' | 'general' {
  if (!domainLabel) return 'general'
  if (
    domainLabel.includes('커리어') ||
    domainLabel.includes('일') ||
    domainLabel.includes('career') ||
    domainLabel.includes('work')
  ) {
    return 'career'
  }
  if (
    domainLabel.includes('관계') ||
    domainLabel.includes('연애') ||
    domainLabel.includes('relationship') ||
    domainLabel.includes('love')
  ) {
    return 'love'
  }
  if (
    domainLabel.includes('재정') ||
    domainLabel.includes('돈') ||
    domainLabel.includes('finance') ||
    domainLabel.includes('money')
  ) {
    return 'money'
  }
  if (
    domainLabel.includes('건강') ||
    domainLabel.includes('컨디션') ||
    domainLabel.includes('health')
  ) {
    return 'health'
  }
  if (
    domainLabel.includes('이동') ||
    domainLabel.includes('변화') ||
    domainLabel.includes('move') ||
    domainLabel.includes('movement')
  ) {
    return 'move'
  }
  return 'general'
}

export function describeSajuAstroConflictByDomain(input: {
  crossAgreement?: number | null
  focusDomainLabel?: string
  lang?: HumanSemanticsLang
}): string {
  return describeSajuAstroConflictByDomainDetailed(input)
  const { focusDomainLabel = '', lang = 'ko' } = input
  const raw = Number(input.crossAgreement)
  const normalized = Number.isFinite(raw) ? (raw <= 1 ? raw * 100 : raw) : null
  const topic = focusDomainLabel ? withTopicParticle(focusDomainLabel) : ''
  const focusKey = detectConflictFocusKey(focusDomainLabel)

  if (!Number.isFinite(normalized)) {
    if (lang === 'ko') {
      if (focusKey === 'love') {
        return '사주와 점성은 관계를 볼 때 감정의 크기만이 아니라 대화 순서와 확인 방식을 함께 보게 해줍니다.'
      }
      if (focusKey === 'career') {
        return '사주와 점성은 커리어를 볼 때 가능성보다 역할, 책임, 마감이 실제로 맞물리는지를 함께 보게 해줍니다.'
      }
      if (focusKey === 'money') {
        return '사주와 점성은 재정을 볼 때 기대 수익보다 금액, 회수 시점, 손실 상한을 함께 보게 해줍니다.'
      }
      if (focusKey === 'health') {
        return '사주와 점성은 건강을 볼 때 의지보다 과부하 신호와 회복 리듬을 함께 보게 해줍니다.'
      }
      if (focusKey === 'move') {
        return '사주와 점성은 이동과 변화를 볼 때 결심 자체보다 순서와 여유 시간을 함께 보게 해줍니다.'
      }
    }
    return describeSajuAstroConflict(input)
  }

  const score = Math.max(0, Math.min(100, Math.round(normalized as number)))

  if (lang === 'ko') {
    if (focusKey === 'love') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '관계'}에서는 감정 추정보다 대화 순서와 확인 방식만 정리되면 실제 진전으로 이어질 가능성이 높습니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 반응 속도와 거리 조절 해석이 조금 갈려서, ${focusDomainLabel || '관계'}에서는 서두르기보다 질문 방식과 경계를 한 번 더 맞추는 편이 좋습니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '관계'}에서는 감정만 믿고 밀기보다 대화 순서, 약속 강도, 확인 포인트부터 다시 정리해야 합니다.`
    }
    if (focusKey === 'career') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '커리어'}에서는 역할·범위·마감만 선명하면 실행 속도를 내도 흔들릴 가능성이 낮습니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 세부 타이밍과 책임 배분 해석이 갈려서, ${focusDomainLabel || '커리어'}에서는 맡을 범위와 결정권을 한 번 더 닫고 가는 편이 안전합니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '커리어'}에서는 기회만 보고 넓히기보다 역할, 책임, 마감부터 다시 정리해야 손실을 줄일 수 있습니다.`
    }
    if (focusKey === 'money') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '재정'}에서는 금액·기한·손실 상한만 닫히면 판단을 미루지 않아도 되는 편입니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 현금 흐름과 리스크 타이밍 해석이 갈려서, ${focusDomainLabel || '재정'}에서는 수익 기대보다 손실 상한과 회수 시점을 먼저 확인해야 합니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '재정'}에서는 기대 수익만 보고 움직이기보다 금액, 기한, 손실 상한부터 다시 점검해야 합니다.`
    }
    if (focusKey === 'health') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '건강'}에서는 회복 리듬과 생활 순서만 맞추면 컨디션 반등을 만들기 쉬운 편입니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 과부하 시점과 회복 속도 해석이 조금 갈려서, ${focusDomainLabel || '건강'}에서는 무리한 보강보다 수면·식사·휴식 리듬부터 맞추는 편이 낫습니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '건강'}에서는 의지로 버티기보다 과부하 신호와 회복 루틴부터 다시 점검해야 합니다.`
    }
    if (focusKey === 'move') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '이동/변화'}에서는 순서와 여유 시간만 확보되면 비교적 매끄럽게 움직일 수 있습니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 경로와 시점 해석이 조금 갈려서, ${focusDomainLabel || '이동/변화'}에서는 한 번에 확정하기보다 단계와 여유 시간을 더 확인하는 편이 좋습니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '이동/변화'}에서는 결심부터 굳히기보다 이동 순서, 거점, 예비안부터 다시 정리해야 합니다.`
    }
  } else {
    if (focusKey === 'love') {
      if (score >= 70) {
        return `Saju and astrology align enough that ${focusDomainLabel || 'relationships'} can move when conversation order and confirmation style are clear.`
      }
      if (score >= 45) {
        return `Saju and astrology point in a similar broad direction, but they differ on pacing and emotional distance, so ${focusDomainLabel || 'relationships'} need one more round of calibration.`
      }
      return `Saju and astrology are warning in different ways, so ${focusDomainLabel || 'relationships'} should reset the conversation order, commitment level, and boundaries before pushing ahead.`
    }
    if (focusKey === 'career') {
      if (score >= 70) {
        return `Saju and astrology align enough that ${focusDomainLabel || 'career matters'} can move faster once role, scope, and deadlines are explicit.`
      }
      if (score >= 45) {
        return `Saju and astrology broadly agree, but they still diverge on timing and responsibility splits, so ${focusDomainLabel || 'career matters'} need tighter scope before commitment.`
      }
      return `Saju and astrology are warning in different ways, so ${focusDomainLabel || 'career matters'} should resolve role, ownership, and deadline conflicts before expanding.`
    }
    if (focusKey === 'money') {
      if (score >= 70) {
        return `Saju and astrology align enough that ${focusDomainLabel || 'financial decisions'} can move once amount, timing, and downside are clearly bounded.`
      }
      if (score >= 45) {
        return `Saju and astrology broadly agree, but they diverge on cash-flow timing and risk pace, so ${focusDomainLabel || 'financial decisions'} need stricter limits first.`
      }
      return `Saju and astrology are warning in different ways, so ${focusDomainLabel || 'financial decisions'} should recheck amount, timing, and downside before acting.`
    }
  }

  return describeSajuAstroConflict(input)
}

function describeSajuAstroConflictByDomainDetailed(input: {
  crossAgreement?: number | null
  focusDomainLabel?: string
  lang?: HumanSemanticsLang
}): string {
  const { focusDomainLabel = '', lang = 'ko' } = input
  const raw = Number(input.crossAgreement)
  const normalized = Number.isFinite(raw) ? (raw <= 1 ? raw * 100 : raw) : null
  const topic = focusDomainLabel ? withTopicParticle(focusDomainLabel) : ''
  const focusKey = detectConflictFocusKey(focusDomainLabel)

  if (!Number.isFinite(normalized)) {
    if (lang === 'ko') {
      if (focusKey === 'love') {
        return '사주와 점성은 관계를 볼 때 감정의 세기보다 대화 순서, 확인 방식, 약속 강도를 함께 보게 해줍니다.'
      }
      if (focusKey === 'career') {
        return '사주와 점성은 커리어를 볼 때 기회 자체보다 역할, 책임, 마감이 실제로 맞물리는지를 함께 보게 해줍니다.'
      }
      if (focusKey === 'money') {
        return '사주와 점성은 재정을 볼 때 기대 수익보다 금액, 회수 시점, 손실 상한을 함께 보게 해줍니다.'
      }
      if (focusKey === 'health') {
        return '사주와 점성은 건강을 볼 때 의지보다 과부하 신호와 회복 리듬을 함께 보게 해줍니다.'
      }
      if (focusKey === 'move') {
        return '사주와 점성은 이동과 변화를 볼 때 결심 자체보다 순서, 거점, 준비 기간을 함께 보게 해줍니다.'
      }
    }
    return describeSajuAstroConflict(input)
  }

  const score = Math.max(0, Math.min(100, Math.round(normalized as number)))

  if (lang === 'ko') {
    if (focusKey === 'love') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '관계'}에서는 호감 자체보다 대화 순서와 확인 방식만 정리되면 실제 진전으로 이어질 가능성이 높습니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 반응 속도와 거리 조절 해석이 갈려서, ${focusDomainLabel || '관계'}에서는 감정보다 질문 순서와 경계부터 먼저 맞추는 편이 안전합니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '관계'}에서는 감정만 믿고 밀기보다 대화 순서, 약속 강도, 확인 포인트부터 다시 정리해야 합니다.`
    }
    if (focusKey === 'career') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '커리어'}에서는 역할·범위·마감만 선명하면 실행 속도를 내도 흔들릴 가능성이 낮습니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 세부 타이밍과 책임 배분 해석이 갈려서, ${focusDomainLabel || '커리어'}에서는 맡을 범위와 결정권부터 더 또렷하게 닫고 가는 편이 안전합니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '커리어'}에서는 기회만 보고 넓히기보다 역할, 책임, 마감부터 다시 정리해야 손실을 줄일 수 있습니다.`
    }
    if (focusKey === 'money') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '재정'}에서는 금액·기한·손실 상한만 닫히면 판단을 과하게 미루지 않아도 되는 편입니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 현금 흐름과 리스크 타이밍 해석이 갈려서, ${focusDomainLabel || '재정'}에서는 수익 기대보다 손실 상한과 회수 시점부터 먼저 확인해야 합니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '재정'}에서는 기대 수익만 보고 움직이기보다 금액, 기한, 손실 상한부터 다시 점검해야 합니다.`
    }
    if (focusKey === 'health') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '건강'}에서는 회복 리듬과 생활 순서만 맞추면 컨디션 반등을 만들기 쉬운 편입니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 과부하 시점과 회복 속도 해석이 갈려서, ${focusDomainLabel || '건강'}에서는 무리한 보강보다 수면·식사·휴식 루틴부터 맞추는 편이 낫습니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '건강'}에서는 의지로 버티기보다 과부하 신호와 회복 루틴부터 다시 점검해야 합니다.`
    }
    if (focusKey === 'move') {
      if (score >= 70) {
        return `${topic || '사주와 점성은'} 같은 방향을 가리켜서, ${focusDomainLabel || '이동/변화'}에서는 이동 순서와 준비 기간만 확보되면 비교적 매끄럽게 움직일 수 있습니다.`
      }
      if (score >= 45) {
        return `${topic || '사주와 점성은'} 큰 방향은 비슷하지만 경로와 시점 해석이 갈려서, ${focusDomainLabel || '이동/변화'}에서는 한 번에 확정하기보다 단계와 여유 시간을 더 확인하는 편이 좋습니다.`
      }
      return `${topic || '사주와 점성은'} 서로 다른 경고를 주고 있어, ${focusDomainLabel || '이동/변화'}에서는 결심부터 굳히기보다 이동 순서, 거점, 예비안부터 다시 정리해야 합니다.`
    }
  } else {
    if (focusKey === 'love') {
      if (score >= 70)
        return `Saju and astrology align enough that ${focusDomainLabel || 'relationships'} can move once conversation order and confirmation style are clear.`
      if (score >= 45)
        return `Saju and astrology point in a similar broad direction, but they still differ on pacing and distance, so ${focusDomainLabel || 'relationships'} need one more round of calibration.`
      return `Saju and astrology are warning in different ways, so ${focusDomainLabel || 'relationships'} should reset conversation order, commitment level, and boundaries before pushing ahead.`
    }
    if (focusKey === 'career') {
      if (score >= 70)
        return `Saju and astrology align enough that ${focusDomainLabel || 'career matters'} can move faster once role, scope, and deadlines are explicit.`
      if (score >= 45)
        return `Saju and astrology broadly agree, but they still diverge on timing and responsibility splits, so ${focusDomainLabel || 'career matters'} need tighter scope before commitment.`
      return `Saju and astrology are warning in different ways, so ${focusDomainLabel || 'career matters'} should resolve role, ownership, and deadline conflicts before expanding.`
    }
    if (focusKey === 'money') {
      if (score >= 70)
        return `Saju and astrology align enough that ${focusDomainLabel || 'financial decisions'} can move once amount, timing, and downside are clearly bounded.`
      if (score >= 45)
        return `Saju and astrology broadly agree, but they diverge on cash-flow timing and risk pace, so ${focusDomainLabel || 'financial decisions'} need stricter limits first.`
      return `Saju and astrology are warning in different ways, so ${focusDomainLabel || 'financial decisions'} should recheck amount, timing, and downside before acting.`
    }
    if (focusKey === 'health') {
      if (score >= 70)
        return `Saju and astrology align enough that ${focusDomainLabel || 'health matters'} can improve once recovery rhythm and routine are protected.`
      if (score >= 45)
        return `Saju and astrology broadly agree, but they still differ on overload timing and recovery pace, so ${focusDomainLabel || 'health matters'} need gentler pacing first.`
      return `Saju and astrology are warning in different ways, so ${focusDomainLabel || 'health matters'} should reset overload control and recovery rhythm before pushing harder.`
    }
    if (focusKey === 'move') {
      if (score >= 70)
        return `Saju and astrology align enough that ${focusDomainLabel || 'movement decisions'} can move once sequence and buffer time are secured.`
      if (score >= 45)
        return `Saju and astrology broadly agree, but they still differ on route timing and transition pace, so ${focusDomainLabel || 'movement decisions'} need more staging first.`
      return `Saju and astrology are warning in different ways, so ${focusDomainLabel || 'movement decisions'} should reset sequencing, buffer time, and fallback planning before committing.`
    }
  }

  return describeSajuAstroConflict(input)
}

export function describeCrossEvidenceBridge(input: {
  tone: 'positive' | 'negative' | 'neutral'
  aligned?: boolean
  lang?: HumanSemanticsLang
}): string {
  const { tone, aligned = false, lang = 'ko' } = input

  if (lang === 'ko') {
    if (tone === 'negative') {
      return '점성은 지금 시점의 실수 가능성을, 사주는 구조적인 리스크를 함께 경고하고 있습니다. 계약이나 큰 결정은 한 번 더 확인하는 편이 좋습니다.'
    }
    if (aligned) {
      return '사주는 버티는 힘을 받쳐주고, 점성은 타이밍을 밀어줘서 지금은 핵심 과제를 선명하게 밀기 좋은 쪽입니다.'
    }
    return '점성은 기회를 보여주지만 사주 쪽 흐름은 속도를 조절하라고 말합니다. 좋아 보여도 바로 확정하기보다 한 번 더 확인하세요.'
  }

  if (tone === 'negative') {
    return 'Astrology warns on timing while Saju warns on the underlying structure, so contracts and major decisions deserve another pass.'
  }
  if (aligned) {
    return 'Saju supports stamina while astrology supports timing, making this a better window for pushing one or two core priorities.'
  }
  return 'Astrology shows opportunity, but Saju still argues for pacing and verification before commitment.'
}
