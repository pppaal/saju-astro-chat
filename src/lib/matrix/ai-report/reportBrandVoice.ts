import { sanitizeUserFacingNarrative } from './reportNarrativeSanitizer'

type ReportVoiceContext = {
  focusDomain?: string
  actionFocusDomain?: string
  riskAxisLabel?: string
  topDecisionLabel?: string
  riskControl?: string
}

const KO_ABSTRACT_NOUN_REGEX =
  /(구조|흐름|변수|기준|방향|운영|관계|조건|리듬|가능성|판단|과제|국면|구간|영역|장면)/g

function setPathValue(target: Record<string, unknown>, path: string, value: string) {
  const parts = path.split('.')
  let cur: Record<string, unknown> = target
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]
    const next = cur[part]
    if (!next || typeof next !== 'object') {
      cur[part] = {}
    }
    cur = cur[part] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

function getPathValue(target: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cur: unknown = target
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : ''
}

function normalizeDomainLabel(value: string | undefined, lang: 'ko' | 'en'): string {
  if (!value) return lang === 'ko' ? '핵심 주제' : 'core theme'
  const lower = value.toLowerCase()
  if (lang === 'ko') {
    if (lower === 'career') return '일'
    if (lower === 'relationship') return '사람'
    if (lower === 'wealth') return '돈'
    if (lower === 'health') return '몸'
    if (lower === 'move') return '이동'
    if (lower === 'personality') return '기질'
    if (lower === 'spirituality') return '내면'
    if (lower === 'timing') return '시기'
  }
  return value
}

function ensureKoMetaphor(text: string, context: ReportVoiceContext): string {
  if (/같습니다|처럼 보입니다|마치/u.test(text)) return text
  const action = normalizeDomainLabel(context.actionFocusDomain, 'ko')
  const focus = normalizeDomainLabel(context.focusDomain, 'ko')
  const metaphor = `지금 삶은 바닥에서는 ${focus}의 물살이 흐르고, 손에는 ${action}의 방향타를 쥔 배와 같습니다.`
  return `${metaphor}\n\n${text}`.trim()
}

function ensureKoSecondPerson(text: string): string {
  if (/당신은|당신에게|당신의/u.test(text)) return text
  return text.replace(/^/, '당신은 ')
}

