import { clamp, type LocaleCode, unique } from './routeSupportCommon'

export function describeScoreBand(score: number, locale: LocaleCode) {
  if (locale === 'ko') {
    if (score >= 85) return '매우 우수'
    if (score >= 75) return '우수'
    if (score >= 65) return '양호'
    if (score >= 55) return '조율 가능'
    return '주의 필요'
  }
  if (score >= 85) return 'Excellent'
  if (score >= 75) return 'Very Good'
  if (score >= 65) return 'Good'
  if (score >= 55) return 'Workable'
  return 'Challenging'
}

export type PlainThemeKind = 'personality' | 'emotional' | 'intimacy' | 'home' | 'communication'

export function plainThemeLabel(locale: LocaleCode, theme: PlainThemeKind) {
  if (locale === 'ko') {
    if (theme === 'personality') return '성격 궁합'
    if (theme === 'emotional') return '감정 궁합'
    if (theme === 'intimacy') return '친밀·속궁합'
    if (theme === 'home') return '생활·가정 궁합'
    return '소통 궁합'
  }

  if (theme === 'personality') return 'Personality fit'
  if (theme === 'emotional') return 'Emotional fit'
  if (theme === 'intimacy') return 'Intimacy chemistry'
  if (theme === 'home') return 'Home/Family fit'
  return 'Communication fit'
}

export function ensureMinLength(text: string, min: number, filler: string) {
  let out = text.trim()
  while (out.length < min) {
    out = `${out} ${filler}`.trim()
  }
  return out
}

