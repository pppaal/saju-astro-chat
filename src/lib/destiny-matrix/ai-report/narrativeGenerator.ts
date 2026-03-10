import type { MatrixCalculationInput } from '../types'
import type { AIPremiumReport } from './reportTypes'
import type {
  NormalizedSignal,
  SignalDomain,
  SignalSynthesisResult,
  SynthesizedClaim,
} from './signalSynthesizer'

interface NarrativeInput {
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  synthesis: SignalSynthesisResult
}

const SECTION_DOMAINS: Record<keyof AIPremiumReport['sections'], SignalDomain[]> = {
  introduction: ['personality', 'timing'],
  personalityDeep: ['personality'],
  careerPath: ['career', 'wealth'],
  relationshipDynamics: ['relationship'],
  wealthPotential: ['wealth', 'career'],
  healthGuidance: ['health'],
  lifeMission: ['spirituality', 'personality'],
  timingAdvice: ['timing', 'career', 'relationship'],
  actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
  conclusion: ['personality', 'timing'],
}

const SECTION_TITLE_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '핵심 흐름',
  personalityDeep: '성향 심층',
  careerPath: '커리어',
  relationshipDynamics: '관계',
  wealthPotential: '재정',
  healthGuidance: '건강',
  lifeMission: '장기 방향',
  timingAdvice: '시기 전략',
  actionPlan: '실행 계획',
  conclusion: '마무리',
}

const SECTION_LEAD_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '지금 구간의 핵심은',
  personalityDeep: '당신의 기본 패턴은',
  careerPath: '커리어에서는',
  relationshipDynamics: '관계에서는',
  wealthPotential: '재정 운영에서는',
  healthGuidance: '건강 리듬은',
  lifeMission: '장기 방향에서는',
  timingAdvice: '타이밍 관점에서는',
  actionPlan: '실행 설계에서는',
  conclusion: '최종 요약은',
}

const SECTION_SUPPORT_PREFIX_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '보완 관점에서는',
  personalityDeep: '내면 축에서는',
  careerPath: '실행 축에서는',
  relationshipDynamics: '조율 축에서는',
  wealthPotential: '리스크 축에서는',
  healthGuidance: '회복 축에서는',
  lifeMission: '장기 축에서는',
  timingAdvice: '운영 축에서는',
  actionPlan: '실무 축에서는',
  conclusion: '정리 축에서는',
}

const SECTION_ACTION_HINT_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '오늘은 우선순위 1개만 확정하고 나머지는 재확인 슬롯으로 분리하세요.',
  personalityDeep: '말투와 결정 속도를 한 단계 늦추면 불필요한 충돌 비용이 크게 줄어듭니다.',
  careerPath: '성과는 범위를 줄여 완결률을 높일 때 더 빠르게 누적됩니다.',
  relationshipDynamics: '중요 대화는 요약 한 줄을 먼저 확인받는 방식이 안정적입니다.',
  wealthPotential: '금액·기한·취소 조건 3가지는 당일 확정 전에 반드시 재확인하세요.',
  healthGuidance: '집중 작업 전후로 회복 루틴을 고정하면 퍼포먼스 편차를 줄일 수 있습니다.',
  lifeMission: '주간 기록과 복기 루틴이 장기 방향을 현실 성과로 연결해 줍니다.',
  timingAdvice: '결정과 실행 날짜를 분리하면 타이밍 리스크를 체계적으로 낮출 수 있습니다.',
  actionPlan: '실행은 착수보다 마감 기준을 먼저 고정할 때 재현성이 올라갑니다.',
  conclusion: '핵심은 속도보다 정확한 순서이며, 그 순서가 결과 변동을 줄입니다.',
}

const SECTION_DEPTH_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    '오늘은 강점 신호를 실행으로 연결하되, 확정 단계는 분리해 운영해야 결과 편차를 줄일 수 있습니다. 특히 문서·합의·대외 전달은 체크리스트를 통과한 뒤 진행하는 편이 안전합니다.',
  personalityDeep:
    '자기 리듬이 흔들리는 날에는 즉흥 반응보다 기록 기반 판단이 유리합니다. 판단 기준을 한 줄로 먼저 적어두면 감정 편차가 커져도 실행 품질을 지킬 수 있습니다.',
  careerPath:
    '커리어는 확장 자체보다 완결률이 성과를 만듭니다. 오늘 처리할 핵심 과업을 제한하고, 협업 항목은 역할·기한·책임이 정리된 뒤에만 확정하는 방식이 효율적입니다.',
  relationshipDynamics:
    '관계는 의도보다 전달 구조가 중요합니다. 중요한 대화에서는 상대의 이해를 한 문장으로 확인하고, 합의는 속도보다 정확성을 기준으로 잡아야 충돌 비용이 낮아집니다.',
  wealthPotential:
    '재정은 수익 기대보다 손실 통제가 우선입니다. 금액·기한·취소 조건을 분리해 검토하고, 당일 확정이 아니라 검토 창을 두면 누락 리스크를 크게 줄일 수 있습니다.',
  healthGuidance:
    '건강 구간은 과부하를 줄이는 설계가 핵심입니다. 수면·수분·회복 루틴을 먼저 배치하고, 무리한 강도보다는 일관된 리듬으로 누적 피로를 관리하세요.',
  lifeMission:
    '장기 방향은 한 번의 큰 결정보다 반복 가능한 기준에서 만들어집니다. 주간 복기와 실행 기록을 유지하면 선택의 질이 올라가고 흔들림이 줄어듭니다.',
  timingAdvice:
    '타이밍 전략은 착수와 확정을 분리할 때 안정성이 높아집니다. 오늘은 초안과 정리, 내일은 재확인과 확정으로 단계화하면 실수 비용을 통제하기 쉽습니다.',
  actionPlan:
    '실행 계획은 단순할수록 강합니다. 핵심 1건 완료, 외부 전달 전 재확인, 보류 항목 분리의 루프를 유지하면 일관된 결과를 만드는 데 유리합니다.',
  conclusion:
    '마무리 원칙은 동일합니다. 빠른 결론보다 정확한 확정이 중요하며, 같은 운영 규칙을 며칠만 유지해도 체감 성과와 신뢰도가 함께 올라갑니다.',
}

const SECTION_DEPTH_EN: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'Translate upside into execution, but keep commitment as a separate gate. For documents, agreements, and external communication, pass checklist verification before finalization.',
  personalityDeep:
    'When rhythm is unstable, record-first judgment works better than impulse-first reaction. A one-line decision rule stabilizes output quality under emotional variance.',
  careerPath:
    'Career gains come more from completion rate than from scope growth. Limit active priorities and commit collaboration items only after role/deadline/ownership are explicit.',
  relationshipDynamics:
    'In relationships, delivery structure matters more than intention. Confirm the other side understanding in one line before agreement to reduce conflict costs.',
  wealthPotential:
    'For money, downside control should precede upside pursuit. Separate amount/deadline/cancellation review and keep a recheck window before same-day commitments.',
  healthGuidance:
    'Health performance is protected by load design. Lock sleep/hydration/recovery first, then scale intensity gradually to avoid accumulated fatigue.',
  lifeMission:
    'Long-term direction comes from repeatable standards, not one large decision. Weekly review and execution logs improve decision quality and reduce drift.',
  timingAdvice:
    'Timing stability improves when start and commit are split. Draft and organize today, then verify and finalize in a separate window.',
  actionPlan:
    'Execution plans work best when simple and repeatable. Keep one must-finish output, pre-send verification, and deferred-item separation as a fixed loop.',
  conclusion:
    'Final rule stays the same: accurate commitment beats fast commitment. Keep the same operating rule for several days to improve consistency and trust.',
}