function reduceKoAbstractTone(text: string): string {
  return text
    .replace(/통합 레이어:?/g, '')
    .replace(/핵심 패턴이 중심을 잡고 있습니다\./g, '')
    .replace(/방어적 재정비 국면이며,?/g, '')
    .replace(
      /기본 구조에서 검토와 정밀 조정 성향이 강합니다\./g,
      '기본적으로 세밀하게 확인하고 조정하는 성향이 강합니다.'
    )
    .replace(
      /양 성향이 강해 역할과 존재감이 앞에 서는 구조입니다\./g,
      '밖으로 드러나는 역할과 존재감이 중요한 사람입니다.'
    )
    .replace(
      /확장 신호가 우세하여 실행력을 올리기 좋은 구간입니다\./g,
      '조건만 맞으면 실행력을 높이기 좋은 구간입니다.'
    )
    .replace(
      /전체 패턴을 실행 가능한 전략으로 압축합니다\./g,
      '지금은 흐름을 실제 전략으로 옮기는 힘이 중요합니다.'
    )
    .replace(/관계에서는 안정화 국면이며,\s*/g, '관계는 지금 속도보다 안정화가 우선이며, ')
    .replace(/관계 활성화 흐름이 활성화됩니다\./g, '관계에서 움직임이 커지는 시기입니다.')
    .replace(
      /재정 변동성 흐름이 활성화됩니다\./g,
      '재정은 흔들림이 커질 수 있어 기준 관리가 중요합니다.'
    )
    .replace(
      /커리어 확장 흐름이 활성화됩니다\./g,
      '커리어는 넓어질 기회가 강하게 들어오는 시기입니다.'
    )
    .replace(/Activation Pattern 패턴/gi, '활성화 흐름')
    .replace(/Volatility Pattern 패턴/gi, '변동성 흐름')
    .replace(/Activation Pattern/gi, '활성화 흐름')
    .replace(/Volatility Pattern/gi, '변동성 흐름')
    .replace(/\?이 몸에서는/g, '이 몸은')
    .replace(/결단력보다\./g, '결단력보다')
    .replace(
      /현실적인 분기점은 \? 쪽으로 열려 있습니다\./g,
      '현실적인 분기점은 여러 갈래로 열려 있습니다.'
    )
    .replace(
      /따라서 앞으로는 \? 같은 경로를 비교하면서 움직이는 편이 맞습니다\./g,
      '따라서 앞으로는 몇 가지 현실적인 경로를 비교하면서 움직이는 편이 맞습니다.'
    )
    .replace(
      /커리어 확장 패턴 근거가 유지될 것 같은 조건이 맞는 사람이 실제로 오래 갑니다\./g,
      '말보다 행동 기준이 분명하고, 서로의 속도를 맞출 수 있는 사람이 실제로 오래 갑니다.'
    )
    .replace(/커리어 확장 패턴 근거가 유지될 것\./g, '기준이 무너지지 않을 것.')
    .replace(
      /시나리오 확률이 [\d.]+% 아래로 떨어지면 중단/g,
      '가능성과 신뢰도가 눈에 띄게 꺾이면 멈춤'
    )
    .replace(/타이밍 적합도는 [\d.]+% 수준입니다\./g, '지금은 타이밍 적합도가 높은 편입니다.')
    .replace(
      /현실적인 분기점은\s*쪽으로 열려 있습니다\./g,
      '현실적인 분기점은 여러 갈래로 열려 있습니다.'
    )
    .replace(
      /앞으로는\s*같은 경로를 비교하면서 움직이는 편이 맞습니다\./g,
      '앞으로는 몇 가지 현실적인 경로를 비교하면서 움직이는 편이 맞습니다.'
    )
    .replace(
      /지금:\s*합의\s*\d+%\s*\/\s*충돌\s*\d+%\s*\/\s*촉발 선행\s*\/\s*1~3개월:\s*합의\s*\d+%\s*\/\s*충돌\s*\d+%\s*\/\s*거의 동시\s*\/\s*3~6개월:\s*합의\s*\d+%\s*\/\s*충돌\s*\d+%\s*\/\s*촉발 선행/gi,
      '가까운 시기부터 중기까지는 전반적으로 합의도가 높고, 충돌은 낮은 편입니다.'
    )
    .replace(
      /현재 타이밍은 지금 창이 가장 직접적이며,\s*/g,
      '현재는 조건이 맞으면 바로 움직일 수 있는 창이 열려 있으며, '
    )
    .replace(/\?\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function addKoConcreteExample(section: string, text: string, context: ReportVoiceContext): string {
  if (/예를 들어|예:|예시/u.test(text)) return text
  const risk = context.riskAxisLabel || '몸 상태'
  const lineBySection: Record<string, string> = {
    introduction:
      '예를 들어, 사람 문제로 마음이 흔들려도 이력서, 역할 정리, 협상 기준 같은 실무 문서를 먼저 잡아두는 사람이 이번 흐름을 더 잘 탑니다.',
    personalityDeep:
      '예를 들어, 하고 싶은 일이 생겼을 때 바로 결정부터 내리기보다 왜 그 일을 하려는지 한 문장으로 적는 습관이 당신에게 훨씬 잘 맞습니다.',
    careerPath:
      '예를 들어, 승진 제안이나 이직 이야기가 들어오면 직함보다 역할 범위, 의사결정 권한, 평가 기준부터 문서로 확인하는 편이 맞습니다.',
    relationshipDynamics:
      '예를 들어, 관계가 가까워질수록 연락 빈도나 만남 속도보다 서로의 일정과 경계가 맞는지부터 확인해야 오해를 줄일 수 있습니다.',
    spouseProfile:
      '예를 들어, 말이 통하는 사람보다 생활 리듬과 책임감이 맞는 사람이 실제로 오래 가는 인연이 될 가능성이 큽니다.',
    wealthPotential:
      '예를 들어, 수입이 늘어나는 선택이라도 취소 조건, 고정비 증가, 손실 상한을 먼저 적어두면 돈이 새는 구간을 줄일 수 있습니다.',
    healthGuidance: `예를 들어, ${risk} 때문에 일정이 흔들리기 쉬우니 수면 시간과 회복 루틴을 먼저 고정해두는 편이 전체 판단 품질을 지켜줍니다.`,
    lifeMission:
      '예를 들어, 눈앞의 성과 하나보다 앞으로 3년 동안 반복해서 지킬 기준 세 개를 정하는 쪽이 지금 더 큰 자산이 됩니다.',
    lifeStages:
      '예를 들어, 지금 세우는 기준이 중년기에는 평판과 성과의 형태로 굳어질 가능성이 큽니다.',
    turningPoints:
      '예를 들어, 큰 변화는 사건 하나로 오기보다 일, 사람, 돈의 기준을 동시에 다시 맞추는 식으로 들어올 가능성이 큽니다.',
    futureOutlook:
      '예를 들어, 앞으로 몇 년은 한 번의 대박보다 되돌릴 수 있는 작은 선택을 누적하는 사람이 더 멀리 갑니다.',
    timingAdvice:
      '예를 들어, 지금은 계약을 바로 확정하기보다 역할 범위와 중단 기준을 먼저 적어놓고 움직일 때 손실을 줄일 수 있습니다.',
    actionPlan:
      '예를 들어, 이번 주에는 선택지를 세 개 적고, 각각의 장단점과 중단 조건을 표로 정리하는 식이 가장 현실적입니다.',
    conclusion:
      '예를 들어, 같은 기회라도 먼저 기준을 세운 사람은 성과를 남기고, 기준 없이 받은 사람은 소모를 남깁니다.',
  }
  let extra = lineBySection[section]
  if (context.actionFocusDomain === 'move') {
    if (section === 'introduction') {
      extra =
        '예를 들어, 이사 후보가 여러 곳이라면 감정으로 고르기보다 통근 시간, 생활비, 계약 조건을 먼저 표로 비교하는 편이 맞습니다.'
    } else if (section === 'actionPlan') {
      extra =
        '예를 들어, 이번 주에는 후보 지역을 세 곳으로 좁히고 통근 시간, 생활비, 계약 조건을 나란히 비교해 보세요.'
    } else if (section === 'conclusion') {
      extra = ''
    }
  }
  if (!extra) return text
  return `${text}\n\n${extra}`.trim()
}

function punchUpKoConclusion(text: string, context: ReportVoiceContext): string {
  const punch =
    context.actionFocusDomain === 'move'
      ? '이번 승부는 서두르지 않고 순서를 지키는 데 달려 있습니다.'
      : '이번 승부는 속도가 아니라 순서입니다.'
  if (text.includes(punch)) return text
  return `${text}\n\n${punch}`.trim()
}

function ensureKoActionPlanGrounding(text: string, context: ReportVoiceContext): string {
  const parts: string[] = []
  const decision = String(context.topDecisionLabel || '').trim()
  const riskControl = String(context.riskControl || '').trim()

  if (decision && !text.includes(decision)) {
    parts.push(`지금 가장 맞는 기본 자세는 ${decision}입니다.`)
  }
  if (riskControl && !text.includes(riskControl)) {
    parts.push(riskControl)
  }
  if (parts.length === 0) return text
  return `${parts.join(' ')} ${text}`.replace(/\s{2,}/g, ' ').trim()
}

function rewriteKoSection(section: string, text: string, context: ReportVoiceContext): string {
  let next = sanitizeUserFacingNarrative(text)
  next = reduceKoAbstractTone(next)

  if (section === 'introduction') {
    next = ensureKoMetaphor(next, context)
    next = ensureKoSecondPerson(next)
  } else if (section === 'personalityDeep') {
    next = ensureKoSecondPerson(next)
  }

  next = addKoConcreteExample(section, next, context)

  if (section === 'actionPlan') {
    next = ensureKoActionPlanGrounding(next, context)
  }

  if (section === 'conclusion') {
    next = punchUpKoConclusion(next, context)
  }

  return next
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function applyReportBrandVoice(
  sections: Record<string, unknown>,
  orderedPaths: string[],
  lang: 'ko' | 'en',
  context: ReportVoiceContext = {}
): Record<string, unknown> {
  const next = { ...sections }
  for (const path of orderedPaths) {
    const value = getPathValue(next, path)
    if (!value) continue
    const section = path.split('.').pop() || path
    const rewritten =
      lang === 'ko' ? rewriteKoSection(section, value, context) : sanitizeUserFacingNarrative(value)
    setPathValue(next, path, rewritten)
  }
  return next
}

export type ReportStyleMetrics = {
  repetitiveLeadPatternCount?: number
  abstractNounRatio?: number
  sentenceLengthVariance?: number
  bilingualToneSkew?: number
}

export function buildReportStyleMetrics(
  sections: Record<string, unknown>,
  orderedPaths: string[],
  lang: 'ko' | 'en'
): ReportStyleMetrics {
  const texts = orderedPaths.map((path) => getPathValue(sections, path)).filter(Boolean)
  if (texts.length === 0) return {}

  const leads = texts.map((text) => text.split(/\n+/)[0]?.trim() || '').filter(Boolean)
  const leadCount = new Map<string, number>()
  for (const lead of leads) {
    const key = lead.replace(/\s+/g, ' ').slice(0, 48)
    leadCount.set(key, (leadCount.get(key) || 0) + 1)
  }
  const repetitiveLeadPatternCount = [...leadCount.values()].filter((count) => count > 1).length

  const joined = texts.join(' ')
  const tokenCount = joined.split(/\s+/).filter(Boolean).length || 1
  const abstractHits = lang === 'ko' ? (joined.match(KO_ABSTRACT_NOUN_REGEX) || []).length : 0
  const abstractNounRatio = Number((abstractHits / tokenCount).toFixed(4))

  const sentences = joined
    .split(/[.!?\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const lengths = sentences.map((sentence) => sentence.length)
  const avg = lengths.reduce((sum, len) => sum + len, 0) / Math.max(1, lengths.length)
  const variance =
    lengths.reduce((sum, len) => sum + (len - avg) ** 2, 0) / Math.max(1, lengths.length)
  const sentenceLengthVariance = Number(variance.toFixed(2))

  const englishWordCount = (joined.match(/[A-Za-z]{3,}/g) || []).length
  const hangulWordCount = (joined.match(/[가-힣]{2,}/g) || []).length
  const dominantLanguageCount = Math.max(englishWordCount, hangulWordCount, 1)
  const minorityLanguageCount = Math.min(englishWordCount, hangulWordCount)
  const bilingualToneSkew = Number((minorityLanguageCount / dominantLanguageCount).toFixed(4))

  return {
    repetitiveLeadPatternCount,
    abstractNounRatio,
    sentenceLengthVariance,
    bilingualToneSkew,
  }
}
