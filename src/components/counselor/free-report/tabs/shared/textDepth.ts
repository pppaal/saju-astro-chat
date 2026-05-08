export type DepthTopic =
  | 'general'
  | 'personality'
  | 'career'
  | 'fortune'
  | 'timing'
  | 'health'
  | 'warning'
  | 'healing'
  | 'karma'
  | 'hidden'

function splitSentences(text: string): string[] {
  const trimmed = (text || '').trim()
  if (!trimmed) return []

  const byPunctuation = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (byPunctuation.length > 0) return byPunctuation
  return [trimmed]
}

function withEnding(sentence: string): string {
  const s = sentence.trim()
  if (!s) return ''
  if (/[.!?]$/.test(s)) return s
  return `${s}.`
}

function fallbackSentences(topic: DepthTopic, isKo: boolean): string[] {
  if (isKo) {
    switch (topic) {
      case 'personality':
        return [
          '이 성향은 상황에 따라 강점으로도, 부담으로도 작동할 수 있으니 맥락을 함께 보세요.',
          '당장의 기분보다 반복 패턴을 관찰하면 자기 이해의 정확도가 크게 올라갑니다.',
          '가까운 관계와 일에서 같은 반응이 반복되는지 기록하면 개선 포인트가 선명해집니다.',
          '작은 행동 실험을 1주만 해도 성향을 성장 자원으로 바꾸는 감각이 생깁니다.',
        ]
      case 'career':
        return [
          '직업운 해석은 재능 자체보다 환경 적합도와 실행 루틴을 함께 맞출 때 성과가 커집니다.',
          '강점은 유지하고 약점은 프로세스로 보완하는 설계를 하면 변동성에도 흔들리지 않습니다.',
          '이번 흐름에서는 속도보다 우선순위 정렬이 중요하니 핵심 과제를 먼저 좁혀 보세요.',
          '성과를 만드는 기준을 숫자나 마감으로 명확히 두면 의사결정 피로가 줄어듭니다.',
        ]
      case 'fortune':
        return [
          '운의 파도는 고정값이 아니라 선택과 타이밍에 따라 체감 강도가 달라집니다.',
          '좋은 시기에는 확장보다 검증 가능한 한 걸음을 먼저 두는 편이 장기적으로 유리합니다.',
          '주의 신호가 보일 때는 계획을 줄이고 확인 절차를 늘리면 손실을 줄일 수 있습니다.',
          '하루·한 달·한 해의 흐름을 연결해 보면 지금 집중해야 할 축이 더 명확해집니다.',
        ]
      case 'timing':
        return [
          '타이밍 해석은 좋고 나쁨의 단순 구분보다 어떤 행동을 언제 배치할지가 핵심입니다.',
          '상승 구간에는 준비된 안건을 실행하고, 변동 구간에는 검토와 조정을 우선하세요.',
          '같은 기회라도 시점을 조절하면 리스크와 피로도를 크게 줄일 수 있습니다.',
          '중요 결정 전에는 하루 간격 재검토를 두면 오류 확률이 눈에 띄게 낮아집니다.',
        ]
      case 'hidden':
        return [
          '무의식 영역은 문제라기보다 아직 언어화되지 않은 에너지로 보는 편이 정확합니다.',
          '억눌린 감정과 욕구를 구체화하면 관계와 일에서 불필요한 오해를 줄일 수 있습니다.',
          '숨겨진 재능은 강한 자극보다 안정적인 루틴에서 더 빨리 드러나는 경향이 있습니다.',
          '내면 신호를 기록하고 작은 실행으로 연결하면 자기통합 속도가 빨라집니다.',
        ]
      case 'health':
        return [
          '건강 흐름은 하루 컨디션보다 주간 패턴으로 읽을 때 해석 정확도가 올라갑니다.',
          '초기 피로 신호를 가볍게 넘기지 않으면 큰 하락 구간을 예방할 수 있습니다.',
          '수면·수분·식사 타이밍을 고정하면 회복 속도와 집중력이 함께 개선됩니다.',
          '한 번에 크게 바꾸기보다 7일 단위로 한 습관씩 조정하는 방식이 지속됩니다.',
        ]
      case 'warning':
        return [
          '경고 문구는 불안 유발이 아니라 조정 포인트를 알려주는 안내로 이해하면 됩니다.',
          '반복되는 트리거 상황을 기록하면 어떤 장면에서 흔들리는지 빠르게 파악할 수 있습니다.',
          '과도한 대응보다 기본 루틴 안정화가 실제 리스크를 줄이는 데 더 효과적입니다.',
          '확정 행동보다 점검 행동을 먼저 두면 결과 편차를 크게 낮출 수 있습니다.',
        ]
      case 'healing':
        return [
          '치유는 감정을 없애는 과정이 아니라 감정의 신호를 정확히 읽는 과정에 가깝습니다.',
          '몸 반응과 마음 반응을 함께 관찰하면 회복 선택의 품질이 좋아집니다.',
          '단기 강도보다 장기 지속 가능성을 우선하면 재발 가능성을 줄일 수 있습니다.',
          '자기비난 대신 조정 가능한 행동을 선택하는 태도가 회복의 속도를 높입니다.',
        ]
      case 'karma':
        return [
          '카르마 해석은 운명 고정이 아니라 반복 선택 패턴을 읽는 도구로 보는 것이 좋습니다.',
          '익숙한 반응을 한 번만 바꿔도 관계와 결과의 흐름이 달라질 수 있습니다.',
          '정답을 찾기보다 실행 가능한 기준을 세우는 편이 현실 변화에 더 유리합니다.',
          '관찰-기록-수정의 순환을 만들면 내면 과제가 삶의 자산으로 전환됩니다.',
        ]
      default:
        return [
          '핵심은 해석 자체보다 해석을 행동으로 연결하는 실행 구조를 만드는 것입니다.',
          '짧은 기록만 유지해도 다음 선택의 정확도와 속도를 동시에 높일 수 있습니다.',
          '완벽한 계획보다 일관된 작은 실행이 실제 변화를 더 빠르게 만듭니다.',
          '반복 패턴을 인식하고 조정하면 같은 문제의 재발 빈도가 줄어듭니다.',
        ]
    }
  }

  switch (topic) {
    case 'personality':
      return [
        'Treat this trait as contextual: it can be a strength or a burden depending on the situation.',
        'Pattern tracking is more reliable than one-time emotions for self-understanding.',
        'Notice where the same reactions repeat in relationships and work.',
        'A one-week behavior experiment can convert traits into practical strengths.',
      ]
    case 'career':
      return [
        'Career outcomes depend on environment fit and execution rhythm, not talent alone.',
        'Keep strengths as-is and compensate weak points with process design.',
        'In this phase, narrowing priorities beats moving faster.',
        'Clear success metrics reduce decision fatigue and improve consistency.',
      ]
    case 'fortune':
      return [
        'Fortune signals are dynamic and change with timing and choices.',
        'During favorable periods, prioritize verifiable progress over blind expansion.',
        'When caution appears, increase checks and reduce commitment size.',
        'Connect daily, monthly, and yearly signals to identify the true focus.',
      ]
    case 'timing':
      return [
        'Timing quality is about action placement, not simple good/bad labels.',
        'Use rising windows for prepared execution and volatile windows for review.',
        'Shifting timing can significantly reduce risk and fatigue.',
        'A 24-hour recheck before major decisions lowers avoidable errors.',
      ]
    case 'hidden':
      return [
        'Hidden patterns are often unarticulated energy, not flaws.',
        'Naming suppressed motives reduces confusion in work and relationships.',
        'Latent talent tends to surface under stable routines rather than intense pressure.',
        'Observation plus small action loops accelerate integration.',
      ]
    case 'health':
      return [
        'Read health through weekly trends, not single-day condition.',
        'Early small adjustments prevent larger energy drops later.',
        'Stabilizing sleep, hydration, and meal timing improves recovery quality.',
        'One habit change per week is more sustainable than drastic shifts.',
      ]
    case 'warning':
      return [
        'A warning is a guide for adjustment, not a fear signal.',
        'Record repeated contexts to identify triggers quickly.',
        'Routine stabilization outperforms extreme countermeasures.',
        'Check actions first, commitment actions later.',
      ]
    case 'healing':
      return [
        'Healing starts from accurately naming your current state.',
        'Observe emotional and physical reactions together.',
        'Sustainable routine changes are stronger than short bursts.',
        'Choose adjustable actions instead of self-blame loops.',
      ]
    case 'karma':
      return [
        'Read this as a repeating choice pattern, not fixed fate.',
        'Changing one familiar response can shift outcomes significantly.',
        'Execution standards matter more than perfect answers.',
        'Reflection-record-adjust cycles turn insight into growth.',
      ]
    default:
      return [
        'Convert interpretation into a concrete action sequence.',
        'Short records improve decision quality over time.',
        'Consistency beats intensity for real change.',
        'Pattern awareness lowers repeat mistakes.',
      ]
  }
}

export function ensureMinSentenceText(
  text: string,
  isKo: boolean,
  topic: DepthTopic = 'general',
  minSentences = 4
): string {
  const base = splitSentences(text).map(withEnding).filter(Boolean)
  if (base.length >= minSentences) return base.join(' ')

  const fallbacks = fallbackSentences(topic, isKo).map(withEnding)
  const result = [...base]

  for (const sentence of fallbacks) {
    if (result.length >= minSentences) break
    result.push(sentence)
  }

  return result.join(' ')
}

export function ensureMinNarrativeParagraphs(
  paragraphs: string[],
  isKo: boolean,
  topic: DepthTopic = 'general',
  minParagraphs = 4
): string[] {
  const contentCount = paragraphs.filter((p) => {
    const t = (p || '').trim()
    if (!t) return false
    if (t.startsWith('【') || t.includes('【')) return false
    return true
  }).length

  if (contentCount >= minParagraphs) return paragraphs

  const missing = minParagraphs - contentCount
  const extras = fallbackSentences(topic, isKo).slice(0, missing)
  return [...paragraphs, '', ...extras]
}