export function plainThemeNarrative(locale: LocaleCode, theme: PlainThemeKind, score: number) {
  const isKo = locale === 'ko'
  const high = score >= 75
  const mid = score >= 60
  const band = describeScoreBand(score, locale)

  if (isKo) {
    const intro = `${plainThemeLabel(locale, theme)} 점수는 ${score}/100(${band})입니다. 이 수치는 단순히 좋고 나쁨을 판정하기 위한 값이 아니라, 두 사람의 관계에서 마찰이 생기기 쉬운 지점과 쉽게 맞물리는 지점을 구분하기 위한 실무 지표로 보시면 됩니다.`
    let body = ''

    if (theme === 'personality') {
      body = high
        ? '성향 구조가 비교적 잘 맞아 기본 생활 리듬, 우선순위 배치, 관계 내 역할 분담에서 충돌 확률이 낮은 편입니다. 다만 점수가 높아도 서로의 장점을 당연하게 여기면 오히려 배려가 줄어드는 문제가 생길 수 있으므로, 주 1회 정도는 이번 주에 서로에게 도움이 되었던 행동을 명시적으로 확인하는 루틴을 권장합니다. 또한 의사결정 방식이 유사한 시기에는 빠르게 합의가 되지만, 장기 계획에서는 세부 기준이 달라질 수 있으니 기준표를 미리 정리하는 것이 안정적입니다.'
        : mid
          ? '기본 성향은 맞는 부분과 다른 부분이 뚜렷하게 섞여 있는 구조입니다. 일상에서는 큰 문제 없이 지나가지만 피로가 누적되거나 일정이 촉박해지면 말투, 속도, 기대치의 차이가 빠르게 갈등으로 번질 수 있습니다. 따라서 역할을 유연하게 바꾸기보다, 책임 범위와 결정 권한을 사전에 분명히 정하는 방식이 더 효과적입니다. 특히 의견이 갈릴 때는 누가 맞는지보다 어떤 기준으로 판단할지를 먼저 합의하면 감정 소모를 크게 줄일 수 있습니다.'
          : '기본 성향 차이가 커서 같은 상황을 해석하는 방식이 자주 엇갈릴 가능성이 높습니다. 이런 구간에서는 즉흥적 대화나 분위기 중심 합의가 반복적으로 실패할 수 있으므로, 갈등 발생 전부터 합의 절차를 문장으로 정의해 두는 것이 중요합니다. 예를 들어, 이슈 제기-상대 요약-대안 2개 제시-선택의 순서를 고정하면 감정적 소모를 줄일 수 있습니다. 점수가 낮더라도 절차가 안정되면 관계 만족도는 충분히 개선될 수 있으니, 규칙 기반 운영을 먼저 구축하는 접근이 필요합니다.'
    } else if (theme === 'emotional') {
      body = high
        ? '감정 표현의 타이밍과 공감의 방향이 잘 맞는 편이라, 상대가 원하는 정서적 반응을 비교적 빠르게 주고받을 수 있습니다. 이런 구간에서는 사소한 불편이 커지기 전에 자연스럽게 해소되는 장점이 있습니다. 다만 친밀도가 높을수록 “말 안 해도 알겠지”라는 기대가 생기기 쉬우므로, 감정 상태를 추측으로 처리하지 말고 짧은 확인 질문으로 명확히 하는 습관이 필요합니다. 특히 피곤한 날이나 외부 스트레스가 큰 날에는 감정 언어를 단순화해 전달해야 오해가 줄고 회복 속도가 빨라집니다.'
        : mid
          ? '감정 온도는 맞는 순간과 어긋나는 순간이 번갈아 나타나는 패턴입니다. 한쪽은 공감을 원할 때 다른 쪽이 해결책을 먼저 제시하거나, 반대로 실무적 대안이 필요한데 정서적 위로가 먼저 나와 답답함이 생길 수 있습니다. 이 경우 “지금은 공감이 먼저 필요한지, 해결이 먼저 필요한지”를 대화 시작 문장에 포함시키면 오해를 줄일 수 있습니다. 또한 감정이 커진 직후 결론을 내리기보다 20~30분 냉각 시간을 둔 뒤 재논의하면, 같은 주제도 훨씬 부드럽게 정리되는 경향이 있습니다.'
          : '감정 해석 방식의 차이가 커서 작은 표현도 다르게 받아들일 가능성이 높습니다. 이런 조합에서는 의도와 전달 방식이 자주 분리되어, 실제 메시지보다 말투나 타이밍이 갈등의 핵심이 되기 쉽습니다. 따라서 감정 대화에는 즉답보다 구조가 필요합니다. 예를 들어 사실-느낌-요청 순서로 말하고, 상대는 반박보다 요약 확인을 먼저 하는 규칙을 두면 충돌 강도를 크게 낮출 수 있습니다. 핵심은 감정을 참는 것이 아니라, 감정을 안전하게 다루는 절차를 합의하는 데 있습니다.'
    } else if (theme === 'intimacy') {
      body = high
        ? '친밀감 형성 속도와 애정 표현 방식이 비교적 잘 맞아 관계 만족도를 끌어올리기 좋은 구간입니다. 서로가 안정감을 느끼는 신호를 빠르게 파악할 수 있어 신뢰 회복도 비교적 빠른 편입니다. 다만 높은 끌림이 곧 지속 가능한 친밀도로 자동 전환되지는 않으므로, 생활 리듬과 감정 회복 방식까지 함께 맞추는 관리가 필요합니다. 특히 바쁜 시기에는 짧더라도 정해진 연결 시간을 유지해야 친밀도가 급격히 흔들리지 않습니다. 끌림을 유지하려면 배려의 일관성이 핵심입니다.'
        : mid
          ? '끌림은 분명하지만 친밀도 유지 방식이 완전히 같지는 않은 구조입니다. 한쪽은 빈도와 즉시성을 중요하게 보고, 다른 쪽은 안정감과 예측 가능성을 더 중시할 수 있습니다. 이 차이를 무시하면 “관심이 줄었다” 또는 “압박을 받는다”는 해석으로 번질 수 있으니, 관계 리듬을 주간 단위로 합의하는 것이 효과적입니다. 예를 들어 연락/만남/휴식의 최소 기준을 정해 두면 기대치 충돌을 줄일 수 있습니다. 친밀도는 감정의 크기보다 관리의 반복성에서 안정됩니다.'
          : '친밀도 기대치와 경계 설정 방식의 차이가 큰 구간입니다. 이런 경우에는 감정 강도만으로 관계를 운영하면 피로가 빠르게 누적되고, 한쪽은 과잉 부담을 느끼며 다른 쪽은 정서적 방치를 느낄 수 있습니다. 따라서 우선순위는 끌림 강화가 아니라 안전한 합의 구조를 만드는 것입니다. 경계, 동의, 휴식 규칙을 명확히 합의하고, 불편 신호가 나왔을 때 즉시 조정할 수 있는 프로토콜을 마련해야 관계 손상을 줄일 수 있습니다. 명확한 합의는 친밀도를 떨어뜨리는 것이 아니라 오래 가게 만듭니다.'
    } else if (theme === 'home') {
      body = high
        ? '생활·가정 영역에서는 루틴, 책임 분배, 현실 감각이 비교적 잘 맞는 편입니다. 함께 시간을 보낼 때 누가 무엇을 맡아야 하는지 빠르게 정리되고, 예상치 못한 변수에도 협력적으로 대응할 가능성이 큽니다. 다만 안정 구간에서도 가사·재정·가족 일정은 자동으로 굴러가지 않으므로 월간 점검 루틴을 유지해야 합니다. 특히 비용 분담과 휴식 시간 기준을 문서화해 두면 장기적으로 신뢰가 더 단단해집니다. 생활 합은 감정보다 운영 구조에서 만들어진다는 점을 기억하는 것이 좋습니다.'
        : mid
          ? '생활 영역에서 기본 합은 있으나 세부 기준이 자주 엇갈릴 수 있습니다. 예를 들어 정리 습관, 지출 우선순위, 휴식 방식에서 작은 차이가 누적되면 감정 갈등으로 전이될 수 있습니다. 이 구간에서는 대화로만 맞추기보다 체크리스트 기반 운영이 훨씬 효과적입니다. 주간 할 일 분담표, 고정비/변동비 원칙, 개인 시간 보장 규칙을 정해두면 불필요한 소모가 줄어듭니다. 생활 합은 거창한 이벤트보다 반복 가능한 작은 약속을 지키는 데서 올라갑니다.'
          : '생활·가정 운영 방식이 크게 달라 즉흥 조율만으로는 안정성을 만들기 어려운 구간입니다. 이때 가장 위험한 패턴은 문제 발생 후 감정적으로 수습하는 방식이 반복되는 것입니다. 따라서 사전 규칙이 필수입니다. 시간 관리, 금전 사용, 집안 역할, 가족 이슈 대응 절차를 구체적으로 합의해야 하며, 합의 내용은 말로 끝내지 말고 기록으로 남겨야 재충돌을 줄일 수 있습니다. 점수가 낮더라도 운영 체계를 먼저 세우면 관계 만족도는 충분히 회복 가능합니다.'
    } else {
      body = high
        ? '소통 궁합이 높아 핵심 의도 전달과 피드백 순환이 비교적 안정적입니다. 중요한 의사결정에서도 감정적 방어보다 문제 해결 대화로 전환되는 속도가 빠를 가능성이 큽니다. 이런 조합은 신뢰를 빠르게 쌓을 수 있지만, 익숙함 때문에 확인 과정을 생략하면 오히려 오해가 커질 수 있습니다. 따라서 중요한 주제는 결론만 공유하지 말고 근거와 기대 행동까지 함께 정리해야 합니다. 잘 되는 대화일수록 구조를 유지하면 장기 안정성이 크게 올라갑니다.'
        : mid
          ? '소통은 가능한데 전달 방식의 차이로 효율이 떨어지는 구간입니다. 같은 말을 해도 한쪽은 요약형, 다른 쪽은 맥락형을 선호해 핵심 누락이 생길 수 있습니다. 이 경우 회의·약속·갈등 대화의 형식을 분리하면 효과가 좋아집니다. 예를 들어 갈등 대화는 짧게, 실행 대화는 체크리스트로, 감정 대화는 시간 제한 없이 운영하는 식으로 룰을 나누는 방법이 유용합니다. 소통의 질은 말의 양이 아니라 합의된 형식의 일관성에서 올라갑니다.'
          : '소통 과정에서 의도 오해와 반응 지연이 자주 발생할 수 있는 구간입니다. 특히 민감한 이슈는 한 번의 대화로 해결하려 할수록 방어가 커지고 결론이 흐려질 가능성이 큽니다. 따라서 즉흥 토론보다 단계형 대화가 필요합니다. 이슈 정의-상대 요약-선택지 제시-재확인 순서를 고정하고, 감정이 높은 상태에서는 결정 자체를 미루는 원칙을 두는 것이 좋습니다. 구조화된 소통은 차가운 방식이 아니라, 관계 손상을 막기 위한 안전장치입니다.'
    }

    return ensureMinLength(
      `${intro} ${body}`,
      400,
      '추가로, 서로의 기준을 명확히 말하고 합의 사항을 반복 확인하면 실제 체감 궁합은 점수보다 더 빠르게 좋아질 수 있습니다.'
    )
  }

  const english = `${plainThemeLabel(locale, theme)} is ${score}/100 (${band}). Treat this as an operating guide rather than a fixed verdict. When alignment is high, protect consistency through weekly check-ins; when it is mid, improve role clarity and explicit expectations; when it is low, use structured dialogue and written agreements before major decisions. Long-term outcomes depend less on one-time chemistry and more on repeatable routines for communication, conflict recovery, and responsibility sharing.`
  return ensureMinLength(
    english,
    260,
    'Consistency, explicit agreements, and calm review loops usually improve practical compatibility over time.'
  )
}