const SECTION_EXECUTION_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    '운영 팁으로는 오전에 핵심 1건을 끝내고, 오후에는 재확인/정리 업무를 배치하는 방식이 안정적입니다. 같은 루틴을 며칠 유지하면 변동성보다 누적 성과가 먼저 보이기 시작합니다.',
  personalityDeep:
    '실행 팁은 간단합니다. 결정 전에 체크리스트 3항(목표·기한·책임)을 확인하고, 대화 후에는 합의 내용을 한 줄로 남기세요. 이 습관만으로도 불필요한 충돌을 상당히 줄일 수 있습니다.',
  careerPath:
    '업무 배치는 새 일 추가보다 진행 중인 일의 완결을 우선하세요. 특히 외부 협업은 범위와 마감이 고정된 과제부터 닫아야 다음 확장이 안정적으로 열립니다.',
  relationshipDynamics:
    '대화 실행은 질문 1개와 요약 1문장을 기본 규칙으로 두는 것이 좋습니다. 감정이 커지는 구간에서는 결론을 미루고 맥락부터 맞추는 편이 관계 손실을 막아줍니다.',
  wealthPotential:
    '금전 실행은 소액 점검 후 확장, 당일 확정 대신 재검토 창 확보가 핵심입니다. 단기 이익보다 조건 누락 방지가 장기 누적 성과를 지켜줍니다.',
  healthGuidance:
    '건강 실행은 강도 상승보다 회복 루틴 선배치가 우선입니다. 일정이 과밀할수록 운동/업무/수면 중 하나를 줄여 피로 누적을 차단하는 방식이 필요합니다.',
  lifeMission:
    '장기 실행은 거창한 계획보다 반복 가능한 규칙 2~3개를 고정하는 것이 효과적입니다. 주간 단위로 점검하고 수정하면 방향성은 유지되면서도 현실 적응력이 커집니다.',
  timingAdvice:
    '타이밍 실행은 착수-재확인-확정의 3단계를 분리해 두는 것이 핵심입니다. 특히 커뮤니케이션/문서/계약 성격의 항목은 재확인 단계를 생략하지 않아야 리스크가 낮아집니다.',
  actionPlan:
    '계획 실행은 “오늘 완료 1건, 보류 1건, 재확인 1건”의 일일 루틴으로 단순화하세요. 복잡도를 줄여야 실제 행동 전환이 빨라지고 누락이 줄어듭니다.',
  conclusion:
    '결과를 바꾸는 것은 새로운 정보보다 운영 습관입니다. 같은 규칙을 일정 기간 유지하며 기록까지 남기면 성과의 질과 일관성이 함께 개선됩니다.',
}

const SECTION_EXECUTION_EN: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'A stable pattern is to finish one core task in the morning and schedule review/recheck work in the afternoon. Repeat this routine for several days to reduce variance and improve compounding output.',
  personalityDeep:
    'Use a simple execution rule: verify goal/deadline/ownership before decisions, then keep one-line logs after major conversations. This alone removes a large share of avoidable friction.',
  careerPath:
    'Prioritize completion over new intake. In external collaboration, close items with fixed scope and deadlines first, then open expansion lanes.',
  relationshipDynamics:
    'Keep one question plus one summary sentence as a default communication protocol. When emotional intensity rises, delay conclusions and align context first.',
  wealthPotential:
    'Use small-scale validation before scaling and keep a recheck window before same-day commitment. Protecting terms matters more than chasing short-term upside.',
  healthGuidance:
    'Recovery-first scheduling should precede intensity increases. In overloaded weeks, reduce one major load source to prevent fatigue compounding.',
  lifeMission:
    'Long-term execution improves when 2-3 repeatable rules are fixed and reviewed weekly. This keeps direction stable while allowing practical adaptation.',
  timingAdvice:
    'Split start-verify-commit into distinct stages. For communication/document/contract items, never skip the verify gate.',
  actionPlan:
    'Simplify daily execution to one completion, one defer, and one recheck item. Lower complexity increases action conversion and reduces omission.',
  conclusion:
    'Sustained outcomes come more from operating habits than from new information. Keep your rule set stable and logged over time.',
}

const SECTION_MIN_FILL_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    '실행 시에는 우선순위가 아닌 항목을 과감히 보류해 집중도를 유지하세요. 핵심 한 건의 완성도가 전체 흐름을 안정시키는 출발점이 됩니다.',
  personalityDeep:
    '자기 리듬을 지키기 위해 하루 종료 전에 결정 로그를 3줄로 정리하세요. 이 기록이 다음 선택의 품질을 높이는 기준점이 됩니다.',
  careerPath:
    '오늘은 새 일 착수보다 진행 중 과업의 닫힘을 우선하세요. 완결된 결과물이 쌓일수록 다음 기회의 신뢰도와 협상력이 함께 올라갑니다.',
  relationshipDynamics:
    '관계에서는 맞는 말보다 맞는 순서가 중요합니다. 먼저 상대 맥락을 확인하고 그 다음에 요청을 제시하면 오해를 줄일 수 있습니다.',
  wealthPotential:
    '재정 결정은 당일 확정보다 검토 창을 두는 쪽이 유리합니다. 지출 전 체크리스트를 고정하면 손실 가능성을 구조적으로 줄일 수 있습니다.',
  healthGuidance:
    '회복 루틴은 의지가 아니라 시간표에 넣어야 지속됩니다. 기본 리듬이 안정되면 같은 업무량에서도 체감 피로가 크게 낮아집니다.',
  lifeMission:
    '장기 목표는 크기보다 지속성이 중요합니다. 작은 실행을 반복 가능한 형태로 남기는 것이 방향성과 성과를 동시에 지켜줍니다.',
  timingAdvice:
    '타이밍이 애매할수록 확정 단계를 뒤로 미루고 재확인을 앞당기세요. 이 원칙만 지켜도 실수 확률을 체감할 만큼 낮출 수 있습니다.',
  actionPlan:
    '실행안은 복잡하게 만들지 말고 오늘 바로 행동 가능한 수준으로 고정하세요. 완료 확인 기준을 미리 정하면 흔들림이 줄어듭니다.',
  conclusion:
    '결론은 단순합니다. 기준을 지키는 실행이 누적 성과를 만듭니다. 같은 원칙을 반복할수록 결과는 더 선명해집니다.',
}

const SECTION_MIN_FILL_EN: Record<keyof AIPremiumReport['sections'], string> = {
  introduction:
    'Keep non-priority items deferred to protect focus. One high-quality completion stabilizes the whole daily trajectory.',
  personalityDeep:
    'End each day with a short decision log. This creates a practical reference point for better next-step choices.',
  careerPath:
    'Prioritize closure of in-flight tasks over starting new work. Completed outputs increase trust and negotiation leverage.',
  relationshipDynamics:
    'In relationships, order often matters more than correctness. Confirm context first, then present your request.',
  wealthPotential:
    'Use a review window before same-day commitment. A fixed checklist structurally reduces downside mistakes.',
  healthGuidance:
    'Recovery routines must be scheduled, not improvised. Stable rhythm reduces perceived fatigue at the same workload.',
  lifeMission:
    'Long-term direction depends on repeatability, not scale. Small consistent actions preserve both purpose and outcomes.',
  timingAdvice:
    'When timing is mixed, delay commitment and advance verification. This single rule can cut avoidable errors significantly.',
  actionPlan:
    'Keep plans simple and immediately executable. Predefined completion criteria reduce drift during execution.',
  conclusion:
    'Final principle is simple: consistent standards create compounding outcomes. Repetition makes results more predictable.',
}

