import type { HumanSemanticsLang, HumanTimingWindow } from '@/lib/destiny-matrix/interpretation/humanSemantics'

export function describeProbeWindowBucket(probeDay: number, lang: HumanSemanticsLang): string {
  if (lang === 'ko') {
    if (probeDay <= 8) return '월초'
    if (probeDay <= 22) return '월중'
    return '월후반'
  }
  if (probeDay <= 8) return 'the early-month window'
  if (probeDay <= 22) return 'the mid-month window'
  return 'the late-month window'
}
export function humanizeQualityField(field: string, lang: HumanSemanticsLang): string {
  const key = String(field || '').trim()
  const koMap: Record<string, string> = {
    birthDate: '생년월일',
    birthTime: '출생시간',
    timezone: '시간대',
    coordinates: '출생 좌표',
    astroTimingIndex: '점성 타이밍 데이터',
    currentDaeunElement: '대운 흐름',
    currentSaeunElement: '세운 흐름',
    currentWolunElement: '월운 흐름',
    currentIljin: '일진 흐름',
    currentIljinDate: '일진 날짜',
    activeTransits: '현재 트랜짓',
    shinsalList: '신살 정보',
    advancedAstroSignals: '고급 점성 신호',
    crossAgreement: '사주-점성 합의도',
    domainSignals: '도메인 신호',
    focusDomain: '질문 초점',
    strategyBalance: '실행 균형',
    sajuSnapshot: '사주 스냅샷',
    crossSnapshot: '교차 스냅샷',
    'astrologySnapshot.currentTransits': '점성 현재 트랜짓',
  }
  const enMap: Record<string, string> = {
    birthDate: 'birth date',
    birthTime: 'birth time',
    timezone: 'timezone',
    coordinates: 'birth coordinates',
    astroTimingIndex: 'astrology timing data',
    currentDaeunElement: 'major cycle flow',
    currentSaeunElement: 'annual cycle flow',
    currentWolunElement: 'monthly cycle flow',
    currentIljin: 'daily cycle flow',
    currentIljinDate: 'daily cycle date',
    activeTransits: 'active transits',
    shinsalList: 'shinsal data',
    advancedAstroSignals: 'advanced astrology signals',
    crossAgreement: 'cross-agreement',
    domainSignals: 'domain signals',
    focusDomain: 'focus domain',
    strategyBalance: 'execution balance',
    sajuSnapshot: 'saju snapshot',
    crossSnapshot: 'cross snapshot',
    'astrologySnapshot.currentTransits': 'astrology current transits',
  }
  if (lang === 'ko') return koMap[key] || key
  return enMap[key] || key
}
export function withTopicParticle(label: string): string {
  if (!label) return ''
  const lastChar = label[label.length - 1]
  const code = lastChar.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return `${label}은`
  const hasBatchim = (code - 0xac00) % 28 !== 0
  return `${label}${hasBatchim ? '은' : '는'}`
}

export function cleanTimingDetail(
  value: string | null | undefined,
  lang: HumanSemanticsLang
): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''

  const normalized = text
    .replace(
      /\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+Pattern\b/g,
      lang === 'ko' ? '핵심 흐름' : 'the main pattern'
    )
    .replace(/타이밍 적합도는\s*\d+(?:\.\d+)?%\s*수준입니다\.?/g, '')
    .replace(/timing relevance is\s*\d+(?:\.\d+)?%\.?/gi, '')
    .replace(
      /시나리오 확률\s*\d+(?:\.\d+)?%(?:\s*와\s*신뢰도\s*\d+(?:\.\d+)?%)?\s*가?\s*유지될 것/gi,
      '핵심 조건이 유지될 때'
    )
    .replace(
      /scenario probability\s*\d+(?:\.\d+)?%(?:\s*and\s*confidence\s*\d+(?:\.\d+)?%)?/gi,
      'core conditions remain stable'
    )
    .replace(/중단가 보이면/gi, '흐름이 꺾이면')
    .replace(/아래로 떨어지면 중단/gi, '흐름이 꺾이면 속도를 줄일 것')
    .replace(/가 맞아떨어질 때/gi, '가 갖춰질 때')
    .replace(/pattern evidence/gi, lang === 'ko' ? '핵심 조건' : 'core conditions')
    .replace(/핵심 흐름 패턴/gi, '핵심 흐름')
    .replace(/핵심 흐름 근거가 유지될 것/gi, '기준이 흔들리지 않을 때')
    .replace(
      /시나리오 확률이\s*\d+(?:\.\d+)?%\s*흐려지면 속도를 줄일 것/gi,
      '핵심 조건이 흔들리면 서두르지 않을 것'
    )
    .replace(/\(\d+(?:\.\d+)?%\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (lang === 'ko') {
    return normalized
      .replace(
        /지금 구간에 .*? 겹치며 핵심 흐름이 활성화됩니다\.?/g,
        '지금은 여러 조건이 한 방향으로 모여 실제로 움직이기 쉬운 때입니다.'
      )
      .replace(
        /지금 구간에 .*? 겹치며 .*? 활성화됩니다\.?/g,
        '지금은 여러 조건이 한 방향으로 모여 실제로 움직이기 쉬운 때입니다.'
      )
      .replace(/핵심 조건이나 역할 범위가 문서로 정리되지 않으면/g, '역할과 기준이 애매하면')
      .replace(/핵심 조건이 유지될 때/g, '기준이 흔들리지 않을 때')
      .trim()
  }

  return normalized
    .replace(
      /around this window .*?activate.*?\./gi,
      'Several signals are lining up in the same direction, which makes action more viable now.'
    )
    .replace(/if core conditions remain stable/gi, 'if the core conditions remain stable')
    .trim()
}

export function formatTimingCondition(
  value: string,
  mode: 'entry' | 'abort',
  lang: HumanSemanticsLang
): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.。]+$/g, '')
  if (!text) return ''

  if (lang === 'ko') {
    const normalized = text
      .replace(/^특히\s*/u, '')
      .replace(/^반대로\s*/u, '')
      .replace(/역할과 기준이 애매하면/gu, '역할과 기준이 애매하게 남아 있으면')
      .replace(/기준이 흔들리지 않을 때/gu, '기준이 흔들리지 않을 때')
      .replace(/핵심 조건이 흔들리면 서두르지 않을 것/gu, '핵심 조건이 흔들리면 서두르지 않기')
      .replace(/흐름이 꺾이면 속도를 줄일 것/gu, '흐름이 꺾이면 속도를 줄이기')
      .replace(
        /역할과 기준이 애매하게 남아 있으면\s*중단 조짐이 보이면/gu,
        '역할과 기준이 애매하게 남아 있으면'
      )
      .replace(/중단 조짐이 보이면/gu, '')
      .replace(/있으면 중단$/gu, '있으면')
      .replace(/중단$/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (mode === 'abort') return normalized
    return normalized
  }

  return text
}