export function plainThemeLines(locale: LocaleCode, theme: PlainThemeKind, score: number) {
  const safeScore = clamp(Math.round(score), 0, 100)
  const header = `- ${plainThemeLabel(locale, theme)}: ${safeScore}/100 (${describeScoreBand(safeScore, locale)})`
  const narrative = plainThemeNarrative(locale, theme, safeScore)
  return [header, narrative]
}

export type ScenarioKind = 'dating' | 'marriage' | 'reunion' | 'cohabitation'

export function scenarioLabel(locale: LocaleCode, scenario: ScenarioKind) {
  if (locale === 'ko') {
    if (scenario === 'dating') return '연애 모드'
    if (scenario === 'marriage') return '결혼 모드'
    if (scenario === 'reunion') return '재회 모드'
    return '동거 모드'
  }
  if (scenario === 'dating') return 'Dating mode'
  if (scenario === 'marriage') return 'Marriage mode'
  if (scenario === 'reunion') return 'Reunion mode'
  return 'Cohabitation mode'
}

export function scenarioNarrative(locale: LocaleCode, scenario: ScenarioKind, score: number) {
  const isKo = locale === 'ko'
  const high = score >= 75
  const mid = score >= 60
  const band = describeScoreBand(score, locale)

  if (!isKo) {
    const shortGuide = `${scenarioLabel(locale, scenario)} is ${score}/100 (${band}). Focus on clear expectations, practical routines, and predictable repair loops after friction.`
    return ensureMinLength(
      shortGuide,
      220,
      'When the framework is explicit, outcomes usually improve even if raw chemistry fluctuates.'
    )
  }

  let body = ''
  if (scenario === 'dating') {
    body = high
      ? '현재 연애 모드는 끌림과 정서적 반응이 잘 맞아 빠르게 안정감을 만들 수 있는 구간입니다. 다만 점수가 높을수록 오히려 확인 과정이 생략되어 “알아서 이해하겠지”라는 착각이 생기기 쉽습니다. 관계 초반일수록 연락 빈도, 만남 리듬, 갈등 시 대화 규칙을 가볍게라도 합의해 두면 초반 좋은 흐름을 오래 유지할 수 있습니다. 특히 감정이 큰 날에는 결론을 서두르기보다, 요약 확인 문장 한 번을 넣는 것만으로도 오해 확률이 크게 줄어듭니다.'
      : mid
        ? '연애 모드에서는 호감과 매력은 충분하지만, 기대치의 속도 차이가 문제로 떠오를 가능성이 있습니다. 한쪽은 빠른 확신을 원하고 다른 쪽은 단계적 확인을 원할 수 있어, 말의 무게가 엇갈리면 피로가 생깁니다. 이 구간에서는 감정 표현의 양보다 규칙의 명확성이 중요합니다. 예를 들어 바쁜 주간 연락 기준, 약속 변경 기준, 불편 신호 전달 문장을 미리 정해 두면 갈등의 강도를 낮출 수 있습니다. 연애 지속성은 감정 강도보다 운영 리듬에서 결정됩니다.'
        : '연애 모드 점수가 낮은 경우, 끌림 자체가 없다는 의미보다 관계 운영 방식이 불안정할 확률이 높다는 신호에 가깝습니다. 특히 확인되지 않은 기대를 상대에게 투영하면 반복 충돌이 생기기 쉽습니다. 따라서 “관계 정의-경계-연락 리듬-갈등 복구 방식”을 먼저 합의하고, 합의 없는 해석은 보류하는 원칙이 필요합니다. 감정이 앞설수록 대화 구조를 더 단단하게 잡아야 하며, 즉흥적 결론 대신 짧은 쿨다운 후 재논의를 기본 프로토콜로 두는 것이 안전합니다.'
  } else if (scenario === 'marriage') {
    body = high
      ? '결혼 모드에서는 감정 합뿐 아니라 생활 운영 합이 함께 받쳐주는 상태입니다. 장기 파트너십에서 중요한 가사·재정·가족 일정·건강 관리 같은 현실 의제가 비교적 부드럽게 굴러갈 가능성이 큽니다. 다만 점수가 높더라도 자동 운영은 없습니다. 월 1회는 비용/일정/역할을 점검하고, 분기마다 장기 목표를 업데이트해야 안정 구간이 유지됩니다. 결혼 모드에서 신뢰는 사랑의 크기만으로 유지되지 않고, 반복 가능한 운영 시스템이 있을 때 더 단단해집니다.'
      : mid
        ? '결혼 모드는 가능한데, 세부 생활 기준에서 자주 이견이 생길 수 있는 패턴입니다. 특히 돈·시간·가족 이슈는 감정 문제로 번지기 쉬워 “누가 맞는가” 싸움으로 가면 장기 피로가 누적됩니다. 이 단계에서는 역할표와 의사결정 권한을 문장으로 고정하는 것이 핵심입니다. 고정비/변동비 원칙, 휴식 시간 보장, 갈등 시 의사결정 유예 규칙을 마련하면 체감 갈등이 크게 줄어듭니다. 결혼 모드는 낭만보다 운영력에서 점수가 실제로 올라갑니다.'
        : '결혼 모드 점수가 낮다면 지금 당장 불가능하다는 뜻이 아니라, 준비 없이 진행할 경우 마찰 비용이 매우 커질 수 있다는 경고 신호입니다. 정서적 애착만으로 생활 시스템을 대신할 수는 없습니다. 따라서 결혼 전 단계에서 반드시 점검해야 할 것은 가치관 선언이 아니라 운영 계약입니다. 시간·재정·가사·가족 경계·갈등 복구 절차를 문서로 합의하고, 시범 운영 기간을 두어 실제 작동 여부를 확인해야 합니다. 구조가 준비되면 낮은 점수도 현실적으로 개선 가능합니다.'
  } else if (scenario === 'reunion') {
    body = high
      ? '재회 모드 점수가 높은 경우는 감정 회복 가능성과 소통 복구 가능성이 동시에 살아 있다는 뜻입니다. 다만 재회에서 가장 중요한 것은 “다시 만난다”보다 “같은 패턴을 반복하지 않게 설계한다”입니다. 과거 갈등 원인을 사건 중심이 아니라 구조 중심으로 정리해야 하며, 특히 불편 신호를 어떻게 전달하고 어떻게 복구할지 절차를 새로 합의해야 합니다. 재회 직후에는 감정이 과열되기 쉬우므로 관계 속도를 단계적으로 올리고, 2~4주 단위 점검 루틴을 운영하는 것이 재이탈을 막는 핵심입니다.'
      : mid
        ? '재회 가능성은 있으나 과거 패턴의 재발 위험도 함께 존재하는 구간입니다. 이 경우 감정 확인만으로는 충분하지 않고, 이별로 이어졌던 트리거를 구체적으로 재정의해야 합니다. 특히 의도 오해, 응답 속도, 책임 분배, 경계 침범 같은 반복 포인트를 체크리스트로 만들고, 재회 후 첫 달에 실행 점검을 해야 합니다. 말로는 “달라지겠다”가 쉽지만, 행동 기준이 없으면 과거 루프로 돌아가기 쉽습니다. 재회 성공률은 진정성보다 복구 프로토콜의 완성도에서 갈립니다.'
        : '재회 모드 점수가 낮다면 미련의 강도와 관계 지속 가능성을 분리해서 봐야 한다는 의미입니다. 감정이 남아 있어도 운영 체계가 바뀌지 않으면 같은 문제를 더 빠르게 반복할 수 있습니다. 따라서 재회를 검토하더라도 즉시 결합보다 평가 단계를 두는 것이 안전합니다. 일정 기간 연락 규칙, 갈등 대화 규칙, 경계 준수 여부를 관찰하고 기준을 충족할 때만 관계 단계를 올리는 방식이 필요합니다. 재회는 감정의 재시작이 아니라 시스템의 재설계라는 관점으로 접근해야 손상을 줄일 수 있습니다.'
  } else {
    body = high
      ? '동거 모드가 높다는 것은 정서적 친밀감과 생활 운영력이 함께 작동할 가능성이 높다는 뜻입니다. 동거는 연애보다 운영 밀도가 높아 작은 습관 차이도 빠르게 체감되기 때문에, 시작 전 합의가 매우 중요합니다. 취침/청소/식사/지출/개인 시간 같은 기본 루틴을 먼저 합의하면 불필요한 감정 소모를 크게 줄일 수 있습니다. 또한 개인 공간과 공동 공간의 경계를 명확히 해야 친밀감이 유지됩니다. 동거 안정성은 사랑의 강도보다 경계와 규칙의 선명도에서 결정됩니다.'
      : mid
        ? '동거 모드는 가능하지만 초기 마찰 관리가 핵심인 구간입니다. 한쪽은 편의 중심, 다른 쪽은 규칙 중심일 수 있어 사소한 습관이 반복 갈등으로 확대될 수 있습니다. 따라서 동거 전 시범 운영(주말 동선, 생활비 분담, 집안일 분배)을 통해 현실 적합도를 확인하는 절차가 필요합니다. 특히 피로가 쌓이는 평일 기준으로 루틴을 맞춰야 실제 유지력이 올라갑니다. 감정이 좋을 때 시작하는 것보다, 갈등이 생겼을 때도 굴러가는 구조를 먼저 만드는 것이 동거 성공에 더 중요합니다.'
        : '동거 모드 점수가 낮으면 동거 자체를 금지해야 한다는 뜻이 아니라, 준비 없이 시작하면 감정 손실이 커질 가능성이 높다는 뜻입니다. 동거는 관계의 시험장이 아니라 생활 시스템의 실전 운영입니다. 규칙 없는 동거는 친밀감을 높이기보다 피로와 실망을 키울 수 있으므로, 최소한 비용 원칙·역할 분담·갈등 중단 신호·개인 시간 보장 규칙을 합의한 뒤 시작해야 합니다. 가능하다면 단계형 전환(부분 동선 공유 → 단기 동거 → 정식 동거)으로 리스크를 분산하는 접근이 안전합니다.'
  }

  const intro = `${scenarioLabel(locale, scenario)} 점수는 ${score}/100(${band})입니다. 아래 내용은 감정적 위로가 아니라 실제 관계 운영에서 바로 적용할 수 있도록 정리한 실행형 가이드입니다.`
  return ensureMinLength(
    `${intro} ${body}`,
    400,
    '핵심은 감정의 크기를 증명하는 것이 아니라, 합의된 규칙을 반복 실행해 신뢰를 축적하는 것입니다.'
  )
}

