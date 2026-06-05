import type { HumanSemanticsLang } from './humanSemantics'
import { joinNaturalList, withTopicParticle } from './humanSemanticsTimingSupport'
import { detectConflictFocusKey } from './humanSemanticsConflictSupport'

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
      sajuReason ? `사주 쪽에서는 ${sajuReason}` : '',
      astroReason ? `점성 쪽에서는 ${astroReason}` : '',
      crossReason
        ? `${focusDomainLabel ? `${withTopicParticle(focusDomainLabel)} ` : ''}${crossReason}`
        : '',
      graphReason ? `겹치는 근거를 보면 ${graphReason}` : '',
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