function buildLowSignalFallbackSection(
  section: keyof AIPremiumReport['sections'],
  title: string,
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const dayMaster = input.dayMasterElement || 'core'
  const daeun = input.currentDaeunElement || ''
  const seun = input.currentSaeunElement || ''
  const wolun = input.currentWolunElement || ''
  const iljin = input.currentIljinElement || ''
  const iljinDate = input.currentIljinDate || ''
  const koTimingTag = `대운 ${daeun || '미확인'}${seun ? ` / 세운 ${seun}` : ''}${wolun ? ` / 월운 ${wolun}` : ''}${iljin ? ` / 일진 ${iljin}` : ''}${iljinDate ? `(${iljinDate})` : ''}`
  const enTimingTag = `Daeun ${daeun || 'unknown'}${seun ? ` / Seun ${seun}` : ''}${wolun ? ` / Wolun ${wolun}` : ''}${iljin ? ` / Iljin ${iljin}` : ''}${iljinDate ? ` (${iljinDate})` : ''}`

  if (lang === 'ko') {
    const bySection: Record<keyof AIPremiumReport['sections'], string> = {
      introduction: `${title} 영역은 현재 직접 신호가 적어 보수 운영 규칙으로 정리합니다. 일간 ${dayMaster} 기준으로 오늘은 결론보다 순서 설계가 성과를 지키는 날입니다. 해야 할 일은 하나로 좁히고, 나머지는 재확인 슬롯으로 분리하세요. 외부 확정 전에는 일정·조건·책임 3항을 먼저 맞추는 방식이 안전합니다.`,
      personalityDeep: `${title} 영역은 저신호 구간이므로 기본 성향 관리에 집중하세요. 판단 속도를 한 단계 낮추고, 말보다 기록을 먼저 남기면 오해 비용이 줄어듭니다. 즉흥 결정보다 체크리스트 기반 결정을 사용하면 실수 편차가 작아집니다. 오늘은 감정 반응보다 실행 순서를 먼저 정하는 쪽이 유리합니다.`,
      careerPath: `${title} 영역은 직접 신호가 약해 확장보다 완결 우선 전략이 맞습니다. 새로운 시도는 한 번에 넓히지 말고 핵심 과제 1~2개를 먼저 끝내세요. 역할·범위·마감을 문서 한 줄로 고정하면 일정 흔들림이 크게 줄어듭니다. 당일 확정이 필요한 안건만 처리하고 나머지는 다음 확인 창으로 넘기세요.`,
      relationshipDynamics: `${title} 영역은 강한 방향 신호보다 해석 오차 관리가 핵심입니다. 중요한 대화는 결론부터 말하지 말고 먼저 상대 이해를 한 줄로 확인하세요. 감정이 올라오는 구간에서는 즉시 확정보다 시간차 응답이 관계 비용을 줄입니다. 오늘은 승부형 대화보다 조율형 대화가 결과가 좋습니다.`,
      wealthPotential: `${title} 영역은 수익 확대보다 손실 억제 우선으로 운영하세요. 금액·기한·취소조건을 따로 분리해 확인하면 불필요한 지출을 줄일 수 있습니다. 큰 지출이나 계약은 당일 확정보다 하루 재확인 후 처리하는 편이 안정적입니다. 현금흐름 표를 짧게라도 업데이트하면 판단 품질이 올라갑니다.`,
      healthGuidance: `${title} 영역은 퍼포먼스보다 회복 리듬을 먼저 잡는 구간입니다. 수면·수분·휴식 블록을 일정에 먼저 고정하면 집중력 편차가 줄어듭니다. 무리한 확장보다 강도 조절이 결과적으로 생산성을 지켜줍니다. 오늘은 과속보다 누락 없는 마무리를 우선하세요.`,
      lifeMission: `${title} 영역은 단기 성과보다 장기 일관성에 초점을 맞춰야 합니다. 큰 선언보다 작은 실행을 반복해서 기록하는 방식이 방향성을 만듭니다. 기준이 흔들릴 때는 선택 폭을 줄이고 우선순위 한 가지만 지키세요. 이번 주는 완벽보다 지속 가능한 루틴을 만드는 데 의미가 있습니다.`,
      timingAdvice: `${title} 영역은 타이밍 신호가 약해 결정보다 분리 운영이 안전합니다. ${koTimingTag} 기준으로 결론 시점과 실행 시점을 나눠 관리하세요. 중요한 확정은 최소 한 번의 재확인 단계를 넣어야 흔들림이 줄어듭니다. 오늘은 빠른 착수보다 정확한 순서가 더 높은 효율을 냅니다.`,
      actionPlan: `${title} 영역은 3단계 실행으로 정리하는 것이 가장 안정적입니다. 첫째, 오늘 반드시 끝낼 결과물 1개를 정합니다. 둘째, 외부 공유 전 조건·기한·책임을 한 줄로 확인합니다. 셋째, 당일 확정 항목과 보류 항목을 분리해 리스크를 통제하세요.`,
      conclusion: `${title} 영역의 결론은 속도보다 순서, 확정보다 재확인입니다. 직접 신호가 적은 날에는 과감한 확장보다 누락 방지가 성과를 지킵니다. 오늘은 완성도 높은 한 건을 만드는 데 집중하면 체감 결과가 분명해집니다. 같은 규칙을 며칠만 유지해도 변동성이 줄어듭니다.`,
    }
    const base = bySection[section]
    if (base.length < 260) {
      return `${base} ${SECTION_MIN_FILL_KO[section]}`.replace(/\s{2,}/g, ' ').trim()
    }
    return base
  }

  const bySectionEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction: `${title} is currently in low-signal mode, so a conservative operating rule is used. With day-master ${dayMaster}, sequence quality matters more than raw speed today. Narrow work to one must-finish item and move everything else to a recheck slot. Before external commitment, align scope, terms, and ownership first.`,
    personalityDeep: `${title} should focus on baseline behavior control under low-signal conditions. Slow decision speed by one step and log key points before speaking. Checklist-based choices reduce variance more than instinct-only choices in this window. Prioritize execution order over emotional reaction.`,
    careerPath: `${title} currently favors completion over expansion. Do not widen scope at once; close one or two core deliverables first. Lock role, scope, and deadline in one written line before execution. Commit only what must close today and move the rest to a next review slot.`,
    relationshipDynamics: `${title} is less about momentum and more about interpretation control. In key conversations, confirm the other side's understanding in one line before concluding. When emotion rises, delayed responses are safer than immediate commitment. Coordination-first dialogue outperforms confrontation today.`,
    wealthPotential: `${title} should be run with downside control first. Split and confirm amount, deadline, and cancellation terms before any commitment. For large spending or contracts, a 24-hour recheck is safer than same-day finalization. A short cashflow update improves judgment quality immediately.`,
    healthGuidance: `${title} should prioritize recovery rhythm before performance push. Fix sleep, hydration, and recovery blocks in your schedule first. Intensity control protects output quality better than overspeed in this phase. Choose error-free completion over aggressive volume today.`,
    lifeMission: `${title} should prioritize long-term consistency over short spikes. Repeat small executable actions and keep simple logs. When criteria feel unstable, narrow choice width and protect one top priority. This week, sustainable routine matters more than perfection.`,
    timingAdvice: `${title} is in low-signal timing mode, so split decision timing from execution timing. With ${enTimingTag}, insert at least one recheck gate before commitment. Accuracy of order matters more than speed of start. Use staged execution windows.`,
    actionPlan: `${title} is best managed as a 3-step loop. First, define one must-finish deliverable. Second, verify terms, deadline, and ownership in one line before sharing. Third, separate same-day commitment items from deferred items to control risk.`,
    conclusion: `${title} concludes with a simple rule: sequence over speed, recheck over impulse. On low-signal days, preventing omission protects outcomes better than aggressive expansion. Focus on one high-quality completion today. Repeat this rule for several days to reduce volatility.`,
  }
  const baseEn = bySectionEn[section]
  if (baseEn.length < 220) {
    return `${baseEn} ${SECTION_MIN_FILL_EN[section]}`.replace(/\s{2,}/g, ' ').trim()
  }
  return baseEn
}

function fallbackTitle(section: keyof AIPremiumReport['sections'], lang: 'ko' | 'en'): string {
  if (lang === 'ko') return SECTION_TITLE_KO[section]
  const en: Record<keyof AIPremiumReport['sections'], string> = {
    introduction: 'Core Direction',
    personalityDeep: 'Personality Deep Dive',
    careerPath: 'Career Trajectory',
    relationshipDynamics: 'Relationship Dynamics',
    wealthPotential: 'Financial Operation',
    healthGuidance: 'Health Rhythm',
    lifeMission: 'Long-term Direction',
    timingAdvice: 'Timing Strategy',
    actionPlan: 'Execution Plan',
    conclusion: 'Conclusion',
  }
  return en[section]
}

function sortClaimsForSection(
  claims: SynthesizedClaim[],
  section: keyof AIPremiumReport['sections']
): SynthesizedClaim[] {
  const domains = SECTION_DOMAINS[section]
  const direct = claims.filter((claim) => domains.includes(claim.domain))
  if (direct.length === 0) return []
  return direct
}