export function renderTimingEntrySentence(entry: string, lang: HumanSemanticsLang): string {
  if (!entry) return ''
  if (lang === 'ko') {
    return /(때|경우|상태)$/.test(entry)
      ? `들어갈 때는 ${entry} 먼저 맞아야 합니다.`
      : `들어갈 때는 ${entry}가 먼저 맞아야 합니다.`
  }
  return `This works better when ${entry} is in place.`
}

export function renderTimingAbortSentence(abort: string, lang: HumanSemanticsLang): string {
  if (!abort) return ''
  if (lang === 'ko') {
    return /(때|상황|조짐|않기|있으면)$/.test(abort)
      ? `반대로 ${abort} 확정을 늦추는 편이 안전합니다.`
      : `반대로 ${abort} 조짐이 보이면 확정을 늦추는 편이 안전합니다.`
  }
  return `Slow down if ${abort} starts to show up.`
}

export function joinNaturalList(items: string[], lang: HumanSemanticsLang): string {
  const cleaned = items.map((item) => String(item || '').trim()).filter(Boolean)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]
  if (lang === 'ko') {
    if (cleaned.length === 2) return `${cleaned[0]}와 ${cleaned[1]}`
    return `${cleaned.slice(0, -1).join(', ')}, 그리고 ${cleaned[cleaned.length - 1]}`
  }
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`
}

export function describeDomainTimingAngle(
  domainLabel: string,
  lang: HumanSemanticsLang
): string {
  if (!domainLabel) return ''

  if (lang === 'ko') {
    if (domainLabel.includes('커리어') || domainLabel.includes('일')) {
      return '일은 역할·범위·마감이 선명할수록 성과가 빨리 붙습니다.'
    }
    if (domainLabel.includes('관계') || domainLabel.includes('연애')) {
      return '관계는 감정 해석보다 대화 순서와 확인 방식이 결과를 더 크게 바꿉니다.'
    }
    if (domainLabel.includes('재정') || domainLabel.includes('돈')) {
      return '재정은 기대감보다 금액·기한·손실 상한을 먼저 닫아야 흔들림이 줄어듭니다.'
    }
    if (domainLabel.includes('건강') || domainLabel.includes('컨디션')) {
      return '컨디션은 억지로 끌어올리기보다 수면과 회복 리듬을 먼저 지키는 편이 낫습니다.'
    }
    if (domainLabel.includes('이동') || domainLabel.includes('변화')) {
      return '이동이나 변화는 한 번에 확정하기보다 순서와 여유 시간을 먼저 확보하는 편이 낫습니다.'
    }
    return '지금은 욕심을 넓히기보다 핵심 조건을 먼저 맞추는 편이 유리합니다.'
  }

  if (domainLabel.includes('career') || domainLabel.includes('work')) {
    return 'Work moves better when role, scope, and deadlines are explicit.'
  }
  if (domainLabel.includes('relationship') || domainLabel.includes('love')) {
    return 'Relationships respond more to pacing and confirmation than to emotional certainty.'
  }
  if (domainLabel.includes('finance') || domainLabel.includes('money')) {
    return 'Finance is steadier when amount, timing, and downside are defined first.'
  }
  if (domainLabel.includes('health')) {
    return 'Health tends to improve more from protected recovery than from forcing output.'
  }
  if (domainLabel.includes('move') || domainLabel.includes('movement')) {
    return 'Change goes better when sequence and buffer time are secured first.'
  }
  return 'This works best when core conditions are settled before you widen the move.'
}

export function normalizePhaseLabel(phaseLabel?: string | null): string {
  return String(phaseLabel || '')
    .trim()
    .toLowerCase()
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
export function describeSajuAstroConflictByDomainDetailed(input: {
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
    return 'Saju and astrology are still best read together by checking where they align and where they ask for a slower move.'
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

  return 'Saju and astrology are pointing at the same topic through different angles, so this area needs clearer pacing and confirmation before commitment.'
}

