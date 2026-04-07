import type { HumanSemanticsLang } from './humanSemantics'

export function withTopicParticle(label: string): string {
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