function pickSupportClaim(
  leadClaim: SynthesizedClaim,
  orderedClaims: SynthesizedClaim[],
  preferredDomains: SignalDomain[],
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): SynthesizedClaim | undefined {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .trim()
  return orderedClaims.find(
    (claim) =>
      claim.claimId !== leadClaim.claimId &&
      !usedClaimIds.has(claim.claimId) &&
      preferredDomains.includes(claim.domain) &&
      claim.thesis !== leadClaim.thesis &&
      !usedTheses.has(normalize(claim.thesis))
  )
}

function normalizeTextKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim()
}

function pickLeadClaim(
  orderedClaims: SynthesizedClaim[],
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): SynthesizedClaim | undefined {
  const fresh = orderedClaims.find(
    (claim) => !usedClaimIds.has(claim.claimId) && !usedTheses.has(normalizeTextKey(claim.thesis))
  )
  if (fresh) return fresh
  return undefined
}

function sanitizeEvidenceBasis(value: string | undefined, lang: 'ko' | 'en'): string {
  if (!value) return lang === 'ko' ? '근거 보완 필요' : 'pending evidence'
  const cleaned = value
    .replace(/\b(?:pair|angle|orb|allowed|policy)\s*=\s*[^,\s)]+/gi, '')
    .replace(/\s*[\/\-–—]\s*(?:conjunction|opposition|square|trine|sextile)\b/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/^\s*[\/\-–—]\s*/, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (/^(?:conjunction|opposition|square|trine|sextile)$/i.test(cleaned)) {
    return lang === 'ko' ? '점성 신호' : 'astrology signal'
  }
  if (!cleaned || cleaned === '-') {
    return lang === 'ko' ? '근거 보완 필요' : 'pending evidence'
  }
  if (lang === 'ko') {
    return cleaned
      .replace(/\bTrue Node\b/gi, '북노드')
      .replace(/\bNorth Node\b/gi, '북노드')
      .replace(/\bSouth Node\b/gi, '남노드')
      .replace(/\bSun\b/gi, '태양')
      .replace(/\bMoon\b/gi, '달')
      .replace(/\bMercury\b/gi, '수성')
      .replace(/\bVenus\b/gi, '금성')
      .replace(/\bMars\b/gi, '화성')
      .replace(/\bJupiter\b/gi, '목성')
      .replace(/\bSaturn\b/gi, '토성')
      .replace(/\bUranus\b/gi, '천왕성')
      .replace(/\bNeptune\b/gi, '해왕성')
      .replace(/\bPluto\b/gi, '명왕성')
      .replace(/\bconjunction\b/gi, '합')
      .replace(/\bopposition\b/gi, '대립')
      .replace(/\bsquare\b/gi, '사각')
      .replace(/\btrine\b/gi, '삼분')
      .replace(/\bsextile\b/gi, '육분')
      .replace(/\bin\s+H(\d{1,2})\b/gi, '$1하우스')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }
  return cleaned
}

function formatEvidenceSentence(
  synthesis: SignalSynthesisResult,
  claims: SynthesizedClaim[],
  lang: 'ko' | 'en'
): string {
  const withTopicParticle = (value: string): string => {
    const text = (value || '').trim()
    if (!text) return '핵심 신호는'
    const last = text[text.length - 1]
    const code = last.charCodeAt(0)
    const isHangul = code >= 0xac00 && code <= 0xd7a3
    if (!isHangul) return `${text}는`
    const hasBatchim = (code - 0xac00) % 28 !== 0
    return `${text}${hasBatchim ? '은' : '는'}`
  }
  const joinWithWaGwa = (left: string, right: string): string => {
    const l = (left || '').trim()
    const r = (right || '').trim()
    if (!l) return r
    if (!r) return l
    let hangulCode = 0
    for (let idx = l.length - 1; idx >= 0; idx -= 1) {
      const code = l.charCodeAt(idx)
      if (code >= 0xac00 && code <= 0xd7a3) {
        hangulCode = code
        break
      }
    }
    if (!hangulCode) return `${l}와 ${r}`
    const hasBatchim = (hangulCode - 0xac00) % 28 !== 0
    return `${l}${hasBatchim ? '과' : '와'} ${r}`
  }

  const isDomainKeywordMismatch = (signal: NormalizedSignal, domain: SignalDomain): boolean => {
    const raw =
      `${signal.keyword || ''} ${signal.rowKey || ''} ${signal.colKey || ''} ${signal.sajuBasis || ''} ${signal.astroBasis || ''}`.toLowerCase()
    if (
      domain === 'relationship' &&
      /(커리어|직업|업무|career|work|job|h10|mc|promotion)/.test(raw)
    ) {
      return true
    }
    if (domain === 'career' && /(연애|관계|partner|romance|relationship|h7|venus)/.test(raw)) {
      return true
    }
    if (domain === 'wealth' && /(연애|관계|romance|relationship)/.test(raw)) {
      return true
    }
    return false
  }

  const inferEffectivePolarity = (signal: NormalizedSignal): 'strength' | 'balance' | 'caution' => {
    const raw =
      `${signal.keyword || ''} ${signal.rowKey || ''} ${signal.colKey || ''}`.toLowerCase()
    if (
      /충돌|긴장|리스크|주의|좌절|파괴|분열|불안|risk|caution|conflict|tension|volatile/.test(raw)
    ) {
      return 'caution'
    }
    if (/균형|안정|조율|유지|balance|stable|stability/.test(raw)) {
      return 'balance'
    }
    if (/정점|상승|기회|확장|성장|peak|growth|expansion|opportunity/.test(raw)) {
      return 'strength'
    }
    return signal.polarity
  }

  const evidenceSignals = claims
    .flatMap((claim) => {
      const rawSignals = claim.evidence.map((id) => synthesis.signalsById[id]).filter(Boolean)
      const scopedSignals = rawSignals.filter((signal) =>
        (signal.domainHints || []).includes(claim.domain)
      )
      const domainPreferred = scopedSignals.length > 0 ? scopedSignals : rawSignals
      const withoutMismatch = domainPreferred.filter(
        (signal) => !isDomainKeywordMismatch(signal, claim.domain)
      )
      const pickedSignals = (withoutMismatch.length > 0 ? withoutMismatch : domainPreferred).slice(
        0,
        3
      )
      return pickedSignals.map((signal) => ({ signal, domain: claim.domain }))
    })
    .slice(0, 4)

  if (evidenceSignals.length === 0) {
    return lang === 'ko'
      ? '근거 신호 밀도가 낮으므로 확정 전 체크리스트를 먼저 적용하세요.'
      : 'Evidence density is low, so apply a checklist before commitment.'
  }

  if (lang === 'ko') {
    const effectByDomain: Record<
      SignalDomain,
      Record<'strength' | 'balance' | 'caution', string>
    > = {
      career: {
        strength: '성과를 확장할 여지가 큽니다',
        balance: '업무 흐름을 안정적으로 유지하기 좋습니다',
        caution: '역할·책임 경계가 흐려지면 비용이 커집니다',
      },
      relationship: {
        strength: '관계 회복과 연결 강화에 유리합니다',
        balance: '대화 리듬을 안정적으로 맞추기 좋습니다',
        caution: '말의 속도가 앞서면 오해가 커질 수 있습니다',
      },
      wealth: {
        strength: '수익 기회를 포착하기 유리합니다',
        balance: '현금 흐름을 안정적으로 관리하기 좋습니다',
        caution: '조건 누락 시 손실 리스크가 커집니다',
      },
      health: {
        strength: '컨디션 회복과 체력 관리가 빠르게 붙습니다',
        balance: '루틴을 유지하면 피로 편차를 줄일 수 있습니다',
        caution: '과속하면 회복이 늦어질 수 있습니다',
      },
      timing: {
        strength: '착수 속도를 높이기 좋습니다',
        balance: '순서를 지키면 시행착오를 줄이기 좋습니다',
        caution: '당일 확정은 재확인 절차가 필요합니다',
      },
      personality: {
        strength: '결정력이 올라가 실행 전환이 빠릅니다',
        balance: '판단의 일관성을 유지하기 좋습니다',
        caution: '즉흥 반응이 누적되면 오판 가능성이 커집니다',
      },
      spirituality: {
        strength: '장기 방향을 선명하게 잡기 좋습니다',
        balance: '기준을 유지하면 방향성이 흔들리지 않습니다',
        caution: '우선순위가 분산되면 집중력이 떨어질 수 있습니다',
      },
      move: {
        strength: '변화 시도를 시작하기 좋습니다',
        balance: '단계별 조정이 잘 먹히는 구간입니다',
        caution: '한 번에 크게 움직이면 변동성이 커집니다',
      },
    }

    return evidenceSignals
      .map(({ signal, domain }) => {
        const key = signal.keyword || signal.rowKey || '핵심'
        const saju = sanitizeEvidenceBasis(signal.sajuBasis || '사주 근거 보완 필요', lang)
        const astro = sanitizeEvidenceBasis(signal.astroBasis || '점성 근거 보완 필요', lang)
        const effectivePolarity = inferEffectivePolarity(signal)
        const effect =
          effectByDomain[domain]?.[effectivePolarity] ||
          effectByDomain.personality[effectivePolarity] ||
          '운영 방식 조정이 필요합니다'
        return `${withTopicParticle(key)} ${joinWithWaGwa(saju, astro)}가 겹쳐 ${effect}`
      })
      .join('. ')
      .concat('.')
  }

  return evidenceSignals
    .map(({ signal, domain }) => {
      const effectByDomain: Record<
        SignalDomain,
        Record<'strength' | 'balance' | 'caution', string>
      > = {
        career: {
          strength: 'execution leverage is high',
          balance: 'stability can be maintained with routine discipline',
          caution: 'unclear ownership can increase friction cost',
        },
        relationship: {
          strength: 'connection momentum is available',
          balance: 'communication rhythm can stay stable',
          caution: 'pace mismatch can create misunderstandings',
        },
        wealth: {
          strength: 'upside opportunities can be captured',
          balance: 'cashflow can stay stable',
          caution: 'term omissions can raise downside risk',
        },
        health: {
          strength: 'recovery momentum is available',
          balance: 'routine can reduce fatigue variance',
          caution: 'overspeed can delay recovery',
        },
        timing: {
          strength: 'start momentum is available',
          balance: 'sequence discipline reduces errors',
          caution: 'same-day finalization needs a verify gate',
        },
        personality: {
          strength: 'decision throughput increases',
          balance: 'judgment consistency is easier to maintain',
          caution: 'impulse reactions can increase noise',
        },
        spirituality: {
          strength: 'long-term direction gets clearer',
          balance: 'priority stability improves',
          caution: 'priority diffusion can reduce focus',
        },
        move: {
          strength: 'change momentum is available',
          balance: 'staged execution works well',
          caution: 'one-shot moves increase volatility',
        },
      }
      const key = signal.keyword || signal.rowKey || 'core'
      const saju = sanitizeEvidenceBasis(signal.sajuBasis || 'pending saju basis', lang)
      const astro = sanitizeEvidenceBasis(signal.astroBasis || 'pending astrology basis', lang)
      const effectivePolarity = inferEffectivePolarity(signal)
      const effect =
        effectByDomain[domain]?.[effectivePolarity] ||
        effectByDomain.personality[effectivePolarity] ||
        'operating adjustment is needed'
      return `${key} is grounded by ${saju} and ${astro}, so ${effect}`
    })
    .join('. ')
    .concat('.')
}

