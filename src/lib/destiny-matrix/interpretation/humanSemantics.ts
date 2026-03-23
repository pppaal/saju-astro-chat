export type HumanSemanticsLang = 'ko' | 'en'

export type HumanTimingWindow = 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'

function describeProbeWindowBucket(probeDay: number, lang: HumanSemanticsLang): string {
  if (lang === 'ko') {
    if (probeDay <= 8) return '월초'
    if (probeDay <= 22) return '월중'
    return '월후반'
  }
  if (probeDay <= 8) return 'the early-month window'
  if (probeDay <= 22) return 'the mid-month window'
  return 'the late-month window'
}

export function describeWhyStack(input: {
  lang?: HumanSemanticsLang
  focusDomainLabel?: string
  sajuReason?: string | null
  astroReason?: string | null
  crossReason?: string | null
  graphReason?: string | null
}): string[] {
  const {
    lang = 'ko',
    focusDomainLabel = '',
    sajuReason,
    astroReason,
    crossReason,
    graphReason,
  } = input

  const normalized = [sajuReason, astroReason, crossReason, graphReason]
    .map((item) =>
      String(item || '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)

  if (normalized.length === 0) return []

  if (lang === 'ko') {
    return [
      sajuReason ? `사주는 ${sajuReason}` : '',
      astroReason ? `점성은 ${astroReason}` : '',
      crossReason
        ? `${focusDomainLabel ? withTopicParticle(focusDomainLabel) : '교차 근거는'} ${crossReason}`
        : '',
      graphReason ? `근거 묶음은 ${graphReason}` : '',
    ].filter(Boolean)
  }

  return [
    sajuReason ? `Saju points to ${sajuReason}` : '',
    astroReason ? `Astrology points to ${astroReason}` : '',
    crossReason ? `Cross-evidence shows ${crossReason}` : '',
    graphReason ? `The grounded evidence bundle matters because ${graphReason}` : '',
  ].filter(Boolean)
}

export function describeGraphEvidenceWhy(input: {
  focusDomainLabel?: string
  overlapDomains?: string[]
  overlapScore?: number | null
  orbFitScore?: number | null
  lang?: HumanSemanticsLang
}): { focusReason: string; graphReason: string } {
  return describeGraphEvidenceWhyDetailed(input)
  const {
    focusDomainLabel = '',
    overlapDomains = [],
    overlapScore,
    orbFitScore,
    lang = 'ko',
  } = input
  const overlapText = overlapDomains.filter(Boolean).join(', ')
  const focusKey = detectConflictFocusKey(focusDomainLabel || overlapDomains[0] || '')
  const overlap = Number.isFinite(Number(overlapScore)) ? Number(overlapScore) : null
  const orbFit = Number.isFinite(Number(orbFitScore)) ? Number(orbFitScore) : null

  if (lang === 'ko') {
    if (focusKey === 'love') {
      return {
        focusReason: overlapText
          ? `가장 강한 겹침은 ${overlapText} 축에 몰려 있고, 관계에서는 감정 해석보다 대화 순서와 확인 방식이 실제 결과를 더 잘 설명합니다.`
          : '관계에서는 감정 추정보다 대화 순서와 확인 방식에 공통 근거가 더 많이 모일 때 해석이 선명해집니다.',
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 관계 흐름에서 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 누가 먼저 어떻게 확인해야 하는지를 읽는 데 특히 유효합니다.`
            : '상위 근거 묶음은 관계 흐름에서 감정의 크기보다 대화 순서와 확인 포인트를 잡는 데 더 유효합니다.',
      }
    }
    if (focusKey === 'career') {
      return {
        focusReason: overlapText
          ? `가장 강한 겹침은 ${overlapText} 축에 몰려 있고, 커리어에서는 가능성보다 역할·범위·마감이 어떻게 맞물리는지가 핵심입니다.`
          : '커리어에서는 기회 자체보다 역할, 범위, 마감에 공통 근거가 모일 때 해석이 선명해집니다.',
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 커리어 흐름에서 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 무엇을 맡고 어디까지 책임질지를 읽는 데 유효합니다.`
            : '상위 근거 묶음은 커리어 흐름에서 역할과 책임 범위를 읽는 데 특히 유효합니다.',
      }
    }
    if (focusKey === 'money') {
      return {
        focusReason: overlapText
          ? `가장 강한 겹침은 ${overlapText} 축에 몰려 있고, 재정에서는 기대 수익보다 금액·기한·손실 상한을 닫는 근거가 중요합니다.`
          : '재정에서는 기대감보다 금액, 기한, 손실 상한에 공통 근거가 모일 때 해석이 선명해집니다.',
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 재정 흐름에서 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 회수 시점과 손실 상한을 읽는 데 유효합니다.`
            : '상위 근거 묶음은 재정 흐름에서 회수 시점과 손실 상한을 읽는 데 특히 유효합니다.',
      }
    }
    if (focusKey === 'health') {
      return {
        focusReason: overlapText
          ? `가장 강한 겹침은 ${overlapText} 축에 몰려 있고, 건강에서는 의지보다 과부하 신호와 회복 리듬을 같이 보는 근거가 중요합니다.`
          : '건강에서는 노력 자체보다 과부하 신호와 회복 리듬에 공통 근거가 모일 때 해석이 선명해집니다.',
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 건강 흐름에서 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 언제 쉬어야 회복이 붙는지를 읽는 데 유효합니다.`
            : '상위 근거 묶음은 건강 흐름에서 회복 리듬을 읽는 데 특히 유효합니다.',
      }
    }
    if (focusKey === 'move') {
      return {
        focusReason: overlapText
          ? `가장 강한 겹침은 ${overlapText} 축에 몰려 있고, 이동과 변화에서는 결단 자체보다 순서와 여유 시간을 보는 근거가 중요합니다.`
          : '이동과 변화에서는 결심보다 순서와 여유 시간에 공통 근거가 모일 때 해석이 선명해집니다.',
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 이동 흐름에서 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 어느 순서로 움직여야 흔들림이 적은지를 읽는 데 유효합니다.`
            : '상위 근거 묶음은 이동 흐름에서 순서와 예비안을 읽는 데 특히 유효합니다.',
      }
    }

    return {
      focusReason: overlapText
        ? `가장 강한 겹침은 ${overlapText} 축에서 잡히며, 사주 흐름과 점성 변수가 같은 방향으로 모입니다.`
        : '겹치는 근거가 상대적으로 선명한 축부터 읽는 편이 안전합니다.',
      graphReason:
        overlap !== null && orbFit !== null
          ? `상위 근거 묶음은 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 여러 근거가 같은 방향을 가리키는지 확인하는 데 유효합니다.`
          : '상위 근거 묶음은 강한 한 축보다 여러 신호가 같은 방향을 가리키는지 확인하는 데 유효합니다.',
    }
  }

  return {
    focusReason: overlapText
      ? `The strongest overlap sits on ${overlapText}, which is why this evidence bundle is used first.`
      : 'The safer move is to start from the area where overlap is clearest.',
    graphReason:
      overlap !== null && orbFit !== null
        ? `The top evidence bundle locks in around overlap ${overlap} and orb fit ${orbFit}, so it is the best grounded starting point.`
        : 'The top evidence bundle is used because it is the most grounded cross-system starting point.',
  }
}

function humanizeQualityField(field: string, lang: HumanSemanticsLang): string {
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

export function describeDataTrustSummary(input: {
  score?: number | null
  grade?: string | null
  missingFields?: string[]
  derivedFields?: string[]
  conflictingFields?: string[]
  confidenceReason?: string | null
  lang?: HumanSemanticsLang
}): string {
  const {
    score,
    missingFields = [],
    derivedFields = [],
    conflictingFields = [],
    lang = 'ko',
  } = input
  const normalizedScore = Number.isFinite(Number(score)) ? Number(score) : null

  if (lang === 'ko') {
    if (conflictingFields.length > 0) {
      return `지금 해석은 방향은 읽히지만 ${humanizeQualityField(conflictingFields[0], 'ko')} 쪽 충돌이 있어 확정보다 검토형으로 쓰는 편이 안전합니다.`
    }
    if (missingFields.length > 0) {
      return `핵심 입력 중 ${humanizeQualityField(missingFields[0], 'ko')} 정보가 비어 있어 큰 흐름 중심으로 참고하는 편이 맞습니다.`
    }
    if (derivedFields.length > 0) {
      return `핵심 입력은 갖춰졌지만 ${humanizeQualityField(derivedFields[0], 'ko')} 일부는 자동 보정돼 세부 타이밍은 한 번 더 확인하는 편이 좋습니다.`
    }
    if (normalizedScore !== null && normalizedScore >= 85) {
      return '핵심 입력과 교차 근거가 비교적 잘 맞아, 큰 방향과 타이밍을 함께 참고해도 되는 편입니다.'
    }
    return '전체 근거는 참고할 만하지만, 실행 전 마지막 확인 절차를 한 번 끼우는 편이 더 안전합니다.'
  }

  if (conflictingFields.length > 0) {
    return `The overall direction is still readable, but conflict around ${humanizeQualityField(conflictingFields[0], 'en')} means review is safer than instant commitment.`
  }
  if (missingFields.length > 0) {
    return `A key input is missing around ${humanizeQualityField(missingFields[0], 'en')}, so this should be read more as directional guidance than exact timing.`
  }
  if (derivedFields.length > 0) {
    return `Core inputs are present, but ${humanizeQualityField(derivedFields[0], 'en')} was derived automatically, so fine timing still deserves a second check.`
  }
  if (normalizedScore !== null && normalizedScore >= 85) {
    return 'Core inputs and cross-system evidence are aligned enough to use for both direction and timing.'
  }
  return 'The evidence is usable, but it still benefits from one last verification step before commitment.'
}

export function describeProvenanceSummary(input: {
  sourceFields?: string[]
  sourceSetIds?: string[]
  sourceRuleIds?: string[]
  lang?: HumanSemanticsLang
}): string {
  const { sourceFields = [], sourceSetIds = [], sourceRuleIds = [], lang = 'ko' } = input
  const fields = sourceFields.slice(0, 3).map((field) => humanizeQualityField(field, lang))
  const setCount = sourceSetIds.length
  const ruleCount = sourceRuleIds.length

  if (lang === 'ko') {
    if (fields.length === 0 && setCount === 0 && ruleCount === 0) return ''
    if (fields.length > 0 && setCount > 0) {
      return `이 판단은 ${joinNaturalList(fields, 'ko')}과 교차 근거 묶음 ${setCount}개를 함께 본 결과입니다.`
    }
    if (fields.length > 0 && ruleCount > 0) {
      return `이 판단은 ${joinNaturalList(fields, 'ko')}과 규칙 판정 ${ruleCount}개를 같이 본 결과입니다.`
    }
    if (fields.length > 0) {
      return `이 판단은 ${joinNaturalList(fields, 'ko')}을 함께 본 결과입니다.`
    }
    if (setCount > 0) {
      return `이 판단은 교차 근거 묶음 ${setCount}개를 함께 본 결과입니다.`
    }
    return `이 판단은 규칙 판정 ${ruleCount}개를 같이 본 결과입니다.`
  }

  if (fields.length === 0 && setCount === 0 && ruleCount === 0) return ''
  if (fields.length > 0 && setCount > 0) {
    return `This judgment combines ${joinNaturalList(fields, 'en')} with ${setCount} cross-evidence bundles.`
  }
  if (fields.length > 0 && ruleCount > 0) {
    return `This judgment combines ${joinNaturalList(fields, 'en')} with ${ruleCount} rule checks.`
  }
  if (fields.length > 0) {
    return `This judgment is grounded in ${joinNaturalList(fields, 'en')}.`
  }
  if (setCount > 0) {
    return `This judgment is grounded in ${setCount} cross-evidence bundles.`
  }
  return `This judgment is grounded in ${ruleCount} rule checks.`
}

function describeGraphEvidenceWhyDetailed(input: {
  focusDomainLabel?: string
  overlapDomains?: string[]
  overlapScore?: number | null
  orbFitScore?: number | null
  lang?: HumanSemanticsLang
}): { focusReason: string; graphReason: string } {
  const {
    focusDomainLabel = '',
    overlapDomains = [],
    overlapScore,
    orbFitScore,
    lang = 'ko',
  } = input
  const overlapText = overlapDomains.filter(Boolean).join(', ')
  const overlapSuffix = overlapText
    ? lang === 'ko'
      ? ` 지금 겹침은 ${overlapText} 쪽에 가장 많이 몰려 있습니다.`
      : ` The strongest overlap sits on ${overlapText}.`
    : ''
  const focusKey = detectConflictFocusKey(focusDomainLabel || overlapDomains[0] || '')
  const overlap = Number.isFinite(Number(overlapScore)) ? Number(overlapScore) : null
  const orbFit = Number.isFinite(Number(orbFitScore)) ? Number(orbFitScore) : null

  if (lang === 'ko') {
    if (focusKey === 'love') {
      return {
        focusReason: `관계에서는 호감의 크기보다 누가 먼저 묻고, 어느 선까지 확인하고, 답장 속도를 어떻게 맞추는지가 실제 진전을 더 크게 바꿉니다.${overlapSuffix}`,
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 감정 해석보다 대화 순서와 확인 포인트를 조정하는 데 더 유효합니다.`
            : '상위 근거 묶음은 감정의 크기보다 대화 순서, 답장 속도, 확인 포인트를 잡는 데 더 유효합니다.',
      }
    }
    if (focusKey === 'career') {
      return {
        focusReason: `커리어에서는 가능성 자체보다 무엇을 맡고 어디까지 책임질지, 마감을 어디에 끊을지가 실제 성과를 더 크게 바꿉니다.${overlapSuffix}`,
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 맡을 일과 미룰 일을 가르고 책임 선을 끊는 데 더 유효합니다.`
            : '상위 근거 묶음은 역할, 책임 범위, 마감 선을 함께 잡는 데 더 유효합니다.',
      }
    }
    if (focusKey === 'money') {
      return {
        focusReason: `재정에서는 큰 기대수익보다 얼마를 넣고 언제 회수하며 어디서 멈출지, 즉 금액·기한·손실 상한이 실제 결과를 더 크게 바꿉니다.${overlapSuffix}`,
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 투입 시점과 회수 시점, 손실 상한을 끊는 데 더 유효합니다.`
            : '상위 근거 묶음은 투입 시점, 회수 시점, 손실 상한을 함께 잡는 데 더 유효합니다.',
      }
    }
    if (focusKey === 'health') {
      return {
        focusReason: `건강에서는 의지로 버티는 힘보다 언제 쉬어야 회복이 붙는지, 과부하 신호를 어디서 끊어야 하는지가 실제 컨디션을 더 크게 바꿉니다.${overlapSuffix}`,
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 무리할 때보다 쉬어야 할 타이밍과 회복 리듬을 읽는 데 더 유효합니다.`
            : '상위 근거 묶음은 과부하 신호와 회복 리듬을 함께 읽는 데 더 유효합니다.',
      }
    }
    if (focusKey === 'move') {
      return {
        focusReason: `이동과 변화에서는 결심의 크기보다 어떤 순서로 옮기고, 중간 거점을 둘지, 준비 기간을 얼마나 둘지가 실제 흔들림을 더 크게 바꿉니다.${overlapSuffix}`,
        graphReason:
          overlap !== null && orbFit !== null
            ? `상위 근거 묶음은 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 이동 순서와 예비안, 준비 기간을 읽는 데 더 유효합니다.`
            : '상위 근거 묶음은 이동 순서, 예비안, 준비 기간을 함께 읽는 데 더 유효합니다.',
      }
    }

    return {
      focusReason: overlapText
        ? `가장 강한 겹침은 ${overlapText} 축에 몰려 있고, 지금은 여러 근거가 같은 방향으로 밀어주는 축부터 읽는 편이 안전합니다.`
        : '겹치는 근거가 상대적으로 선명한 축부터 읽는 편이 안전합니다.',
      graphReason:
        overlap !== null && orbFit !== null
          ? `상위 근거 묶음은 overlap ${overlap}, orb fit ${orbFit} 수준으로 맞물려, 여러 신호가 같은 방향을 가리키는지 확인하는 데 유효합니다.`
          : '상위 근거 묶음은 여러 신호가 같은 방향을 가리키는지 확인하는 데 유효합니다.',
    }
  }

  if (focusKey === 'love') {
    return {
      focusReason: `In relationships, practical progress changes less from raw feeling and more from who asks first, what gets confirmed, and how reply pace is matched.${overlapSuffix}`,
      graphReason:
        overlap !== null && orbFit !== null
          ? `The top evidence bundle aligns around overlap ${overlap} and orb fit ${orbFit}, which makes it more useful for pacing and confirmation than raw feeling.`
          : 'The top evidence bundle is more useful for pacing and confirmation than raw feeling.',
    }
  }
  if (focusKey === 'career') {
    return {
      focusReason: `In career matters, the outcome changes less from abstract opportunity and more from role clarity, ownership, and where the deadline line is drawn.${overlapSuffix}`,
      graphReason:
        overlap !== null && orbFit !== null
          ? `The top evidence bundle aligns around overlap ${overlap} and orb fit ${orbFit}, which makes it better for deciding what to own now and what to defer.`
          : 'The top evidence bundle is better for deciding what to own now and what to defer.',
    }
  }
  if (focusKey === 'money') {
    return {
      focusReason: `In money matters, the result changes less from upside expectations and more from amount, timing, and where downside is capped.${overlapSuffix}`,
      graphReason:
        overlap !== null && orbFit !== null
          ? `The top evidence bundle aligns around overlap ${overlap} and orb fit ${orbFit}, which makes it more useful for sizing, recovery timing, and downside control.`
          : 'The top evidence bundle is more useful for sizing, recovery timing, and downside control.',
    }
  }
  if (focusKey === 'health') {
    return {
      focusReason: `In health matters, the result changes less from willpower and more from where overload starts and how recovery rhythm is protected.${overlapSuffix}`,
      graphReason:
        overlap !== null && orbFit !== null
          ? `The top evidence bundle aligns around overlap ${overlap} and orb fit ${orbFit}, which makes it better for reading overload signals and recovery timing.`
          : 'The top evidence bundle is better for reading overload signals and recovery timing.',
    }
  }
  if (focusKey === 'move') {
    return {
      focusReason: `In movement and change, the outcome changes less from a bold decision and more from sequence, buffer time, and fallback structure.${overlapSuffix}`,
      graphReason:
        overlap !== null && orbFit !== null
          ? `The top evidence bundle aligns around overlap ${overlap} and orb fit ${orbFit}, which makes it better for sequencing and fallback planning.`
          : 'The top evidence bundle is better for sequencing and fallback planning.',
    }
  }

  return {
    focusReason: overlapText
      ? `The strongest overlap sits on ${overlapText}, so starting from that axis is the most stable reading path.`
      : 'The safer move is to begin from the axis where overlap is clearest.',
    graphReason:
      overlap !== null && orbFit !== null
        ? `The top evidence bundle locks in around overlap ${overlap} and orb fit ${orbFit}, so it is the best grounded starting point.`
        : 'The top evidence bundle is useful because several signals still point in the same direction.',
  }
}

function withTopicParticle(label: string): string {
  if (!label) return ''
  const lastChar = label[label.length - 1]
  const code = lastChar.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return `${label}은`
  const hasBatchim = (code - 0xac00) % 28 !== 0
  return `${label}${hasBatchim ? '은' : '는'}`
}

function cleanTimingDetail(value: string | null | undefined, lang: HumanSemanticsLang): string {
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

function formatTimingCondition(
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

function renderTimingEntrySentence(entry: string, lang: HumanSemanticsLang): string {
  if (!entry) return ''
  if (lang === 'ko') {
    return /(때|경우|상태)$/.test(entry)
      ? `들어갈 때는 ${entry} 먼저 맞아야 합니다.`
      : `들어갈 때는 ${entry}가 먼저 맞아야 합니다.`
  }
  return `This works better when ${entry} is in place.`
}

function renderTimingAbortSentence(abort: string, lang: HumanSemanticsLang): string {
  if (!abort) return ''
  if (lang === 'ko') {
    return /(때|상황|조짐|않기|있으면)$/.test(abort)
      ? `반대로 ${abort} 확정을 늦추는 편이 안전합니다.`
      : `반대로 ${abort} 조짐이 보이면 확정을 늦추는 편이 안전합니다.`
  }
  return `Slow down if ${abort} starts to show up.`
}

function joinNaturalList(items: string[], lang: HumanSemanticsLang): string {
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

function describeDomainTimingAngle(domainLabel: string, lang: HumanSemanticsLang): string {
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

function normalizePhaseLabel(phaseLabel?: string | null): string {
  return String(phaseLabel || '')
    .trim()
    .toLowerCase()
}

export function describePhaseFlow(
  phaseLabel: string | undefined,
  lang: HumanSemanticsLang = 'ko'
): string {
  const phase = normalizePhaseLabel(phaseLabel)

  if (lang === 'ko') {
    if (!phase) return '지금은 빨리 움직이는 것보다 순서를 바로 잡는 쪽이 결과가 좋습니다.'
    if (phase.includes('defensive') || phase.includes('reset') || phase.includes('stabil')) {
      return '새 일을 벌리기보다 이미 잡힌 일정과 조건을 정리하고 실수 포인트를 줄이는 쪽이 맞습니다.'
    }
    if (phase.includes('high_tension') && phase.includes('expansion')) {
      return '기회는 있지만 말 한마디, 일정 하나로 틀어지기 쉬워서 확인 절차를 끼워 넣어야 합니다.'
    }
    if (phase.includes('guarded') && phase.includes('expansion')) {
      return '좋아 보이는 문은 열려 있지만 한 번에 크게 벌리기보다 범위를 나눠 가는 편이 안전합니다.'
    }
    if (phase.includes('expansion')) {
      return '머뭇거리던 일을 앞으로 밀기 좋고, 중요한 결정도 기준만 분명하면 속도를 낼 수 있습니다.'
    }
    if (phase.includes('tension')) {
      return '판단 자체보다 사람 사이 조율과 조건 맞추기가 먼저라, 결론을 급히 내릴수록 비용이 커질 수 있습니다.'
    }
    return '밀 수 있는 부분과 멈춰 확인할 부분을 나눠서 가야 덜 흔들립니다.'
  }

  if (!phase) return 'Getting the order right matters more than moving fast right now.'
  if (phase.includes('defensive') || phase.includes('reset') || phase.includes('stabil')) {
    return 'This is better for tightening loose ends and reducing mistakes than for starting something new in a rush.'
  }
  if (phase.includes('high_tension') && phase.includes('expansion')) {
    return 'Opportunity exists, but the margin for communication or timing mistakes is thin, so verification has to be built into the move.'
  }
  if (phase.includes('guarded') && phase.includes('expansion')) {
    return 'There is room to move, but it is safer to expand in smaller controlled steps than in one large push.'
  }
  if (phase.includes('expansion')) {
    return 'This is a good window for pushing important priorities forward, especially if your standards are already clear.'
  }
  if (phase.includes('tension')) {
    return 'Coordination matters more than speed here, and forcing a quick answer can create avoidable cost.'
  }
  return 'Move, but separate what can be pushed now from what still needs checking.'
}

export function describeExecutionStance(
  attackPercent: number | undefined,
  defensePercent: number | undefined,
  lang: HumanSemanticsLang = 'ko'
): string {
  const attack = Number.isFinite(attackPercent) ? Number(attackPercent) : 50
  const defense = Number.isFinite(defensePercent) ? Number(defensePercent) : 50
  const delta = attack - defense

  if (lang === 'ko') {
    if (delta >= 18) {
      return '지금은 눈에 띄는 일 하나를 먼저 끝내는 편이 좋고, 중요한 안건도 미루기보다 기준을 세운 뒤 바로 밀어붙이는 쪽이 낫습니다.'
    }
    if (delta <= -18) {
      return '성과를 더 키우려 하기보다 누락, 오해, 비용 새는 지점을 막는 쪽이 먼저입니다. 범위를 줄이면 결과가 더 안정됩니다.'
    }
    return '속도는 낼 수 있지만, 바로 확정하지 말고 체크포인트를 하나씩 끼워 넣는 운영이 가장 현실적입니다.'
  }

  if (delta >= 18) {
    return 'Momentum is stronger than drag, so it is better to finish one visible priority first and push key decisions with clear criteria.'
  }
  if (delta <= -18) {
    return 'Protecting against leakage and preventable mistakes matters more than chasing more upside right now.'
  }
  return 'You can move at a decent pace, but the most realistic approach is to add checkpoint-style verification before final commitment.'
}

export function describeEvidenceConfidence(
  confidence: number | undefined,
  lang: HumanSemanticsLang = 'ko'
): string {
  const score = Math.max(0, Math.min(100, Math.round(confidence ?? 0)))

  if (lang === 'ko') {
    if (score >= 70)
      return '근거가 비교적 또렷해서 방향을 잡고 실행 우선순위를 정하기가 수월한 편입니다.'
    if (score >= 40)
      return '한쪽으로 단정할 정도는 아니지만, 확인을 곁들이면 충분히 참고할 수 있는 수준입니다.'
    return '근거가 서로 엇갈려서 확신을 크게 싣기보다는 보수적으로 읽는 편이 안전합니다.'
  }

  if (score >= 70)
    return 'The evidence is clear enough to guide both direction and execution order.'
  if (score >= 40)
    return 'The evidence is usable, but it works best when paired with one extra round of checking.'
  return 'The evidence is mixed enough that a conservative interpretation is safer than a confident push.'
}

export function describeCrossAgreement(
  agreement: number | undefined,
  lang: HumanSemanticsLang = 'ko'
): string {
  if (!Number.isFinite(agreement)) return ''
  const score = Math.max(0, Math.min(100, Math.round(Number(agreement))))

  if (lang === 'ko') {
    if (score >= 70)
      return '여러 근거가 거의 같은 방향을 가리켜서, 큰 흐름을 믿고 움직여도 되는 편입니다.'
    if (score >= 45)
      return '좋아 보이는 부분도 있지만 바로 확정하기엔 걸리는 포인트가 함께 보여서 한 번 더 확인하는 편이 좋습니다.'
    return '근거들이 서로 다른 얘기를 하고 있어, 서두르는 쪽보다 속도를 늦추는 쪽이 안전합니다.'
  }

  if (score >= 70)
    return 'The evidence sources are mostly aligned, so the broader direction is fairly trustworthy.'
  if (score >= 45)
    return 'There is visible upside, but enough friction remains that one more check is worth it.'
  return 'The evidence is pulling in different directions, so slower execution is the safer call.'
}

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

function detectConflictFocusKey(
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

export function describeTimingWindowLabel(
  window: HumanTimingWindow | string | undefined,
  lang: HumanSemanticsLang = 'ko'
): string {
  const value = String(window || '').trim()
  if (lang === 'ko') {
    switch (value) {
      case 'now':
        return '지금 바로 움직임을 걸 수 있는 구간'
      case '1-3m':
        return '앞으로 1~3개월 안에 흐름이 붙기 쉬운 구간'
      case '3-6m':
        return '3~6개월 안에 조건을 갖춰야 힘이 붙는 구간'
      case '6-12m':
        return '반년 안쪽에서 천천히 열리는 구간'
      case '12m+':
        return '1년 이상 보고 준비해야 하는 구간'
      default:
        return '시기를 나눠서 보는 편이 좋은 구간'
    }
  }

  switch (value) {
    case 'now':
      return 'a window that can be acted on now'
    case '1-3m':
      return 'a window likely to open within the next one to three months'
    case '3-6m':
      return 'a window that strengthens once conditions are built over three to six months'
    case '6-12m':
      return 'a slower window that opens within the next half year'
    case '12m+':
      return 'a long-range window that needs preparation over a year or more'
    default:
      return 'a window that benefits from staged timing'
  }
}

export function describeTimingWindowTakeaways(input: {
  domainLabel?: string
  window: HumanTimingWindow | string | undefined
  whyNow?: string | null
  entryConditions?: string[]
  abortConditions?: string[]
  timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
  precisionReason?: string | null
  timingConflictNarrative?: string | null
  lang?: HumanSemanticsLang
}): string[] {
  const {
    domainLabel = '',
    window,
    whyNow,
    entryConditions = [],
    abortConditions = [],
    precisionReason,
    timingConflictNarrative,
    lang = 'ko',
  } = input

  const label = describeTimingWindowLabel(window, lang)
  const cleanedWhyNow = cleanTimingDetail(whyNow, lang)
  const cleanedConflict = cleanTimingDetail(timingConflictNarrative, lang)
  const cleanedPrecision = cleanTimingDetail(precisionReason, lang)
  const cleanedEntry = entryConditions
    .map((item) => formatTimingCondition(cleanTimingDetail(item, lang), 'entry', lang))
    .filter(Boolean)
  const cleanedAbort = abortConditions
    .map((item) => formatTimingCondition(cleanTimingDetail(item, lang), 'abort', lang))
    .filter(Boolean)
  const angle = describeDomainTimingAngle(domainLabel, lang)

  if (lang === 'ko') {
    const opening = [
      domainLabel ? `${withTopicParticle(domainLabel)} ${label}입니다.` : `${label}입니다.`,
      cleanedWhyNow,
    ]
      .filter(Boolean)
      .join(' ')

    const entryLine =
      cleanedEntry.length > 0
        ? `실제로 움직이려면 ${joinNaturalList(cleanedEntry.slice(0, 2), lang)}가 먼저 맞아야 합니다.`
        : ''
    const abortLine =
      cleanedAbort.length > 0
        ? `반대로 ${joinNaturalList(cleanedAbort.slice(0, 2), lang)} 조짐이 보이면 범위를 줄이고 확정을 늦추는 편이 안전합니다.`
        : ''

    return [opening, cleanedConflict, entryLine, abortLine, cleanedPrecision, angle].filter(Boolean)
  }

  const opening = [domainLabel ? `In ${domainLabel}, this is ${label}.` : label, cleanedWhyNow]
    .filter(Boolean)
    .join(' ')
  const entryLine =
    cleanedEntry.length > 0
      ? `This tends to open when ${joinNaturalList(cleanedEntry.slice(0, 2), lang)} are in place.`
      : ''
  const abortLine =
    cleanedAbort.length > 0
      ? `Slow down and narrow the move if ${joinNaturalList(cleanedAbort.slice(0, 2), lang)} start to show up.`
      : ''
  return [opening, cleanedConflict, entryLine, abortLine, cleanedPrecision, angle].filter(Boolean)
}

export function describeTimingWindowBrief(input: {
  domainLabel?: string
  window: HumanTimingWindow | string | undefined
  whyNow?: string | null
  entryConditions?: string[]
  abortConditions?: string[]
  timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
  precisionReason?: string | null
  timingConflictNarrative?: string | null
  lang?: HumanSemanticsLang
}): string {
  const {
    domainLabel = '',
    window,
    whyNow,
    entryConditions = [],
    abortConditions = [],
    timingGranularity,
    precisionReason,
    timingConflictNarrative,
    lang = 'ko',
  } = input

  const takeaways = describeTimingWindowTakeaways({
    domainLabel,
    window,
    whyNow,
    entryConditions,
    abortConditions,
    timingGranularity,
    precisionReason,
    timingConflictNarrative,
    lang,
  })

  if (lang === 'ko') {
    const [opening = '', entry = '', abort = ''] = takeaways
    return [opening, entry || abort].filter(Boolean).join(' ')
  }

  const [opening = '', entry = '', abort = ''] = takeaways
  return [opening, entry || abort].filter(Boolean).join(' ')
}

export function describeTimingWindowNarrative(input: {
  domainLabel?: string
  window: HumanTimingWindow | string | undefined
  whyNow?: string | null
  entryConditions?: string[]
  abortConditions?: string[]
  timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
  precisionReason?: string | null
  timingConflictNarrative?: string | null
  lang?: HumanSemanticsLang
}): string {
  const {
    domainLabel = '',
    window,
    whyNow,
    entryConditions = [],
    abortConditions = [],
    timingGranularity,
    precisionReason,
    timingConflictNarrative,
    lang = 'ko',
  } = input

  return describeTimingWindowTakeaways({
    domainLabel,
    window,
    whyNow,
    entryConditions,
    abortConditions,
    timingGranularity,
    precisionReason,
    timingConflictNarrative,
    lang,
  }).join(' ')
}

export function describeTimingCalibrationSummary(input: {
  reliabilityBand?: 'low' | 'medium' | 'high' | null
  reliabilityScore?: number | null
  pastStability?: number | null
  futureStability?: number | null
  backtestConsistency?: number | null
  lang?: HumanSemanticsLang
}): string {
  const {
    reliabilityBand,
    reliabilityScore,
    pastStability,
    futureStability,
    backtestConsistency,
    lang = 'ko',
  } = input

  if (!reliabilityBand) return ''

  const score =
    typeof reliabilityScore === 'number' && Number.isFinite(reliabilityScore)
      ? Math.round(Math.max(0, Math.min(1, reliabilityScore)) * 100)
      : null
  const past =
    typeof pastStability === 'number' && Number.isFinite(pastStability)
      ? Math.round(Math.max(0, Math.min(1, pastStability)) * 100)
      : null
  const future =
    typeof futureStability === 'number' && Number.isFinite(futureStability)
      ? Math.round(Math.max(0, Math.min(1, futureStability)) * 100)
      : null
  const consistency =
    typeof backtestConsistency === 'number' && Number.isFinite(backtestConsistency)
      ? Math.round(Math.max(0, Math.min(1, backtestConsistency)) * 100)
      : null

  if (lang === 'ko') {
    if (reliabilityBand === 'high') {
      return `과거·미래 월별 재계산과 월중 강한 창 비교 기준으로 타이밍 신뢰도는 높은 편입니다${
        score !== null ? ` (${score}%)` : ''
      }.`
    }
    if (reliabilityBand === 'medium') {
      return `과거·미래 월별 재계산과 월중 강한 창 비교 기준으로 타이밍 신뢰도는 중간 수준입니다${
        past !== null || future !== null || consistency !== null
          ? ` (과거 안정성 ${past ?? '-'}%, 미래 안정성 ${future ?? '-'}%, 일관성 ${consistency ?? '-'}%)`
          : ''
      }.`
    }
    return `과거·미래 월별 재계산과 월중 강한 창 비교 기준으로 타이밍 신뢰도는 낮은 편이므로, 월 전체 평균보다 월중 강한 구간 해석에 무게를 두는 편이 맞습니다.`
  }

  if (reliabilityBand === 'high') {
    return `Month-by-month backtesting, anchored to the stronger intra-month window, puts timing reliability in the high band${
      score !== null ? ` (${score}%)` : ''
    }.`
  }
  if (reliabilityBand === 'medium') {
    return `Month-by-month backtesting, anchored to the stronger intra-month window, puts timing reliability in the medium band${
      past !== null || future !== null || consistency !== null
        ? ` (past stability ${past ?? '-'}%, future stability ${future ?? '-'}%, consistency ${consistency ?? '-'}%)`
        : ''
    }.`
  }
  return 'Month-by-month backtesting, anchored to the stronger intra-month window, puts timing reliability in the low band, so this should be read as a window rather than a precise date call.'
}

export function describeIntraMonthPeakWindow(input: {
  domainLabel?: string
  points?: Array<{ probeDay?: number; peakLevel?: 'peak' | 'high' | 'normal' }> | null
  lang?: HumanSemanticsLang
}): string {
  const { domainLabel = '', points = [], lang = 'ko' } = input
  const point = (points || [])[0]
  if (!point?.probeDay) return ''

  const bucket = describeProbeWindowBucket(point.probeDay, lang)

  if (lang === 'ko') {
    const prefix = domainLabel ? `${withTopicParticle(domainLabel)} ` : ''
    if (point.peakLevel === 'peak') {
      return `${prefix}월 전체 평균보다 ${bucket} 창이 특히 강하게 잡힙니다.`
    }
    return `${prefix}월 전체 평균보다 ${bucket} 창을 더 눈여겨보는 편이 맞습니다.`
  }

  const prefix = domainLabel ? `For ${domainLabel}, ` : ''
  if (point.peakLevel === 'peak') {
    return `${prefix}the timing runs stronger through ${bucket} than through a flat month average.`
  }
  return `${prefix}${bucket} matters more than a flat month average here.`
}
