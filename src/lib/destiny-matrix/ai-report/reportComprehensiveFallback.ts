import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '../types'
import type { DeterministicCoreOutput, DeterministicSectionBlock } from './deterministicCore'
import type { ReportCoreViewModel } from './reportCoreHelpers'
import type { AIPremiumReport } from './reportTypes'

type Lang = 'ko' | 'en'
type ComprehensiveSectionKey = keyof AIPremiumReport['sections']
type InsightCategory = 'strength' | 'opportunity' | 'balance' | 'caution' | 'challenge'

export interface ComprehensiveFallbackDeps {
  ensureLongSectionNarrative: (base: string, minChars: number, extras: string[]) => string
  summarizeTopInsightsByCategory: (
    matrixReport: FusionReport,
    categories: InsightCategory[],
    lang: Lang,
    limit?: number
  ) => string
  renderIntroductionSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderPersonalityDeepSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderCareerPathSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderRelationshipDynamicsSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderWealthPotentialSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderHealthGuidanceSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderLifeMissionSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderTimingAdviceSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang,
    matrixSummary?: MatrixSummary
  ) => string
  renderActionPlanSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderConclusionSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
}

function normalizeDeterministicLine(line: string): string {
  return String(line || '')
    .replace(/^#{1,6}\s*/g, '')
    .replace(/^[•\-*]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function collectNarrativeSupplementsFromBlocks(
  blocks: DeterministicSectionBlock[] | undefined,
  lang: Lang
): string[] {
  if (!blocks || blocks.length === 0) return []
  const noisyFragmentRegex =
    /(snapshot_|astrologysnapshot|sajusnapshot|crosssnapshot|스냅샷|=object\(|array\(|COV:|I\d+:|L\d+:|EVT_|matrix_|graphrag|crossEvidenceSets|insight_\d+|근거\s*id|claimid|signalid|anchorid|레이어:|코어\s*신호|보조\s*증거)/i
  const genericHeadingRegex =
    /^(introduction|personalitydeep|careerpath|relationshipdynamics|wealthpotential|healthguidance|lifemission|timingadvice|actionplan|conclusion)$/i
  const chunks: string[] = []
  for (const block of blocks) {
    const heading = normalizeDeterministicLine(String(block.heading || ''))
    const safeHeading =
      heading && !genericHeadingRegex.test(heading) && !noisyFragmentRegex.test(heading)
        ? heading
        : ''
    const lines = (block.bullets || [])
      .map((line) => normalizeDeterministicLine(String(line || '')))
      .filter((line) => line.length >= 14)
      .filter((line) => !noisyFragmentRegex.test(line))
      .slice(0, 3)
    if (lines.length === 0) continue
    const composed = lines
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!composed) continue
    if (safeHeading) {
      chunks.push(lang === 'ko' ? `${safeHeading}: ${composed}` : `${safeHeading}: ${composed}`)
      continue
    }
    chunks.push(composed)
  }
  return [...new Set(chunks)]
}

export function buildNarrativeSupplementsBySection(
  sectionKeys: ComprehensiveSectionKey[],
  blocksBySection: Record<string, DeterministicSectionBlock[]> | undefined,
  lang: Lang
): Record<string, string[]> {
  if (!blocksBySection) return {}
  const sectionSpecificNoise: Partial<Record<ComprehensiveSectionKey, RegExp>> = {
    personalityDeep: /(0-19세|20-34세|35-49세|50-64세|65\+|생애 흐름|변곡점 Top7)/,
    careerPath: /(0-19세|20-34세|35-49세|50-64세|65\+|생애 흐름|변곡점 Top7)/,
    wealthPotential: /(0-19세|20-34세|35-49세|50-64세|65\+|생애 흐름|변곡점 Top7)/,
    healthGuidance: /(0-19세|20-34세|35-49세|50-64세|65\+|생애 흐름|변곡점 Top7)/,
    relationshipDynamics: /(적합도\s*\d+|직군\/산업|수입 밴드)/,
    lifeMission: /(0-19세|20-34세|35-49세|50-64세|65-84세|65\+|생애 흐름|변곡점 Top7)/,
    timingAdvice:
      /(0-19세|20-34세|35-49세|50-64세|65-84세|65\+|생애 흐름|변곡점 Top7|직군\/산업|배우자 아키타입|알아볼 단서|인생 챕터 흐름|실행 타이밍 전략|\d{4}-\d{2}\s*\(\d+%\)|교차 근거는 월간 실행)/,
  }
  return sectionKeys.reduce<Record<string, string[]>>((acc, key) => {
    const sectionNoise = sectionSpecificNoise[key]
    const supplements = collectNarrativeSupplementsFromBlocks(blocksBySection[key], lang).filter(
      (item) => !sectionNoise || !sectionNoise.test(item)
    )
    if (supplements.length > 0) acc[key] = supplements
    return acc
  }, {})
}

export function mergeComprehensiveDraftWithBlocks(
  sectionKeys: ComprehensiveSectionKey[],
  fallback: AIPremiumReport['sections'],
  blocksBySection: Record<string, DeterministicSectionBlock[]> | undefined,
  lang: Lang,
  deps: Pick<ComprehensiveFallbackDeps, 'ensureLongSectionNarrative'>
): AIPremiumReport['sections'] {
  const merged: AIPremiumReport['sections'] = { ...fallback }
  if (!blocksBySection) return merged
  const minCharsPerSection = lang === 'ko' ? 720 : 950
  for (const key of sectionKeys) {
    const supplements = collectNarrativeSupplementsFromBlocks(blocksBySection[key], lang)
    if (supplements.length === 0) continue
    merged[key] = deps.ensureLongSectionNarrative(fallback[key], minCharsPerSection, supplements)
  }
  return merged
}

export function buildComprehensiveFallbackSections(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  deterministicCore: DeterministicCoreOutput,
  lang: Lang,
  deps: ComprehensiveFallbackDeps,
  reportCore?: ReportCoreViewModel,
  options: {
    matrixSummary?: MatrixSummary
  } = {}
): AIPremiumReport['sections'] {
  if (reportCore) {
    return {
      introduction: deps.renderIntroductionSection(reportCore, input, lang),
      personalityDeep: deps.renderPersonalityDeepSection(reportCore, input, lang),
      careerPath: deps.renderCareerPathSection(reportCore, input, lang),
      relationshipDynamics: deps.renderRelationshipDynamicsSection(reportCore, input, lang),
      wealthPotential: deps.renderWealthPotentialSection(reportCore, input, lang),
      healthGuidance: deps.renderHealthGuidanceSection(reportCore, input, lang),
      lifeMission: deps.renderLifeMissionSection(reportCore, input, lang),
      timingAdvice: deps.renderTimingAdviceSection(reportCore, input, lang, options.matrixSummary),
      actionPlan: deps.renderActionPlanSection(reportCore, input, lang),
      conclusion: deps.renderConclusionSection(reportCore, input, lang),
    }
  }

  const strengths = deps.summarizeTopInsightsByCategory(
    matrixReport,
    ['strength', 'opportunity'],
    lang,
    3
  )
  const cautions = deps.summarizeTopInsightsByCategory(
    matrixReport,
    ['caution', 'challenge'],
    lang,
    3
  )
  const strengthsLabel =
    lang === 'ko' && strengths === '성과 확장·완결률 강화' ? '성과 확장·완결률 강화' : strengths
  const cautionsLabel =
    lang === 'ko' && cautions === '성과 확장·완결률 강화'
      ? '조건 확인·커뮤니케이션 재검토'
      : cautions
  const topDomains = [...(matrixReport.domainAnalysis || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((d) => `${d.domain}(${d.score})`)
    .join(', ')
  const profileCtx = input.profileContext || {}
  const profileLine = [profileCtx.birthDate, profileCtx.birthTime, profileCtx.birthCity]
    .filter(Boolean)
    .join(' / ')
  const geokgukLine = input.geokguk
    ? lang === 'ko'
      ? `격국은 ${input.geokguk}으로 해석되며`
      : `The frame is interpreted as ${input.geokguk},`
    : ''
  const yongsinLine = input.yongsin
    ? lang === 'ko'
      ? `용신은 ${input.yongsin} 축에 가깝습니다.`
      : `and the useful element aligns with ${input.yongsin}.`
    : ''

  if (lang === 'ko') {
    const koSections: AIPremiumReport['sections'] = {
      introduction: `오늘 흐름은 “좋은 카드가 손에 들어왔지만, 내는 순서를 잘 잡아야 이기는 판”에 가깝습니다. 사주 일간 ${input.dayMasterElement} 기운과 점성 핵심 신호를 겹쳐 보면, 밀어도 되는 축은 ${strengthsLabel}, 브레이크를 걸어야 하는 축은 ${cautionsLabel}로 정리됩니다. 한 줄 결론은 단순합니다. 속도로 이기려 하지 말고, 정확한 순서로 이기는 날입니다.`,
      personalityDeep: `당신의 기본 엔진은 빠른 판단력과 구조화 능력입니다. 그래서 시작은 누구보다 빠른데, 가끔은 확인 단계가 짧아져서 “좋은 선택을 아쉽게 마무리”하는 순간이 생깁니다. 오늘은 감으로 먼저 뛰기보다, 결론 1줄과 근거 1줄을 먼저 적고 움직이면 실수 비용이 크게 줄어듭니다.`,
      careerPath: `커리어 상위 지표는 ${topDomains || 'career(평가 중)'}이고, 지금은 “넓게 벌리기”보다 “깊게 닫기”가 이득인 타이밍입니다. 회의가 길어지는 날일수록 새 일 3개보다 완료 1개가 커리어 체급을 올립니다. 특히 협업 건은 역할·마감·책임을 먼저 고정할수록, 다음 기회에서 당신의 협상력이 선명하게 올라갑니다.`,
      relationshipDynamics: `관계에서는 말의 양보다 해석의 정확도가 승부를 냅니다. 같은 문장도 타이밍이 어긋나면 압박으로 들릴 수 있으니, 결론을 던지기 전에 “내가 이해한 게 맞는지” 한 줄로 맞춰보세요. 가까운 관계일수록 이 작은 확인이 감정 소모를 줄이고 신뢰를 빠르게 회복시킵니다.`,
      wealthPotential: `돈 흐름은 기회와 경계가 동시에 켜져 있습니다. 즉, 벌 수 있는 문은 열려 있지만, 조건을 대충 보면 새는 구멍도 함께 커지는 국면입니다. 지출·계약·투자 모두 금액, 기한, 취소 조건만 따로 떼어 확인해도 손실 확률이 눈에 띄게 내려갑니다.`,
      healthGuidance: `에너지는 단거리 스퍼트에 강한 편이라, 몰입 후 회복이 늦어질 때 컨디션 낙폭이 커질 수 있습니다. 오늘은 강한 루틴 하나보다 “짧은 회복 루틴 3번”이 더 효율적입니다. 수면, 수분, 호흡처럼 작지만 반복 가능한 기준을 지키면 집중력의 바닥이 올라갑니다.`,
      lifeMission: `장기적으로 당신의 힘은 한 번의 대박보다 “신뢰가 쌓이는 반복”에서 나옵니다. 기준을 설명할 수 있는 사람은 결국 큰 선택도 맡게 됩니다. 오늘의 작은 일관성이 1년 뒤의 큰 기회로 연결된다는 관점으로 움직이면 방향이 흔들리지 않습니다.`,
      timingAdvice: `결정 코어는 ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict}(${deterministicCore.decision.score}점)` : '일반 모드'}입니다. 강점 신호(${strengthsLabel})가 뜨는 구간은 실행 속도를 높이고, 주의 신호(${cautionsLabel})가 걸린 구간은 확정 전 이중 확인을 넣으세요. 특히 문서·합의·대외 전달은 “초안-검토-확정” 3단계로 쪼개면 결과가 훨씬 안정됩니다.`,
      actionPlan: `오늘 플랜은 세 줄이면 충분합니다. 1) 먼저 닫을 결과물 1개, 2) 외부 전달 전 재확인 1개, 3) 오늘 확정하지 않을 보류 1개. 이 구조만 지켜도 하루가 끝났을 때 “많이 한 느낌”이 아니라 “남는 결과”가 생깁니다.`,
      conclusion: `이번 흐름의 승부 포인트는 재능이 아니라 운영입니다. 밀어야 할 때는 밀고, 확인해야 할 때는 멈추는 리듬만 지켜도 체감 성과가 달라집니다. 같은 패턴을 2주 정도 유지하면 운의 변동이 줄고 결과의 재현성이 올라갑니다.`,
    }

    const extraBySection: Record<ComprehensiveSectionKey, string[]> = {
      introduction: [
        profileLine
          ? `기준 프로필은 ${profileLine}이며, 같은 입력에서는 같은 핵심 클레임과 같은 전략 국면이 유지됩니다.`
          : '기준 프로필 입력이 완전할수록 섹션별 근거 밀도와 실행 정확도가 함께 올라갑니다.',
        [geokgukLine, yongsinLine].filter(Boolean).join(' '),
        '실전에서는 “무엇을 더 할지”보다 “무엇을 오늘 안 할지”를 먼저 정하면 집중력이 살아납니다.',
        '오전에는 생산, 오후에는 검토처럼 역할을 분리하면 체감 피로 대비 성과가 좋아집니다.',
        '작은 실수 하나가 일정 전체를 흔들 수 있는 날이므로, 체크리스트 한 장이 생각보다 큰 차이를 만듭니다.',
      ],
      personalityDeep: [
        '스스로의 리듬을 관리하는 가장 쉬운 방법은 하루 종료 전에 결정 로그를 3줄 남기는 것입니다.',
        '이 패턴이 쌓이면 감정이 요동치는 날에도 선택의 품질이 무너지지 않습니다.',
        '당신의 강점은 빠른 출발보다, 빠른 출발 뒤에도 방향을 바로잡는 복원력에 있습니다.',
      ],
      careerPath: [
        '특히 일정이 복잡한 주에는 “새 착수 1개, 기존 마감 2개”처럼 닫힘 비율을 높이는 운영이 유리합니다.',
        '상대가 많은 프로젝트일수록 책임 경계를 선명하게 그어야 갈등 비용을 줄일 수 있습니다.',
        '성과는 종종 아이디어 수가 아니라 완료된 결과물의 밀도에서 평가된다는 점을 기억하면 좋습니다.',
      ],
      relationshipDynamics: [
        '대화가 길어질수록 핵심은 흐려지기 쉽기 때문에, 중요한 말은 짧게 요약해 합의 지점을 먼저 맞추세요.',
        '감정이 높은 순간에 결론을 내리기보다 템포를 늦추는 선택이 오히려 관계를 빠르게 안정시킵니다.',
        '오늘은 “내가 맞다”보다 “우리가 같은 이해를 갖고 있나”를 묻는 쪽이 훨씬 강한 선택입니다.',
      ],
      wealthPotential: [
        '수익 기회가 보일수록 조건 검토를 더 엄격하게 하는 습관이 장기 성과를 지켜줍니다.',
        '같은 금액이라도 기한과 취소 조항이 다르면 리스크가 완전히 달라질 수 있습니다.',
        '이번 사이클은 공격보다 방어를 먼저 두는 설계가 결과적으로 더 큰 여유를 만듭니다.',
      ],
      healthGuidance: [
        '컨디션이 떨어지기 전에 짧은 회복 루틴을 먼저 넣으면 하루 전체의 집중도가 유지됩니다.',
        '강도 높은 하루 뒤에는 회복 시간을 일정에 고정해 누적 피로를 끊어내세요.',
        '건강 관리는 의지의 문제가 아니라 배치의 문제라는 관점이 이번 흐름에서 특히 중요합니다.',
      ],
      lifeMission: [
        '큰 목표를 세우는 것보다 매주 지킬 수 있는 원칙 2~3개를 유지하는 쪽이 실제 변화로 이어집니다.',
        '장기 운은 단기 성과의 합계가 아니라, 흔들릴 때 복귀하는 습관의 품질에서 갈립니다.',
        '결국 당신의 방향성은 화려한 선언보다 반복 가능한 선택 기준으로 증명됩니다.',
      ],
      timingAdvice: [
        '오늘-이번 주-이번 달의 시간축을 분리해서 보면, 급한 일과 중요한 일을 동시에 살릴 수 있습니다.',
        '특히 오늘은 실행은 빠르게, 확정은 한 템포 늦게 두는 전략이 가장 안전합니다.',
        '타이밍 운용의 포인트는 완벽한 예측이 아니라 오류 비용을 줄이는 구조를 먼저 세우는 데 있습니다.',
      ],
      actionPlan: [
        '실행 순서를 단순화하면 판단 피로가 줄어들고 실제 행동 전환률이 올라갑니다.',
        '하루 마지막 10분에 “완료/보류/재확인”만 정리해도 다음 날의 시작 속도가 달라집니다.',
        '중요한 건 계획을 많이 세우는 게 아니라, 계획을 끝까지 지킬 수 있게 설계하는 것입니다.',
      ],
      conclusion: [
        '이번 국면은 재능보다 루틴이 승패를 가르는 시기입니다.',
        '작은 기준을 반복해 운용하면 결과가 안정되고, 안정된 결과가 다시 자신감을 만듭니다.',
        '그래서 지금 필요한 건 새로운 비법이 아니라, 이미 잡은 원칙을 끝까지 밀어붙이는 힘입니다.',
      ],
    }

    const base = koSections
    return {
      introduction: deps.ensureLongSectionNarrative(base.introduction, 720, [
        ...extraBySection.introduction,
      ]),
      personalityDeep: deps.ensureLongSectionNarrative(base.personalityDeep, 520, [
        ...extraBySection.personalityDeep,
      ]),
      careerPath: deps.ensureLongSectionNarrative(base.careerPath, 620, [
        ...extraBySection.careerPath,
      ]),
      relationshipDynamics: deps.ensureLongSectionNarrative(base.relationshipDynamics, 520, [
        ...extraBySection.relationshipDynamics,
      ]),
      wealthPotential: deps.ensureLongSectionNarrative(base.wealthPotential, 520, [
        ...extraBySection.wealthPotential,
      ]),
      healthGuidance: deps.ensureLongSectionNarrative(base.healthGuidance, 520, [
        ...extraBySection.healthGuidance,
      ]),
      lifeMission: deps.ensureLongSectionNarrative(base.lifeMission, 520, [
        ...extraBySection.lifeMission,
      ]),
      timingAdvice: deps.ensureLongSectionNarrative(base.timingAdvice, 420, [
        ...extraBySection.timingAdvice,
      ]),
      actionPlan: deps.ensureLongSectionNarrative(base.actionPlan, 420, [
        ...extraBySection.actionPlan,
      ]),
      conclusion: deps.ensureLongSectionNarrative(base.conclusion, 420, [
        ...extraBySection.conclusion,
      ]),
    }
  }

  return {
    introduction: `This report was generated in deterministic safety mode. It prioritizes actionable overlap between your Saju day master ${input.dayMasterElement} and core astrology signals. Strength signals are summarized as ${strengths}, while caution signals are summarized as ${cautions}.`,
    personalityDeep: `Your baseline pattern combines fast decision rhythm with analytical framing. The upside is decisive execution; the downside is premature commitment without verification. Separate decision timing from commitment timing to keep quality high under pressure.`,
    careerPath: `Top domain indicators are ${topDomains || 'career(under review)'}. Your best pattern is narrow-and-finish execution: complete one or two core deliverables before expansion. In collaboration, lock scope and deadline first to reduce variance.`,
    relationshipDynamics: `In relationships, alignment quality matters more than intensity. Keep statements concise and add one confirmation question to reduce interpretation drift. In close ties, context-first dialogue is safer than fast conclusions.`,
    wealthPotential: `Financially, opportunity and caution signals coexist, so avoid commitment based on upside alone. Prioritize spend control, cashflow visibility, and term verification. For large decisions, a 24-hour recheck window is usually protective.`,
    healthGuidance: `Your energy pattern tends to run in bursts with delayed recovery. Stabilize sleep, hydration, and routine before scaling workload. On overloaded days, prioritize review tasks with high error cost over raw volume.`,
    lifeMission: `Your long-term leverage comes from compounding trust, not short spikes. Explain your criteria clearly and keep execution logs. Consistent quality beats impulsive wins and narrows outcome volatility.`,
    timingAdvice: `Deterministic decision status is ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict} (${deterministicCore.decision.score})` : 'general mode'}. Use high-signal windows (${strengths}) for execution, and route caution zones (${cautions}) through verification before commitment.`,
    actionPlan: `Use a three-step execution loop today. First, define one must-finish deliverable. Second, verify terms, deadline, and ownership in one line before external communication. Third, commit only what must close today and move the rest into a recheck slot.`,
    conclusion: `This output is an intentionally conservative, consistency-first report. Move fast in strength zones and never skip verification in caution zones. Keeping this pattern for two weeks will materially improve result repeatability.`,
  }
}