function gatherClaimSignals(
  synthesis: SignalSynthesisResult,
  claims: SynthesizedClaim[]
): NormalizedSignal[] {
  return claims
    .flatMap((claim) => claim.evidence.map((id) => synthesis.signalsById[id]).filter(Boolean))
    .filter((signal, index, arr) => arr.findIndex((item) => item.id === signal.id) === index)
}

function buildSectionInsightSentence(
  section: keyof AIPremiumReport['sections'],
  signals: NormalizedSignal[],
  lang: 'ko' | 'en'
): string {
  const hasStrength = signals.some((signal) => signal.polarity === 'strength')
  const hasCaution = signals.some((signal) => signal.polarity === 'caution')
  const hasBalance = signals.some((signal) => signal.polarity === 'balance')

  if (lang === 'ko') {
    if (hasStrength && hasCaution) {
      return section === 'careerPath'
        ? '상승 동력과 변동 신호가 동시에 보이므로, 확장 자체보다 범위·책임·기한을 먼저 고정할 때 성과가 남습니다.'
        : '상승 신호와 주의 신호가 함께 보이므로, 착수와 확정을 분리해야 성과를 지키면서 리스크를 낮출 수 있습니다.'
    }
    if (hasStrength) {
      return '상승 신호가 우세하므로 실행 전환 속도를 높이되, 결과물 완결 기준을 먼저 정하면 누적 성과가 커집니다.'
    }
    if (hasCaution) {
      return '주의 신호가 선행하므로 큰 결정보다 재확인 루틴을 먼저 두는 편이 손실을 줄이는 데 유리합니다.'
    }
    if (hasBalance) {
      return '균형 신호가 중심이라 새 시도보다 루틴 유지와 마감 품질 개선에 집중할수록 체감이 좋아집니다.'
    }
    return '직접 신호가 약한 구간이므로, 우선순위를 좁히고 확인 절차를 고정하는 보수 운영이 적합합니다.'
  }

  if (hasStrength && hasCaution) {
    return 'Growth and caution are both active, so separate start from commitment to keep upside while controlling downside.'
  }
  if (hasStrength) {
    return 'Expansion signals dominate, so accelerate execution but lock completion criteria first.'
  }
  if (hasCaution) {
    return 'Caution signals lead this section, so verification routines should precede major decisions.'
  }
  if (hasBalance) {
    return 'Balance signals are central, so steady routines outperform aggressive changes.'
  }
  return 'Direct signals are thin, so conservative sequencing and verification are the safer default.'
}

function buildSectionExecutionSentence(
  section: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const lines: Record<keyof AIPremiumReport['sections'], string> = {
      introduction:
        '실행은 오늘 끝낼 1건을 먼저 고정하고, 대외 확정이 필요한 안건은 최소 한 번의 재검토 슬롯을 거친 뒤 처리하세요.',
      personalityDeep:
        '의사결정은 즉답보다 요약 기록을 먼저 남기고, 감정이 올라오는 대화는 템포를 한 단계 늦추는 것이 손실을 줄입니다.',
      careerPath:
        '업무에서는 새 착수보다 진행 중 과제의 완결률을 올리고, 협업 건은 역할·마감·책임 3항목이 합의된 뒤 확정하세요.',
      relationshipDynamics:
        '관계에서는 결론을 먼저 말하기보다 상대의 이해를 한 줄로 확인한 뒤 요청을 제시하면 충돌 비용이 크게 줄어듭니다.',
      wealthPotential:
        '재정은 금액·기한·취소 조건을 분리 점검하고, 당일 확정 대신 24시간 재확인 창을 두는 방식이 안정적입니다.',
      healthGuidance:
        '건강은 강도보다 회복 블록을 먼저 배치하세요. 수면·수분·휴식 시간을 고정하면 피로 편차를 줄일 수 있습니다.',
      lifeMission:
        '장기 방향은 큰 선언보다 주간 기록과 복기 루틴으로 고정할 때 더 오래 유지되고 실제 성과로 연결됩니다.',
      timingAdvice:
        '타이밍은 착수-검토-확정을 분리해 운영하세요. 특히 문서·계약 성격의 일은 검토 단계를 생략하지 않는 것이 핵심입니다.',
      actionPlan:
        '2주 계획은 완료 1건, 재확인 1건, 보류 1건의 구조로 단순화하면 실행 전환율이 높고 누락이 줄어듭니다.',
      conclusion:
        '결론적으로 속도보다 순서를 지키는 운영이 유리합니다. 같은 규칙을 며칠 유지하면 변동성이 빠르게 줄어듭니다.',
    }
    return lines[section]
  }

  const linesEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction:
      'Lock one must-finish item first, and route externally committing items through at least one recheck slot.',
    personalityDeep:
      'Use summary-first logging before fast replies, and slow conversation tempo when emotional intensity rises.',
    careerPath:
      'Prioritize completion rate over new intake, and commit collaboration only after role-deadline-ownership are explicit.',
    relationshipDynamics:
      'In relationships, confirm understanding in one sentence before proposing requests to reduce friction.',
    wealthPotential:
      'For money matters, review amount/deadline/cancellation separately and use a 24-hour verify window before commitment.',
    healthGuidance:
      'For health, schedule recovery blocks before intensity; fixed sleep-hydration-rest reduces fatigue variance.',
    lifeMission:
      'Long-term direction is sustained through weekly logs and review loops rather than one-time declarations.',
    timingAdvice:
      'Split start-review-commit stages, and do not skip the review gate for contract-like decisions.',
    actionPlan:
      'A two-week plan works best with one completion, one recheck, and one deferred item per cycle.',
    conclusion:
      'In summary, sequence discipline beats speed, and repeated operating rules reduce volatility.',
  }
  return linesEn[section]
}