export function scenarioGuideLines(locale: LocaleCode, scenario: ScenarioKind, score: number) {
  const safeScore = clamp(Math.round(score), 0, 100)
  const header = `- ${scenarioLabel(locale, scenario)}: ${safeScore}/100 (${describeScoreBand(safeScore, locale)})`
  const narrative = scenarioNarrative(locale, scenario, safeScore)
  return [header, narrative]
}

export function buildPairInsights(input: {
  sajuScore: number | null
  astrologyScore: number | null
  crossScore: number | null
  finalScore: number
  harmonyAspectCount: number
  tensionAspectCount: number
  locale: LocaleCode
}) {
  const isKo = input.locale === 'ko'
  const strengths: string[] = []
  const challenges: string[] = []
  const advice: string[] = []

  if (input.sajuScore !== null) {
    if (input.sajuScore >= 75) {
      strengths.push(
        isKo
          ? '사주 일간과 오행 흐름이 잘 맞아 장기 안정성에 유리합니다.'
          : 'Saju day-master and elemental flow support long-term stability.'
      )
    } else if (input.sajuScore < 55) {
      challenges.push(
        isKo
          ? '사주 구조의 생활 리듬 차이가 커서 의식적인 조율이 필요합니다.'
          : 'Saju pattern shows different life rhythm and needs active adjustment.'
      )
    }
  }

  if (input.astrologyScore !== null) {
    if (input.astrologyScore >= 75) {
      strengths.push(
        isKo
          ? '점성 시너스트리에서 감정 교감과 연애 케미 신호가 좋습니다.'
          : 'Astrology synastry supports emotional and romantic chemistry.'
      )
    } else if (input.astrologyScore < 55) {
      challenges.push(
        isKo
          ? '점성 기준에서 소통 방식 또는 감정 표현 스타일 차이가 보입니다.'
          : 'Astrology shows communication or emotional style mismatch.'
      )
    }
  }

  if (input.crossScore !== null) {
    if (input.crossScore >= 70) {
      strengths.push(
        isKo
          ? '사주와 점성의 교차 신호가 같은 방향으로 정합적입니다.'
          : 'Cross-system signal (Saju x Astrology) is consistent and coherent.'
      )
    } else if (input.crossScore < 50) {
      challenges.push(
        isKo
          ? '사주·점성 신호가 엇갈려 해석과 의사결정에 추가 확인이 필요합니다.'
          : 'Cross-system signal diverges, so interpretation must be handled carefully.'
      )
    }
  }

  if (input.harmonyAspectCount >= input.tensionAspectCount) {
    strengths.push(
      isKo
        ? '긴장 어스펙트보다 조화 어스펙트가 더 많습니다.'
        : 'More harmonious synastry aspects than tense aspects.'
    )
  } else {
    challenges.push(
      isKo
        ? '현재 차트 비교에서 긴장 어스펙트 비중이 더 큽니다.'
        : 'Tense synastry aspects are dominant in current chart comparison.'
    )
  }

  if (input.finalScore >= 80) {
    advice.push(
      isKo
        ? '정기적으로 감정 상태를 체크해 현재 강점을 유지하세요.'
        : 'Protect the current strengths with regular emotional check-ins.'
    )
    advice.push(
      isKo
        ? '상승 흐름일 때 중장기 공동 목표를 구체화하세요.'
        : 'Plan shared long-term goals while momentum is strong.'
    )
  } else if (input.finalScore >= 65) {
    advice.push(
      isKo
        ? '주간 소통 루틴을 정해 오해를 누적시키지 마세요.'
        : 'Set a weekly communication ritual to reduce misunderstandings.'
    )
    advice.push(
      isKo
        ? '실무 역할을 분담해 일상 마찰을 줄이세요.'
        : 'Use role-sharing in practical matters to reduce friction.'
    )
  } else {
    advice.push(
      isKo
        ? '큰 결정을 하기 전 경계와 기대치를 문장으로 명확히 합의하세요.'
        : 'Define boundaries and expectations explicitly before major commitments.'
    )
    advice.push(
      isKo
        ? '갈등 해결을 일회성이 아닌 반복 가능한 프로세스로 설계하세요.'
        : 'Treat conflict resolution as a repeatable process, not a one-time fix.'
    )
  }

  if (input.tensionAspectCount > input.harmonyAspectCount) {
    advice.push(
      isKo
        ? '충돌이 커질수록 즉시 결론 내리기보다 멈춘 뒤 구조화된 대화로 재접근하세요.'
        : 'When conflict rises, pause first and revisit with structured dialogue.'
    )
  }

  return {
    strengths: unique(strengths).slice(0, 4),
    challenges: unique(challenges).slice(0, 4),
    advice: unique(advice).slice(0, 5),
  }
}