function getSectionMinChars(section: keyof AIPremiumReport['sections'], lang: 'ko' | 'en'): number {
  if (lang === 'ko') {
    const map: Record<keyof AIPremiumReport['sections'], number> = {
      introduction: 620,
      personalityDeep: 560,
      careerPath: 680,
      relationshipDynamics: 640,
      wealthPotential: 620,
      healthGuidance: 560,
      lifeMission: 620,
      timingAdvice: 600,
      actionPlan: 520,
      conclusion: 500,
    }
    return map[section]
  }
  const mapEn: Record<keyof AIPremiumReport['sections'], number> = {
    introduction: 520,
    personalityDeep: 500,
    careerPath: 560,
    relationshipDynamics: 540,
    wealthPotential: 520,
    healthGuidance: 500,
    lifeMission: 520,
    timingAdvice: 520,
    actionPlan: 480,
    conclusion: 440,
  }
  return mapEn[section]
}

function buildSectionBridgeSentence(
  section: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const map: Record<keyof AIPremiumReport['sections'], string> = {
      introduction: '결론보다 실행 순서를 먼저 고정하면 하루 품질이 안정됩니다.',
      personalityDeep: '자기 리듬을 지키는 작은 기준이 장기 성과를 만듭니다.',
      careerPath: '커리어는 확장보다 완결률을 올릴 때 체감 성과가 빨라집니다.',
      relationshipDynamics: '관계는 감정보다 해석 정렬이 먼저일 때 충돌이 줄어듭니다.',
      wealthPotential: '재정은 수익 확대보다 손실 통제를 먼저 두는 편이 유리합니다.',
      healthGuidance: '건강은 강도보다 회복 리듬을 먼저 고정할 때 유지됩니다.',
      lifeMission: '장기 방향은 반복 가능한 기준을 만들 때 현실 성과로 연결됩니다.',
      timingAdvice: '타이밍은 착수와 확정을 분리할수록 실수 비용이 줄어듭니다.',
      actionPlan: '실행 계획은 단순할수록 실제 이행률이 높아집니다.',
      conclusion: '핵심은 속도보다 일관된 기준을 유지하는 운영 습관입니다.',
    }
    return map[section]
  }

  const mapEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction: 'Lock sequence before speed to stabilize daily output quality.',
    personalityDeep: 'Small personal standards compound into long-term consistency.',
    careerPath: 'Career outcomes improve faster through completion rate than scope inflation.',
    relationshipDynamics:
      'Relationship stability improves when interpretation aligns before conclusions.',
    wealthPotential: 'For money, downside control should come before upside pursuit.',
    healthGuidance: 'Health performance is sustained by recovery rhythm before intensity.',
    lifeMission: 'Long-term mission becomes real when converted into repeatable standards.',
    timingAdvice: 'Timing quality improves when start and commitment are separated.',
    actionPlan: 'Plans work when simple enough to execute under real constraints.',
    conclusion: 'Consistency of standards outperforms short bursts of speed.',
  }
  return mapEn[section]
}

function uniqueLines(lines: Array<string | undefined | null>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of lines) {
    const value = String(raw || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function expandToMinChars(
  base: string,
  minChars: number,
  fillers: string[],
  section: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  let out = base.replace(/\s{2,}/g, ' ').trim()
  const cleanFillers = [...new Set(fillers.map((f) => f.trim()).filter(Boolean))]
  if (cleanFillers.length === 0) return out
  for (const filler of cleanFillers) {
    if (out.length >= minChars) break
    if (out.includes(filler)) continue
    out = `${out} ${filler}`.replace(/\s{2,}/g, ' ').trim()
  }
  if (out.length < minChars) {
    const bridge = buildSectionBridgeSentence(section, lang)
    if (!out.includes(bridge)) {
      out = `${out} ${bridge}`.replace(/\s{2,}/g, ' ').trim()
    }
  }
  return out
}

function inferAgeFromInput(input: MatrixCalculationInput): number | null {
  const birthDate = input.profileContext?.birthDate
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const base = input.currentDateIso ? new Date(input.currentDateIso) : new Date()
  if (Number.isNaN(base.getTime())) return null
  let age = base.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = base.getUTCMonth() - birth.getUTCMonth()
  const dayDiff = base.getUTCDate() - birth.getUTCDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1
  return Math.max(0, age)
}

function clipSentence(value: string, max = 58): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function buildLifeJourneyNarrative(
  input: NarrativeInput,
  section: keyof AIPremiumReport['sections']
): string {
  if (!['introduction', 'lifeMission', 'conclusion'].includes(section)) return ''
  const topDomainSignals = (domain: SignalDomain, limit = 2): string[] => {
    const rows = (input.synthesis.normalizedSignals || [])
      .filter((signal) => (signal.domainHints || []).includes(domain))
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit)
      .map((signal) => signal.keyword || signal.rowKey)
      .filter(Boolean)
    return [...new Set(rows)]
  }
  const personality = topDomainSignals('personality').join('·')
  const career = topDomainSignals('career').join('·')
  const wealth = topDomainSignals('wealth').join('·')
  const relation = topDomainSignals('relationship').join('·')
  const age = inferAgeFromInput(input.matrixInput)
  const daeun = input.matrixInput.currentDaeunElement || '미확인'
  const saeun = input.matrixInput.currentSaeunElement || '미확인'
  const wolun = input.matrixInput.currentWolunElement || '미확인'
  const iljin = input.matrixInput.currentIljinElement || '미확인'
  const iljinDate = input.matrixInput.currentIljinDate || '미확인'

  if (input.lang === 'ko') {
    const ageLine =
      age === null
        ? '현재 나이 정보가 없어 일반 생애 구간 기준으로 정리합니다.'
        : `현재 나이 ${age}세 기준으로 생애 구간을 재배치해 해석합니다.`
    const early = personality
      ? `초년기(0~19세): ${personality} 키워드가 성향의 기본 프레임을 만들고, 자기 기준을 세우는 방식이 이후 선택 습관을 결정합니다.`
      : '초년기(0~19세): 성향의 뿌리를 만드는 시기라 리듬과 기준을 먼저 배우는 것이 중요합니다.'
    const young = career
      ? `청년기(20~34세): ${career} 신호가 커리어 축을 밀어 올리며, 빠른 착수보다 완결률 중심 운영이 성과 격차를 만듭니다.`
      : '청년기(20~34세): 진입과 전환이 빠른 시기라 완결률 중심의 선택이 성과를 좌우합니다.'
    const mid =
      wealth || relation
        ? `장년기(35~49세): ${wealth || relation} 축이 돈·관계·책임의 구조를 재정렬하므로, 수익 확대와 리스크 통제를 동시에 설계해야 안정적으로 성장합니다.`
        : '장년기(35~49세): 돈과 관계의 구조를 다시 짜는 구간이라 분배·협업 규칙이 중요합니다.'
    const later = `후반기(50세+): 축적된 기준을 영향력으로 바꾸는 시기이며, 대운(${daeun})·세운(${saeun})·월운(${wolun})·일진(${iljin}/${iljinDate}) 흐름에 맞춘 선택 분할이 변동성을 줄이고 누적 신뢰를 키웁니다.`

    if (section === 'conclusion') {
      return `${ageLine} 생애 전체의 결론은 동일합니다. 초년의 성향 프레임, 청년의 확장 실험, 장년의 구조화, 후반의 영향력 전환을 하나의 운영 원칙으로 연결할 때 인생총운이 가장 안정적으로 올라갑니다.`
    }
    return `${ageLine} ${early} ${young} ${mid} ${later}`
  }

  const ageLineEn =
    age === null
      ? 'Age context is missing, so this follows standard life-stage framing.'
      : `Age ${age} context is applied for life-stage framing.`
  const earlyEn = personality
    ? `Early stage (0-19): ${personality} builds the personality baseline and decision habit.`
    : 'Early stage (0-19): baseline rhythm and standards are built first.'
  const youngEn = career
    ? `Young stage (20-34): ${career} drives career expansion, while completion-rate discipline separates outcomes.`
    : 'Young stage (20-34): completion-rate decisions matter more than expansion speed.'
  const midEn =
    wealth || relation
      ? `Mid stage (35-49): ${wealth || relation} restructures money, relationships, and responsibility together.`
      : 'Mid stage (35-49): money/relationship structure redesign becomes central.'
  const laterEn = `Later stage (50+): accumulated standards convert into leverage, and staged decisions aligned to Daeun(${daeun})/Seun(${saeun})/Wolun(${wolun})/Iljin(${iljin}@${iljinDate}) reduce volatility.`
  if (section === 'conclusion') {
    return `${ageLineEn} The life-course conclusion is consistent: connect early identity framing, young-stage expansion, mid-stage structural redesign, and later-stage leverage into one operating rule.`
  }
  return `${ageLineEn} ${earlyEn} ${youngEn} ${midEn} ${laterEn}`
}

function signalLabel(signal: NormalizedSignal, lang: 'ko' | 'en'): string {
  if (lang === 'ko') return signal.keyword || signal.rowKey || '핵심 신호'
  return signal.keyword || signal.rowKey || 'core signal'
}

function buildSectionDeepDiveSentence(
  section: keyof AIPremiumReport['sections'],
  signals: NormalizedSignal[],
  lang: 'ko' | 'en'
): string {
  const strengths = signals.filter((signal) => signal.polarity === 'strength').slice(0, 2)
  const cautions = signals.filter((signal) => signal.polarity === 'caution').slice(0, 2)
  const balances = signals.filter((signal) => signal.polarity === 'balance').slice(0, 1)

  const sText = strengths.map((signal) => signalLabel(signal, lang)).join(', ')
  const cText = cautions.map((signal) => signalLabel(signal, lang)).join(', ')
  const bText = balances.map((signal) => signalLabel(signal, lang)).join(', ')

  if (lang === 'ko') {
    const domainName: Record<keyof AIPremiumReport['sections'], string> = {
      introduction: '전체 흐름',
      personalityDeep: '성향',
      careerPath: '커리어',
      relationshipDynamics: '관계',
      wealthPotential: '재정',
      healthGuidance: '건강',
      lifeMission: '장기 방향',
      timingAdvice: '타이밍',
      actionPlan: '실행 계획',
      conclusion: '최종 운영',
    }
    const title = domainName[section]
    const strengthLine = sText
      ? `${title}에서는 ${sText} 신호가 추진력을 담당하고,`
      : `${title}에서는 뚜렷한 추진 신호보다 운영 규칙의 일관성이 더 중요하고,`
    const cautionLine = cText
      ? `${cText} 신호가 비용이 커지는 지점을 알려 줍니다.`
      : '리스크는 주로 확인 절차 누락에서 발생하기 쉽습니다.'
    const balanceLine = bText
      ? `${bText} 신호가 완충 역할을 하므로, 속도와 검증의 균형을 맞추면 체감 결과가 빠르게 안정됩니다.`
      : '완충 신호가 작더라도 착수와 확정을 분리하면 변동 폭을 줄일 수 있습니다.'
    return `${strengthLine} ${cautionLine} ${balanceLine}`
  }

  const strengthLine = sText
    ? `${sText} drive momentum,`
    : 'Momentum is less about aggressive expansion,'
  const cautionLine = cText
    ? `while ${cText} mark cost-amplification points.`
    : 'while verification gaps remain the main risk source.'
  const balanceLine = bText
    ? `${bText} provide damping, so balancing speed with verification stabilizes outcomes.`
    : 'Even with weak damping signals, separating start from commitment reduces volatility.'
  return `${strengthLine} ${cautionLine} ${balanceLine}`
}

function buildSectionProtocolSentence(
  section: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const lines: Record<keyof AIPremiumReport['sections'], string> = {
      introduction:
        '실무 프로토콜은 단순해야 작동합니다. 오늘 바로 끝낼 핵심 1건을 먼저 정하고, 외부 확정이 필요한 일은 반드시 검토 슬롯을 거쳐 내보내세요.',
      personalityDeep:
        '의사결정 프로토콜은 기록 선행입니다. 중요한 대화 뒤에는 상대와 합의한 핵심 조건을 한 줄로 남기고, 다음 결정에서 그대로 재사용하세요.',
      careerPath:
        '커리어 프로토콜은 완결률 중심입니다. 신규 착수는 제한하고, 진행 중 과제의 완료 기준을 명시한 뒤 닫아야 다음 기회의 협상력이 올라갑니다.',
      relationshipDynamics:
        '관계 프로토콜은 해석 일치입니다. 결론을 제시하기 전에 상대가 이해한 내용과 본인이 의도한 내용을 한 번 맞추면 충돌 비용이 급격히 줄어듭니다.',
      wealthPotential:
        '재정 프로토콜은 조건 분리 검토입니다. 금액, 기한, 취소 조항을 분리해 점검하고 당일 확정을 줄이면 손실 회피율이 높아집니다.',
      healthGuidance:
        '건강 프로토콜은 회복 선배치입니다. 업무량을 늘리기 전에 수면과 회복 시간을 먼저 고정하면 체력 편차가 줄고 집중 지속 시간이 늘어납니다.',
      lifeMission:
        '장기 프로토콜은 주간 복기입니다. 한 주의 선택을 짧게 기록하고 원인-결과를 연결해 보면, 다음 선택의 정밀도가 확실히 높아집니다.',
      timingAdvice:
        '타이밍 프로토콜은 단계 분리입니다. 착수, 검토, 확정을 같은 날에 몰지 말고 분리하면 작은 오차가 큰 손실로 번지는 것을 막을 수 있습니다.',
      actionPlan:
        '2주 실행 프로토콜은 완료 1건, 검토 1건, 보류 1건의 반복입니다. 이 구조를 유지하면 실행 피로를 줄이면서도 누적 성과를 안정적으로 올릴 수 있습니다.',
      conclusion:
        '마지막 프로토콜은 동일합니다. 빠른 결론보다 검증된 결론을 선택하고, 같은 운영 규칙을 반복해 결과의 재현성을 높이세요.',
    }
    return lines[section]
  }

  const linesEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction:
      'Keep the protocol simple: lock one must-finish item first, then route externally committing items through a review slot.',
    personalityDeep:
      'Use a record-first protocol: after key conversations, store one-line agreement terms and reuse them in the next decision.',
    careerPath:
      'Use completion-first protocol: limit new intake, define done-criteria, then close in-flight work before expansion.',
    relationshipDynamics:
      'Use alignment-first protocol: synchronize interpretation before conclusions to cut conflict costs.',
    wealthPotential:
      'Use term-split protocol: validate amount, deadline, and cancellation separately before commitment.',
    healthGuidance:
      'Use recovery-first protocol: lock sleep and recovery blocks before scaling workload.',
    lifeMission:
      'Use weekly review protocol: map choice-cause-result to improve precision of next steps.',
    timingAdvice:
      'Use stage-separation protocol: avoid collapsing start, review, and commitment into one window.',
    actionPlan:
      'Use a two-week loop of one completion, one review, and one defer item to keep execution sustainable.',
    conclusion:
      'Final protocol is unchanged: verified commitments outperform fast commitments over time.',
  }
  return linesEn[section]
}

function formatActionSentence(claims: SynthesizedClaim[], lang: 'ko' | 'en'): string {
  const controls = claims
    .map((claim) => claim.riskControl)
    .filter(Boolean)
    .slice(0, 3)
  const actions = claims
    .flatMap((claim) => claim.actions || [])
    .filter(Boolean)
    .slice(0, 3)
  const plan = [...new Set([...controls, ...actions])].slice(0, 3).join(' ')

  if (lang === 'ko') {
    return plan || '결정과 실행 시점을 분리하고 외부 확정 전에 재확인 단계를 고정하세요.'
  }
  return plan || 'Split decision and execution timing, then lock a recheck step before commitment.'
}

function formatTimingGrounding(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const daeun = input.currentDaeunElement
  const saeun = input.currentSaeunElement
  const wolun = input.currentWolunElement
  const iljin = input.currentIljinElement
  const iljinDate = input.currentIljinDate
  if (lang === 'ko') {
    if (daeun || saeun || wolun || iljin || iljinDate) {
      return `현재 대운 ${daeun || '미확인'}, 세운 ${saeun || '미확인'}, 월운 ${wolun || '미확인'}, 일진 ${iljin || '미확인'}${iljinDate ? `(${iljinDate})` : ''} 기준으로, 결론과 실행 시점을 분리해 운영하는 방식이 안정적입니다.`
    }
    return '대운·세운·월운·일진 정보가 제한적이므로 당일 확정보다 24시간 재확인 창을 두는 보수 운영이 유리합니다.'
  }
  if (daeun || saeun || wolun || iljin || iljinDate) {
    return `With Daeun ${daeun || 'unknown'}, Seun ${saeun || 'unknown'}, Wolun ${wolun || 'unknown'}, and Iljin ${iljin || 'unknown'}${iljinDate ? ` (${iljinDate})` : ''}, separate decision timing from execution timing.`
  }
  return 'With limited Daeun/Seun/Wolun/Iljin coverage, use a conservative 24-hour recheck before commitment.'
}

function sectionLeadSentence(
  section: keyof AIPremiumReport['sections'],
  leadClaim: SynthesizedClaim,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const dedupedThesis = leadClaim.thesis.replace(
      /^(성향|커리어|관계|재정|건강|장기 방향|타이밍|실행 설계|최종 요약|관계 영역|커리어 영역|재정 영역|현재 구간의 핵심)\s*(에서는|은|는)\s*/u,
      ''
    )
    return `${SECTION_LEAD_KO[section]} ${dedupedThesis}`.trim()
  }
  return `${fallbackTitle(section, lang)}: ${leadClaim.thesis}`
}

function sectionSupportSentence(
  leadClaim: SynthesizedClaim,
  section: keyof AIPremiumReport['sections'],
  supportClaim: SynthesizedClaim | undefined,
  lang: 'ko' | 'en'
): string {
  if (!supportClaim || supportClaim.thesis === leadClaim.thesis) return ''
  if (lang === 'ko') {
    return `${SECTION_SUPPORT_PREFIX_KO[section]} ${supportClaim.thesis}`
  }
  return `Secondary track: ${supportClaim.thesis}`
}

function renderSection(
  section: keyof AIPremiumReport['sections'],
  input: NarrativeInput,
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): string {
  const orderedClaims = sortClaimsForSection(input.synthesis.claims, section)
  const domains = SECTION_DOMAINS[section]
  const leadClaim = pickLeadClaim(orderedClaims, usedClaimIds, usedTheses)
  const supportClaim = leadClaim
    ? pickSupportClaim(leadClaim, orderedClaims, domains, usedClaimIds, usedTheses)
    : undefined
  const title = fallbackTitle(section, input.lang)
  const lifeJourneyLine = buildLifeJourneyNarrative(input, section)

  const minChars = getSectionMinChars(section, input.lang)
  const sectionPad =
    input.lang === 'ko' ? SECTION_MIN_FILL_KO[section] : SECTION_MIN_FILL_EN[section]

  if (!leadClaim) {
    const lowSignal = buildLowSignalFallbackSection(section, title, input.matrixInput, input.lang)
    if (lowSignal.length >= minChars) return lowSignal
    return expandToMinChars(
      lowSignal,
      minChars,
      uniqueLines([
        lifeJourneyLine,
        sectionPad,
        buildSectionExecutionSentence(section, input.lang),
        buildSectionProtocolSentence(section, input.lang),
      ]),
      section,
      input.lang
    )
  }

  usedClaimIds.add(leadClaim.claimId)
  usedTheses.add(normalizeTextKey(leadClaim.thesis))
  if (supportClaim) {
    usedClaimIds.add(supportClaim.claimId)
    usedTheses.add(normalizeTextKey(supportClaim.thesis))
  }

  const thesisLine = sectionLeadSentence(section, leadClaim, input.lang)
  const supportLine = sectionSupportSentence(leadClaim, section, supportClaim, input.lang)
  const evidenceLine = formatEvidenceSentence(
    input.synthesis,
    [leadClaim, ...(supportClaim ? [supportClaim] : [])],
    input.lang
  )
  const claimSignals = gatherClaimSignals(input.synthesis, [
    leadClaim,
    ...(supportClaim ? [supportClaim] : []),
  ])
  const insightLine = buildSectionInsightSentence(section, claimSignals, input.lang)
  const deepDiveLine = buildSectionDeepDiveSentence(section, claimSignals, input.lang)
  const actionLine = formatActionSentence(
    [leadClaim, ...(supportClaim ? [supportClaim] : [])],
    input.lang
  )
  const protocolLine = buildSectionProtocolSentence(section, input.lang)
  const executionLine = buildSectionExecutionSentence(section, input.lang)
  const timingLine =
    section === 'timingAdvice' ? formatTimingGrounding(input.matrixInput, input.lang) : ''

  const bySectionOrder: Record<keyof AIPremiumReport['sections'], string[]> = {
    introduction: uniqueLines([
      thesisLine,
      evidenceLine,
      insightLine,
      lifeJourneyLine,
      actionLine,
      executionLine,
    ]),
    personalityDeep: uniqueLines([
      thesisLine,
      supportLine,
      evidenceLine,
      deepDiveLine,
      actionLine,
      executionLine,
    ]),
    careerPath: uniqueLines([
      thesisLine,
      supportLine,
      evidenceLine,
      insightLine,
      deepDiveLine,
      actionLine,
      protocolLine,
    ]),
    relationshipDynamics: uniqueLines([
      thesisLine,
      supportLine,
      evidenceLine,
      deepDiveLine,
      actionLine,
      protocolLine,
    ]),
    wealthPotential: uniqueLines([
      thesisLine,
      evidenceLine,
      insightLine,
      deepDiveLine,
      actionLine,
      protocolLine,
    ]),
    healthGuidance: uniqueLines([
      thesisLine,
      evidenceLine,
      deepDiveLine,
      actionLine,
      executionLine,
    ]),
    lifeMission: uniqueLines([thesisLine, evidenceLine, lifeJourneyLine, deepDiveLine, actionLine]),
    timingAdvice: uniqueLines([
      thesisLine,
      evidenceLine,
      timingLine,
      insightLine,
      actionLine,
      protocolLine,
    ]),
    actionPlan: uniqueLines([thesisLine, evidenceLine, actionLine, protocolLine, executionLine]),
    conclusion: uniqueLines([thesisLine, evidenceLine, lifeJourneyLine, actionLine, executionLine]),
  }

  const merged = bySectionOrder[section]
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (merged.length >= minChars) return merged

  return expandToMinChars(
    merged,
    minChars,
    uniqueLines([sectionPad, deepDiveLine, lifeJourneyLine, protocolLine, executionLine]),
    section,
    input.lang
  )
}
export function generateNarrativeSectionsFromSynthesis(
  input: NarrativeInput
): AIPremiumReport['sections'] {
  const usedClaimIds = new Set<string>()
  const usedTheses = new Set<string>()

  return {
    introduction: renderSection('introduction', input, usedClaimIds, usedTheses),
    personalityDeep: renderSection('personalityDeep', input, usedClaimIds, usedTheses),
    careerPath: renderSection('careerPath', input, usedClaimIds, usedTheses),
    relationshipDynamics: renderSection('relationshipDynamics', input, usedClaimIds, usedTheses),
    wealthPotential: renderSection('wealthPotential', input, usedClaimIds, usedTheses),
    healthGuidance: renderSection('healthGuidance', input, usedClaimIds, usedTheses),
    lifeMission: renderSection('lifeMission', input, usedClaimIds, usedTheses),
    timingAdvice: renderSection('timingAdvice', input, usedClaimIds, usedTheses),
    actionPlan: renderSection('actionPlan', input, usedClaimIds, usedTheses),
    conclusion: renderSection('conclusion', input, usedClaimIds, usedTheses),
  }
}
